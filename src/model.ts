/**
 * The Model implementation. State is wrapped in lazily created proxies so that writes anywhere in the
 * tree can be reported with their path, without ever scanning or diffing the whole state.
 * @module src/model
 */

/** The state shapes a Model can hold: a plain object, an array, or a Map. */
type ModelData = Record<PropertyKey, unknown> | unknown[] | Map<unknown, unknown>;

/**
 * Bookkeeping for one proxied container. `path` is where it was found when first read; `parent` and `key`
 * let a stale proxy find its current location by walking back up, instead of searching the whole state.
 * `active` turns false when the container is moved or replaced in its parent.
 */
type ObservationContext = {
    active: boolean;
    readonly generation: number;
    readonly target: object;
    readonly path: unknown[];
    readonly key: unknown;
    readonly parent: ObservationContext | undefined;
};
/** Per-container cache of child proxies, keyed by property name or Map key. */
type ObservedChildCache = Map<unknown, {proxy: object; context: ObservationContext}>;

/** Anything that can receive relayed events, such as a white-label-mediator instance or a plain EventTarget. */
interface ApplicationMediator {
    dispatchEvent(event: Event): boolean;
}

/** The `detail` of a `mutate` event, describing one direct write to nested state. */
interface ModelMutation<T extends ModelData> {
    operation: 'set' | 'delete' | 'clear';
    path: ReadonlyArray<unknown>;
    oldValue: unknown;
    newValue: unknown;
    state: T;
}

/** Cached results of the Map check below. An object's Map-ness never changes, and the check is slow when it fails. */
const mapBrands = new WeakMap<object, boolean>();

/** Maps every Model proxy to the raw object behind it. Shared by all Models so any Model can unwrap any other's proxies. */
const proxyTargets = new WeakMap<object, object>();

/** Keys that merges and direct writes refuse, so state can never be used to alter object prototypes. */
const blockedKeys = new Set<PropertyKey>(['__proto__', 'constructor', 'prototype']);

/** Returned by the lookup helpers when a child is not stored in the parent. */
const missingKey = Symbol('missing');

/** Return whether a value is a real Map, including one from another realm (iframe or `vm` context). */
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

/**
 * Return whether a value is a plain object: an object literal, a null-prototype object, or an object
 * literal from another realm. Class instances, Dates, and other built-ins are rejected.
 */
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

/** Return the raw object behind a Model proxy, or the value itself when it is not one. */
function toRawValue(value: unknown): unknown {
    if (value !== null && typeof value === 'object') {return proxyTargets.get(value) || value;}
    return value;
}

/** Return whether a key is one of the blocked prototype-related keys. */
function isBlockedKey(property: unknown): boolean {
    return typeof property === 'string' && blockedKeys.has(property);
}

/** List the enumerable own keys and values to merge from an object, skipping blocked keys and unwrapping proxies. */
function mergeEntries(source: object): Array<[PropertyKey, unknown]> {
    const entries: Array<[PropertyKey, unknown]> = [];
    for (const key of Reflect.ownKeys(source)) {
        if (!isBlockedKey(key) && Object.prototype.propertyIsEnumerable.call(source, key)) {
            entries.push([key, toRawValue((source as Record<PropertyKey, unknown>)[key])]);
        }
    }
    return entries;
}

/** Return a new object with the first object's prototype, holding a shallow merge of both objects' entries. */
function extend(
    object1: Record<string, unknown>,
    object2: Record<string, unknown>
): Record<string, unknown> {
    const result = Object.create(Object.getPrototypeOf(object1)) as Record<PropertyKey, unknown>;
    for (const [key, value] of mergeEntries(object1)) {result[key] = value;}
    for (const [key, value] of mergeEntries(object2)) {result[key] = value;}
    return result as Record<string, unknown>;
}

/**
 * Copy an object's own properties, descriptors, prototype, and extensibility, without calling any setters.
 * Used to give the validator a candidate state without touching the real one.
 */
function cloneObjectState(value: object): Record<PropertyKey, unknown> {
    const clone = Object.create(
        Object.getPrototypeOf(value),
        Object.getOwnPropertyDescriptors(value)
    ) as Record<PropertyKey, unknown>;
    if (!Object.isExtensible(value)) {Object.preventExtensions(clone);}
    return clone;
}

/**
 * Work out the property descriptor update() should use to write one merged key into the root.
 * Values are always stored as plain data, so existing setters never run.
 * @returns The descriptor to define, or `undefined` when the key cannot be written: a read-only data
 * property, a non-configurable accessor, or a new key on an object that cannot gain properties.
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

/** Read an own data property without running getters. Returns `missingKey` for accessors and absent keys. */
function ownDataValue(container: object, key: PropertyKey): unknown {
    const descriptor = Reflect.getOwnPropertyDescriptor(container, key);
    return descriptor && 'value' in descriptor ? toRawValue(descriptor.value) : missingKey;
}

/**
 * Find the key under which a parent currently stores a child object. Tries the last known key first,
 * then the parent's other keys. Only this one parent is searched, never its descendants.
 * @returns The key, or `missingKey` when the parent no longer holds the child.
 */
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

