/** @module src/model */

/** Supported root-state containers. */
type ModelData = Record<PropertyKey, unknown> | unknown[] | Map<unknown, unknown>;

/** One observed container plus the parent link used to rebase it without scanning the whole tree. */
type ObservationContext = {
    active: boolean;
    readonly generation: number;
    readonly target: object;
    readonly path: unknown[];
    readonly key: unknown;
    readonly parent: ObservationContext | undefined;
};
type ObservedChildCache = Map<unknown, {proxy: object; context: ObservationContext}>;

interface ApplicationMediator {
    dispatchEvent(event: Event): boolean;
}

/** Property-level mutation details emitted by deeply observable model state. */
interface ModelMutation<T extends ModelData> {
    operation: 'set' | 'delete' | 'clear';
    path: ReadonlyArray<unknown>;
    oldValue: unknown;
    newValue: unknown;
    state: T;
}

/** Map brand checks never change for one object, so cache them instead of re-throwing on every read. */
const mapBrands = new WeakMap<object, boolean>();

/** Raw targets for every Model proxy, shared so one Model never stores another Model's proxy as raw state. */
const proxyTargets = new WeakMap<object, object>();

/** Keys rejected by merges and direct writes to prevent prototype pollution. */
const blockedKeys = new Set<PropertyKey>(['__proto__', 'constructor', 'prototype']);

/** Sentinel for a child that is no longer stored in its observed parent. */
const missingKey = Symbol('missing');

/** Recognize native Map objects, including Maps created in another realm. */
function isMap(value: unknown): value is Map<unknown, unknown> {
    if (!value || typeof value !== 'object') {return false;}
    let brand = mapBrands.get(value);
    if (brand === undefined) {
        try {
            Map.prototype.has.call(value, value);
            brand = true;
        } catch {
            brand = false;
        }
        mapBrands.set(value, brand);
    }
    return brand;
}

/** Accept ordinary objects and objects with a null prototype, including ordinary objects from another realm. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (Object.prototype.toString.call(value) !== '[object Object]') {return false;}
    const prototype = Object.getPrototypeOf(value);
    if (prototype === null || prototype === Object.prototype) {return true;}
    const constructor = Object.prototype.hasOwnProperty.call(prototype, 'constructor')
        ? prototype.constructor
        : undefined;
    return typeof constructor === 'function' &&
        Function.prototype.toString.call(constructor) === Function.prototype.toString.call(Object);
}

/** Return the raw target behind any Model proxy. */
function toRawValue(value: unknown): unknown {
    if (value !== null && typeof value === 'object') {return proxyTargets.get(value) || value;}
    return value;
}

/** Return whether a key would let a write reach prototype machinery. */
function isBlockedKey(property: unknown): boolean {
    return typeof property === 'string' && blockedKeys.has(property);
}

/** Return the enumerable, non-blocked own entries of merge input, with Model proxies unwrapped. */
function mergeEntries(source: object): Array<[PropertyKey, unknown]> {
    const entries: Array<[PropertyKey, unknown]> = [];
    for (const key of Reflect.ownKeys(source)) {
        if (!isBlockedKey(key) && Object.prototype.propertyIsEnumerable.call(source, key)) {
            entries.push([key, toRawValue((source as Record<PropertyKey, unknown>)[key])]);
        }
    }
    return entries;
}

/** Create a shallow merge using enumerable own properties while blocking prototype-pollution keys. */
function extend(
    object1: Record<string, unknown>,
    object2: Record<string, unknown>
): Record<string, unknown> {
    const result = Object.create(Object.getPrototypeOf(object1)) as Record<PropertyKey, unknown>;
    for (const [key, value] of mergeEntries(object1)) {result[key] = value;}
    for (const [key, value] of mergeEntries(object2)) {result[key] = value;}
    return result as Record<string, unknown>;
}