/**
 * Observable state for a plain object, array, or Map. Every change is applied synchronously and announced
 * with `CustomEvent`s whose `detail` carries the state (or, for `mutate`, a description of the write).
 */
class Model<T extends ModelData = Record<string, unknown>> extends EventTarget {
    /** The observable root state. Prefer `get()` for reading it. */
    modelData: T;
    /** Optional check run on the complete proposed state before explicit mutations commit. */
    validator: ((data: unknown) => boolean) | undefined;
    /** Name used in relayed event types (`model:<name>:<event>`). Relays need both `name` and `mediator`. */
    name: string | false = false;
    /** Optional event target that receives a namespaced copy of every Model event. */
    mediator: ApplicationMediator | false = false;
    /** Child proxy cache of the current root, so explicit mutations can invalidate the entries they replace. */
    #rootChildCache!: ObservedChildCache;
    /** Increments whenever the root object is replaced; proxies from older generations stay silent. */
    #generation = 0;
    /** Aborting this removes every listener; destroy() aborts it and starts a fresh one. */
    #listenerController = new AbortController();

    /**
     * Create a Model holding a plain object, array, or Map.
     * @param modelData - Initial state. Defaults to an empty object. A Model proxy is unwrapped first.
     * @param validator - Optional function that receives the complete proposed state and returns `false`
     * to reject it. Runs on construction and before `set()`, `update()`, `push()`, and `delete()` commit.
     * @throws TypeError when the data is not a supported shape or the validator rejects it.
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

    /**
     * Add a listener using native EventTarget rules. The listener is also tied to this Model's lifecycle,
     * so `destroy()` removes it; a caller-supplied `signal` still works alongside that.
     */
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

    /** Remove a listener. Only `capture` is passed on, so Node.js matches browser removal behavior. */
    override removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions
    ): void {
        const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
        super.removeEventListener(type, callback, {capture});
    }

    /**
     * Lifecycle hook kept for consistency with other White Label packages. It does nothing.
     * @returns This Model, for chaining.
     */
    initialize() {return this;}

    /**
     * Clear the state without events and remove every listener. The instance can be used again afterwards.
     * @returns This Model, for chaining.
     */
    destroy() {
        this.clear(true);
        this.#listenerController.abort();
        this.#listenerController = new AbortController();
        return this;
    }

    /** Dispatch each event locally, then relay it to the mediator as `model:<name>:<event>` when one is set. */
    #dispatchMessages(messages: string[], data: unknown): void {
        for (const message of messages) {
            this.dispatchEvent(new CustomEvent(message, {detail: data}));
            if (this.name && this.mediator) {
                this.mediator.dispatchEvent(new CustomEvent(`model:${this.name}:${message}`, {detail: data}));
            }
        }
    }

    /** Return the raw object behind a Model proxy. */
    private toRaw(value: unknown): unknown {return toRawValue(value);}

    /** Return whether a value is a plain object, array, or Map. */
    private isSupportedData(value: unknown): value is ModelData {
        return Array.isArray(value) || isPlainObject(value) || isMap(value);
    }

    /** Return whether a nested value should be wrapped in a proxy. */
    private isObservable(value: unknown): value is ModelData {
        return value !== null && typeof value === 'object' && this.isSupportedData(value);
    }

    /** Return the raw (unproxied) root state. */
    private rawState(): ModelData {return this.toRaw(this.modelData) as ModelData;}

    /** Return whether the validator accepts a candidate state, or `true` when there is no validator. */
    private accepts(candidate: ModelData): boolean {return !this.validator || this.validator(candidate);}

    /** Return whether this container and all of its ancestors are still where they were first read. */
    private isObservationActive(context: ObservationContext): boolean {
        for (let current: ObservationContext | undefined = context; current; current = current.parent) {
            if (!current.active) {return false;}
        }
        return true;
    }

    /** Forget one cached child proxy and mark it stale. Code holding that proxy can still use it. */
    private invalidateObservedChild(cache: ObservedChildCache, key: unknown): void {
        const cached = cache.get(key);
        if (!cached) {return;}
        cached.context.active = false;
        cache.delete(key);
    }

    /** Mark cached array items at or after `index` stale, because their positions changed. */
    private invalidateObservedArrayFrom(cache: ObservedChildCache, index: number): void {
        for (const [key, cached] of cache) {
            const numericKey = typeof key === 'string' && key !== '' ? Number(key) : Number.NaN;
            if (Number.isInteger(numericKey) && numericKey >= index) {
                cached.context.active = false;
                cache.delete(key);
            }
        }
    }

    /** After a write, mark the overwritten child stale; for an array `length` write, mark every removed index stale. */
    #invalidateWrittenProperty(cache: ObservedChildCache, target: object, property: PropertyKey, oldLength: number): void {
        if (Array.isArray(target) && property === 'length') {
            if (target.length < oldLength) {this.invalidateObservedArrayFrom(cache, target.length);}
            return;
        }
        this.invalidateObservedChild(cache, property);
    }

    /**
     * Find where a container lives in the current state. Active containers use their recorded path. A stale
     * one first locates its parent the same way, then looks for itself in that parent, so the cost grows
     * with depth rather than state size. If an ancestor was replaced by another object, this returns null
     * even when the container is reachable some other way: an accepted trade-off for avoiding tree scans.
     * @returns The current path, or null when the container is no longer reachable through its parents.
     */
    private findCurrentPath(context: ObservationContext): unknown[] | null {
        if (this.isObservationActive(context)) {return context.path;}
        if (context.target === this.rawState()) {return [];}
        // Only non-root contexts are ever marked stale, so a stale context always has a parent.
        const parent = context.parent!;
        const parentPath = this.findCurrentPath(parent);
        if (!parentPath) {return null;}
        const key = findChildKey(parent.target, context.key, context.target);
        return key === missingKey ? null : [...parentPath, key];
    }

    /** Return the container's current path, or null when its proxy belongs to an old root or is unreachable. */
    private resolveMutationPath(context: ObservationContext): unknown[] | null {
        if (context.generation !== this.#generation) {return null;}
        return this.findCurrentPath(context);
    }

    /** Dispatch `change` and `mutate` for a direct write, unless the written container is detached. */
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

    /** Return the proxy for a child value, reusing the cached one or creating it on first access. */
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

    /** Wrap a plain object or array in a proxy that reports writes and wraps children as they are read. */
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
                // A Proxy must return non-configurable, non-writable values unchanged, so these are not wrapped.
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
                // Even attribute-only changes (such as freezing) drop the cached child, so the next read sees them.
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
            // Allow only a no-op; changing the prototype would bypass the blocked-key protection.
            setPrototypeOf: (target, prototype) => Reflect.getPrototypeOf(target) === prototype
        });
        proxyTargets.set(proxy, value);
        return proxy;
    }

    /** Wrap a Map in a proxy whose mutators report changes and whose readers wrap values as they are read. */
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
            },
            // Same blocked-key and prototype guards as object and array proxies; other properties keep default behaviour.
            set: (target, property, nextValue, receiver) =>
                !isBlockedKey(property) && Reflect.set(target, property, nextValue, receiver),
            defineProperty: (target, property, descriptor) =>
                !isBlockedKey(property) && Reflect.defineProperty(target, property, descriptor),
            setPrototypeOf: (target, prototype) => Reflect.getPrototypeOf(target) === prototype
        });
        proxyTargets.set(proxy, value);
        return proxy;
    }

    /** Wrap a supported container in the matching kind of proxy. */
    private observe(value: ModelData, context: ObservationContext): object {
        // Check arrays and plain objects first: the Map check throws on non-Maps, which is slow for new objects.
        return Array.isArray(value) || isPlainObject(value)
            ? this.observeObject(value, context)
            : this.observeMap(value as Map<unknown, unknown>, context);
    }

    /** Wrap a new root in a proxy tied to the current generation. */
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

    /**
     * Replace the whole state. Proxies from the old root stop emitting events.
     * @param data - A plain object, array, or Map. A Model proxy is unwrapped first.
     * @param silent - When `true`, skip the `change` and `set` events.
     * @returns `true` when applied, or `false` when the data is unsupported or rejected by the validator.
     */
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
    /**
     * Read the whole state, or one entry of it.
     * @param key - Optional object property, array index (integer), or Map key.
     * @returns The observable root when called without a key; otherwise the entry, or `undefined` when missing.
     */
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

    /**
     * Change part of the state.
     *
     * Object root: `update(data, silent?)` shallow-merges `data` into the root in place, so retained proxies
     * keep working. Returns `false` with nothing changed if any merged key is read-only or would be new on
     * a root that cannot gain properties.
     *
     * Array or Map root: `update(key, value, silent?)` replaces one existing member. When both the current
     * and new values are plain objects, they are shallow-merged into a new object instead.
     *
     * Blocked keys (`__proto__`, `constructor`, `prototype`) are never merged.
     * @returns `true` when applied, or `false` for bad arguments, a missing member, or a validator rejection.
     */
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
            // Write into the existing root rather than replacing it, so proxies already handed out stay live.
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

    /**
     * Add to the state.
     *
     * Array root: `push(value, silent?)` appends one value; `push([a, b], silent?)` appends each item.
     * Map root: `push(key, value, silent?)` sets one entry; `push(map, silent?)` sets every entry of `map`.
     * @returns `true` when applied, or `false` for an object root, bad arguments, or a validator rejection.
     */
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

    /**
     * Remove one object property, array index, or Map entry. Later array items shift down by one.
     * @param key - The property, index, or Map key to remove.
     * @param silent - When `true`, skip the `change` and `delete` events.
     * @returns `true` when removed, or `false` when the key is missing, cannot be deleted, or is rejected.
     */
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

    /**
     * Replace the state with an empty value of the same shape: an object with the same prototype, an empty
     * array, or an empty Map. Skips the validator. Proxies from the old root stop emitting events.
     * @param silent - When `true`, skip the `change` and `clear` events.
     * @returns Always `true`.
     */
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