/** Clone an object state exactly without invoking inherited property setters. */
function cloneObjectState(value: object): Record<PropertyKey, unknown> {
    const clone = Object.create(
        Object.getPrototypeOf(value),
        Object.getOwnPropertyDescriptors(value)
    ) as Record<PropertyKey, unknown>;
    if (!Object.isExtensible(value)) {Object.preventExtensions(clone);}
    return clone;
}

/**
 * Describe how update() writes one merged key in place. Merges store data and never run state
 * setters; non-writable data, non-configurable accessors, and new keys on non-extensible state reject.
 */
function mergeDescriptor(target: object, key: PropertyKey, value: unknown): PropertyDescriptor | undefined {
    const current = Reflect.getOwnPropertyDescriptor(target, key);
    if (!current) {
        return Reflect.isExtensible(target) ? {value, writable: true, enumerable: true, configurable: true} : undefined;
    }
    if ('value' in current) {return current.writable ? {value} : undefined;}
    return current.configurable
        ? {value, writable: true, enumerable: Boolean(current.enumerable), configurable: true}
        : undefined;
}

/** Return the raw value of an own data property without invoking accessors. */
function ownDataValue(container: object, key: PropertyKey): unknown {
    const descriptor = Reflect.getOwnPropertyDescriptor(container, key);
    return descriptor && 'value' in descriptor ? toRawValue(descriptor.value) : missingKey;
}

/** Find which key of one raw parent currently stores a child, checking its last known key first. */
function findChildKey(container: object, hint: unknown, child: object): unknown {
    if (isMap(container)) {
        if (container.has(hint) && toRawValue(container.get(hint)) === child) {return hint;}
        for (const [key, value] of container) {
            if (toRawValue(value) === child) {return key;}
        }
        return missingKey;
    }
    if (!isBlockedKey(hint) && ownDataValue(container, hint as PropertyKey) === child) {return hint;}
    for (const key of Reflect.ownKeys(container)) {
        if (!isBlockedKey(key) && ownDataValue(container, key) === child) {return key;}
    }
    return missingKey;
}

/** Mutable object, array, or Map state with synchronous change notifications. */
class Model<T extends ModelData = Record<string, unknown>> extends EventTarget {
    modelData: T;
    validator: ((data: unknown) => boolean) | undefined;
    name: string | false = false;
    mediator: ApplicationMediator | false = false;
    #rootChildCache!: ObservedChildCache;
    #generation = 0;
    #listenerController = new AbortController();

    /**
     * Create one observable state container for a plain object, array, or Map.
     * @param modelData - Initial state; omitted state defaults to an empty object.
     * @param validator - Optional whole-state validator for explicit set/update/push/delete operations.
     */
    constructor(modelData?: T, validator?: (data: unknown) => boolean) {
        super();
        this.validator = validator;
        const initial = modelData === undefined ? {} : toRawValue(modelData);
        if (!this.isSupportedData(initial)) {
            throw new TypeError('Model data must be a plain object, array, or Map.');
        }
        if (!this.accepts(initial)) {
            throw new TypeError('Initial model data failed validation.');
        }
        this.modelData = this.#observeRoot(initial) as T;
    }

    /** Register a native listener owned by this Model lifecycle. */
    override addEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
    ): void {
        const settings = typeof options === 'boolean' ? {capture: options} : options ?? {};
        const signal = settings.signal
            ? AbortSignal.any([settings.signal, this.#listenerController.signal])
            : this.#listenerController.signal;
        super.addEventListener(type, callback, {...settings, signal});
    }

    /** Normalize capture removal so supported Node runtimes match browser EventTarget behavior. */
    override removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions
    ): void {
        const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
        super.removeEventListener(type, callback, {capture});
    }

    /** Start this instance and return it for lifecycle chaining. */
    initialize() {return this;}

    /** Release owned state and listeners so the instance can leave the application lifecycle. */
    destroy() {
        this.clear(true);
        this.#listenerController.abort();
        this.#listenerController = new AbortController();
        return this;
    }

    /** Dispatch local CustomEvents and optional namespaced mediator relays. */
    #dispatchMessages(messages: string[], data: unknown): void {
        for (const message of messages) {
            this.dispatchEvent(new CustomEvent(message, {detail: data}));
            if (this.name && this.mediator) {
                this.mediator.dispatchEvent(new CustomEvent(`model:${this.name}:${message}`, {detail: data}));
            }
        }
    }

    /** Return the raw target behind an observable proxy. */
    private toRaw(value: unknown): unknown {return toRawValue(value);}

    /** Return whether a value is a supported root-state container. */
    private isSupportedData(value: unknown): value is ModelData {
        return Array.isArray(value) || isPlainObject(value) || isMap(value);
    }

    /** Return whether a nested value should participate in deep change tracking. */
    private isObservable(value: unknown): value is ModelData {
        return value !== null && typeof value === 'object' && this.isSupportedData(value);
    }

    /** Return the raw root container. */
    private rawState(): ModelData {return this.toRaw(this.modelData) as ModelData;}

    /** Apply the optional validator to an explicit candidate state. */
    private accepts(candidate: ModelData): boolean {return !this.validator || this.validator(candidate);}

    /** Return whether this same-generation proxy and every observed ancestor still represent current state. */
    private isObservationActive(context: ObservationContext): boolean {
        for (let current: ObservationContext | undefined = context; current; current = current.parent) {
            if (!current.active) {return false;}
        }
        return true;
    }

    /** Invalidate one cached child proxy while allowing retained detached objects to remain usable. */
    private invalidateObservedChild(cache: ObservedChildCache, key: unknown): void {
        const cached = cache.get(key);
        if (!cached) {return;}
        cached.context.active = false;
        cache.delete(key);
    }

    /** Invalidate cached array items whose index changes after a structural mutation. */
    private invalidateObservedArrayFrom(cache: ObservedChildCache, index: number): void {
        for (const [key, cached] of cache) {
            const numericKey = typeof key === 'string' && key !== '' ? Number(key) : Number.NaN;
            if (Number.isInteger(numericKey) && numericKey >= index) {
                cached.context.active = false;
                cache.delete(key);
            }
        }
    }

    /** Invalidate the cached child for one written property, or every truncated index for an array length write. */
    #invalidateWrittenProperty(cache: ObservedChildCache, target: object, property: PropertyKey, oldLength: number): void {
        if (Array.isArray(target) && property === 'length') {
            if (target.length < oldLength) {this.invalidateObservedArrayFrom(cache, target.length);}
            return;
        }
        this.invalidateObservedChild(cache, property);
    }

    /**
     * Rebase a stale container through its observed ancestors only: each level checks the parent's last
     * known key, then that parent's own entries, so work is bounded by depth rather than model size.
     */
    private findCurrentPath(context: ObservationContext): unknown[] | null {
        if (this.isObservationActive(context)) {return context.path;}
        if (context.target === this.rawState()) {return [];}
        // The root context is always active in the current generation, so a stale context has a parent.
        const parent = context.parent!;
        const parentPath = this.findCurrentPath(parent);
        if (!parentPath) {return null;}
        const key = findChildKey(parent.target, context.key, context.target);
        return key === missingKey ? null : [...parentPath, key];
    }

    /** Resolve the live container path, or null when the proxy is detached from the current root. */
    private resolveMutationPath(context: ObservationContext): unknown[] | null {
        if (context.generation !== this.#generation) {return null;}
        return this.findCurrentPath(context);
    }

    /** Dispatch deep-mutation events only while the proxy still maps to current state. */
    private notifyMutation(
        context: ObservationContext,
        operation: ModelMutation<T>['operation'],
        relativePath: unknown[],
        oldValue: unknown,
        newValue: unknown
    ): void {
        const containerPath = this.resolveMutationPath(context);
        if (!containerPath) {return;}
        const state = this.modelData;
        const mutation: ModelMutation<T> = Object.freeze({
            operation,
            path: Object.freeze([...containerPath, ...relativePath]),
            oldValue,
            newValue,
            state
        });
        this.#dispatchMessages(['change'], state);
        this.#dispatchMessages(['mutate'], mutation);
    }

    /** Return the cached proxy for one child, creating it lazily when the child is observable. */
    #observeChild(cache: ObservedChildCache, context: ObservationContext, key: unknown, value: object): unknown {
        const raw = toRawValue(value) as object;
        const cached = cache.get(key);
        if (cached !== undefined && cached.context.target === raw) {return cached.proxy;}
        if (!this.isObservable(raw)) {return value;}
        const child: ObservationContext = {
            active: true,
            generation: context.generation,
            target: raw,
            path: [...context.path, key],
            key,
            parent: context
        };
        const proxy = this.observe(raw, child);
        cache.set(key, {proxy, context: child});
        return proxy;
    }

    /** Observe plain objects and arrays lazily along accessed branches. */
    private observeObject(value: object, context: ObservationContext): object {
        const childCache: ObservedChildCache = new Map();
        if (!context.parent) {this.#rootChildCache = childCache;}
        const isArray = Array.isArray(value);
        const proxy = new Proxy(value, {
            get: (target, property, receiver) => {
                const descriptor = Reflect.getOwnPropertyDescriptor(target, property);
                if (!descriptor && (!isArray || isBlockedKey(property))) {return undefined;}
                const result: unknown = descriptor && 'value' in descriptor
                    ? descriptor.value
                    : Reflect.get(target, property, receiver);
                if (result === null || typeof result !== 'object') {return result;}
                // Proxy invariants require frozen (non-configurable, non-writable) data to be returned as stored.
                if (descriptor && descriptor.configurable === false && descriptor.writable === false) {return result;}
                return this.#observeChild(childCache, context, property, result);
            },
            set: (target, property, nextValue) => {
                if (isBlockedKey(property)) {return false;}
                const rawNextValue = toRawValue(nextValue);
                const hadProperty = Object.prototype.hasOwnProperty.call(target, property);
                const oldValue = hadProperty ? toRawValue(Reflect.get(target, property, target)) : undefined;
                if (hadProperty && Object.is(oldValue, rawNextValue)) {return true;}
                const oldLength = isArray ? (target as unknown[]).length : 0;
                const applied = Reflect.set(target, property, rawNextValue, target);
                if (applied) {
                    this.#invalidateWrittenProperty(childCache, target, property, oldLength);
                    this.notifyMutation(context, 'set', [property], oldValue, rawNextValue);
                }
                return applied;
            },
            defineProperty: (target, property, descriptor) => {
                if (isBlockedKey(property)) {return false;}
                const previous = Reflect.getOwnPropertyDescriptor(target, property);
                const next = 'value' in descriptor ? {...descriptor, value: toRawValue(descriptor.value)} : descriptor;
                const oldLength = isArray ? (target as unknown[]).length : 0;
                if (!Reflect.defineProperty(target, property, next)) {return false;}
                // Attribute changes such as freezing must also drop the cached child proxy.
                this.#invalidateWrittenProperty(childCache, target, property, oldLength);
                const current = Reflect.getOwnPropertyDescriptor(target, property)!;
                const changed = !previous || !Object.is(previous.value, current.value) ||
                    previous.get !== current.get || previous.set !== current.set;
                if (changed) {
                    this.notifyMutation(
                        context,
                        'set',
                        [property],
                        previous ? toRawValue(previous.value) : undefined,
                        current.value
                    );
                }
                return true;
            },
            deleteProperty: (target, property) => {
                if (!Object.prototype.hasOwnProperty.call(target, property)) {return true;}
                const oldValue = toRawValue(Reflect.get(target, property, target));
                const removed = Reflect.deleteProperty(target, property);
                if (removed) {
                    this.invalidateObservedChild(childCache, property);
                    this.notifyMutation(context, 'delete', [property], oldValue, undefined);
                }
                return removed;
            },
            // Replacing a state prototype would bypass the __proto__ write protection.
            setPrototypeOf: (target, prototype) => Reflect.getPrototypeOf(target) === prototype
        });
        proxyTargets.set(proxy, value);
        return proxy;
    }

    /** Observe Map values and mutators without scanning unrelated entries. */
    private observeMap(value: Map<unknown, unknown>, context: ObservationContext): Map<unknown, unknown> {
        const childCache: ObservedChildCache = new Map();
        if (!context.parent) {this.#rootChildCache = childCache;}
        const observeValue = (key: unknown, item: unknown): unknown =>
            item !== null && typeof item === 'object' ? this.#observeChild(childCache, context, key, item) : item;
        const proxy = new Proxy(value, {
            get: (target, property) => {
                if (property === 'size') {return target.size;}
                if (property === 'get') {return (key: unknown) => observeValue(key, target.get(key));}
                if (property === 'set') {
                    return (key: unknown, nextValue: unknown) => {
                        const rawNextValue = toRawValue(nextValue);
                        const hadKey = target.has(key);
                        const oldValue = toRawValue(target.get(key));
                        if (hadKey && Object.is(oldValue, rawNextValue)) {return proxy;}
                        this.invalidateObservedChild(childCache, key);
                        target.set(key, rawNextValue);
                        this.notifyMutation(context, 'set', [key], oldValue, rawNextValue);
                        return proxy;
                    };
                }
                if (property === 'delete') {
                    return (key: unknown) => {
                        if (!target.has(key)) {return false;}
                        const oldValue = toRawValue(target.get(key));
                        const removed = target.delete(key);
                        if (removed) {
                            this.invalidateObservedChild(childCache, key);
                            this.notifyMutation(context, 'delete', [key], oldValue, undefined);
                        }
                        return removed;
                    };
                }
                if (property === 'clear') {
                    return () => {
                        if (target.size === 0) {return;}
                        const oldValue = new Map(target);
                        target.clear();
                        for (const key of [...childCache.keys()]) {this.invalidateObservedChild(childCache, key);}
                        this.notifyMutation(context, 'clear', [], oldValue, target);
                    };
                }
                if (property === 'forEach') {
                    return (callback: (item: unknown, key: unknown, map: Map<unknown, unknown>) => void, thisArg?: unknown) => {
                        target.forEach((item, key) => callback.call(thisArg, observeValue(key, item), key, proxy));
                    };
                }
                if (property === 'values') {
                    return function* () {
                        for (const [key, item] of target.entries()) {yield observeValue(key, item);}
                    };
                }
                if (property === 'entries' || property === Symbol.iterator) {
                    return function* () {
                        for (const [key, item] of target.entries()) {yield [key, observeValue(key, item)] as [unknown, unknown];}
                    };
                }
                const result = Reflect.get(target, property, target);
                return typeof result === 'function' ? result.bind(target) : result;
            }
        });
        proxyTargets.set(proxy, value);
        return proxy;
    }

    /** Wrap one supported container lazily so mutations never require a full-tree scan. */
    private observe(value: ModelData, context: ObservationContext): object {
        // Check the cheap object shapes first: a failed Map brand check throws, which is slow on fresh objects.
        return Array.isArray(value) || isPlainObject(value)
            ? this.observeObject(value, context)
            : this.observeMap(value as Map<unknown, unknown>, context);
    }

    /** Observe a new root container for a new state generation. */
    #observeRoot(value: ModelData): object {
        return this.observe(value, {
            active: true,
            generation: this.#generation,
            target: value,
            path: [],
            key: undefined,
            parent: undefined
        });
    }

    /** Replace all model state. */
    set(data: unknown, silent = false): boolean {
        const rawData = this.toRaw(data);
        if (!this.isSupportedData(rawData) || !this.accepts(rawData)) {return false;}
        this.#generation += 1;
        this.modelData = this.#observeRoot(rawData) as T;
        if (!silent) {this.#dispatchMessages(['change', 'set'], this.get());}
        return true;
    }

    get(): T;
    get(key: unknown): unknown;
    /** Return all state or one object property, array index, or Map entry. */
    get(key?: unknown): unknown {
        if (arguments.length === 0) {return this.modelData;}
        const raw = this.rawState();
        if (isMap(raw)) {return (this.modelData as Map<unknown, unknown>).get(key);}
        if (Array.isArray(raw)) {return Number.isInteger(key) ? (this.modelData as unknown[])[key as number] : undefined;}
        if (typeof key === 'string' || typeof key === 'symbol' || typeof key === 'number') {
            return Reflect.get(this.modelData, typeof key === 'number' ? String(key) : key);
        }
        return undefined;
    }

    /** Shallow-merge an object root in place, or replace/merge one existing array or Map member. */
    update(keyOrData: unknown, dataOrSilent?: unknown, silent = false): boolean {
        const raw = this.rawState();
        if (isPlainObject(raw)) {
            if (!isPlainObject(keyOrData) ||
                (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean') || arguments.length > 2) {return false;}
            const writes: Array<[PropertyKey, PropertyDescriptor]> = [];
            for (const [key, value] of mergeEntries(toRawValue(keyOrData) as object)) {
                const descriptor = mergeDescriptor(raw, key, value);
                if (!descriptor) {return false;}
                writes.push([key, descriptor]);
            }
            if (this.validator) {
                const candidate = cloneObjectState(raw);
                for (const [key, descriptor] of writes) {Object.defineProperty(candidate, key, descriptor);}
                if (!this.accepts(candidate)) {return false;}
            }
            // Mutating the root in place keeps retained root and nested proxies attached to current state.
            for (const [key, descriptor] of writes) {
                if (ownDataValue(raw, key) !== descriptor.value) {this.invalidateObservedChild(this.#rootChildCache, key);}
                Object.defineProperty(raw, key, descriptor);
            }
            if (dataOrSilent !== true) {this.#dispatchMessages(['change', 'update'], this.get());}
            return true;
        }

        if (arguments.length < 2) {return false;}
        const isMapState = isMap(raw);
        const hasItem = isMapState
            ? raw.has(keyOrData)
            : Number.isInteger(keyOrData) && (keyOrData as number) >= 0 && (keyOrData as number) < (raw as unknown[]).length;
        if (!hasItem) {return false;}
        const current = isMapState ? raw.get(keyOrData) : (raw as unknown[])[keyOrData as number];
        const rawCurrent = this.toRaw(current);
        const rawData = this.toRaw(dataOrSilent);
        const nextValue = isPlainObject(rawCurrent) && isPlainObject(rawData)
            ? extend(rawCurrent, rawData)
            : rawData;
        if (this.validator) {
            const candidate = isMapState ? new Map(raw) : (raw as unknown[]).slice();
            if (isMapState) {(candidate as Map<unknown, unknown>).set(keyOrData, nextValue);}
            else {(candidate as unknown[])[keyOrData as number] = nextValue;}
            if (!this.accepts(candidate)) {return false;}
        }
        if (isMapState) {
            this.invalidateObservedChild(this.#rootChildCache, keyOrData);
            raw.set(keyOrData, nextValue);
        } else {
            this.invalidateObservedChild(this.#rootChildCache, String(keyOrData));
            (raw as unknown[])[keyOrData as number] = nextValue;
        }
        if (!silent) {this.#dispatchMessages(['change', 'update'], this.get());}
        return true;
    }

    /** Append array values or insert Map entries. Returns false for plain-object state. */
    push(key: unknown, dataOrSilent?: unknown, silent = false): boolean {
        const raw = this.rawState();
        if (Array.isArray(raw)) {
            if (arguments.length > 2 || (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean') || key === undefined) {return false;}
            const additions: unknown[] = [];
            if (Array.isArray(key)) {
                for (let index = 0; index < key.length; index += 1) {additions.push(this.toRaw(key[index]));}
            } else {additions.push(this.toRaw(key));}
            if (this.validator && !this.accepts(raw.concat(additions))) {return false;}
            for (const addition of additions) {raw.push(addition);}
            if (dataOrSilent !== true) {this.#dispatchMessages(['change', 'push'], this.get());}
            return true;
        }
        if (!isMap(raw)) {return false;}
        const rawKey = this.toRaw(key);
        if (isMap(rawKey)) {
            if (arguments.length > 2 || (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean')) {return false;}
            if (this.validator) {
                const candidate = new Map(raw);
                rawKey.forEach((value, mapKey) => candidate.set(mapKey, this.toRaw(value)));
                if (!this.accepts(candidate)) {return false;}
            }
            rawKey.forEach((value, mapKey) => {
                this.invalidateObservedChild(this.#rootChildCache, mapKey);
                raw.set(mapKey, this.toRaw(value));
            });
            if (dataOrSilent !== true) {this.#dispatchMessages(['change', 'push'], this.get());}
            return true;
        }
        if (arguments.length < 2) {return false;}
        const rawValue = this.toRaw(dataOrSilent);
        if (this.validator) {
            const candidate = new Map(raw);
            candidate.set(key, rawValue);
            if (!this.accepts(candidate)) {return false;}
        }
        this.invalidateObservedChild(this.#rootChildCache, key);
        raw.set(key, rawValue);
        if (!silent) {this.#dispatchMessages(['change', 'push'], this.get());}
        return true;
    }

    /** Delete one property, array index, or Map entry. Use clear() to empty all state. */
    delete(key: unknown, silent = false): boolean {
        const raw = this.rawState();
        const isMapState = isMap(raw);
        const isArrayState = Array.isArray(raw);
        const objectKey = typeof key === 'number' ? String(key) : key as PropertyKey;
        if (isMapState) {
            if (!raw.has(key)) {return false;}
        } else if (isArrayState) {
            if (!Number.isInteger(key) || (key as number) < 0 || (key as number) >= raw.length) {return false;}
        } else if ((typeof key !== 'string' && typeof key !== 'symbol' && typeof key !== 'number') ||
            !Object.prototype.hasOwnProperty.call(raw, key)) {return false;}

        if (this.validator) {
            let candidate: ModelData;
            if (isMapState) {
                candidate = new Map(raw);
                (candidate as Map<unknown, unknown>).delete(key);
            } else if (isArrayState) {
                candidate = raw.slice();
                candidate.splice(key as number, 1);
            } else {
                candidate = cloneObjectState(raw);
                if (!Reflect.deleteProperty(candidate, objectKey)) {return false;}
            }
            if (!this.accepts(candidate)) {return false;}
        }

        if (isMapState) {
            if (!raw.delete(key)) {return false;}
            this.invalidateObservedChild(this.#rootChildCache, key);
        } else if (isArrayState) {
            this.invalidateObservedArrayFrom(this.#rootChildCache, key as number);
            raw.splice(key as number, 1);
        }
        else {
            if (!Reflect.deleteProperty(raw, objectKey)) {return false;}
            this.invalidateObservedChild(this.#rootChildCache, objectKey);
        }
        if (!silent) {this.#dispatchMessages(['change', 'delete'], this.get());}
        return true;
    }

    /** Clear all state while preserving its object, array, or Map shape (including an object's prototype). */
    clear(silent = false): boolean {
        const raw = this.rawState();
        const empty: ModelData = isMap(raw)
            ? new Map()
            : Array.isArray(raw) ? [] : Object.create(Object.getPrototypeOf(raw)) as Record<PropertyKey, unknown>;
        this.#generation += 1;
        this.modelData = this.#observeRoot(empty) as T;
        if (!silent) {this.#dispatchMessages(['change', 'clear'], this.get());}
        return true;
    }
}

export = Model;
