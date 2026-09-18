/** @module src/model */

/** Supported root-state containers. */
type ModelData = Record<PropertyKey, unknown> | unknown[] | Map<unknown, unknown>;

type ObservationToken = {active: boolean; parent?: ObservationToken};
type ObservedChildCache = Map<unknown, {raw: object; proxy: object; token: ObservationToken}>;

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

/** Recognize native Map objects, including Maps created in another realm. */
function isMap(value: unknown): value is Map<unknown, unknown> {
    if (!value || typeof value !== 'object') {return false;}
    try {
        Map.prototype.has.call(value, value);
        return true;
    } catch {
        return false;
    }
}

/** Accept ordinary objects and objects with a null prototype, including ordinary objects from another realm. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    if (Object.prototype.toString.call(value) !== '[object Object]') {return false;}
    const prototype = Object.getPrototypeOf(value);
    if (prototype === null) {return true;}
    const constructor = Object.prototype.hasOwnProperty.call(prototype, 'constructor')
        ? prototype.constructor
        : undefined;
    return typeof constructor === 'function' &&
        Function.prototype.toString.call(constructor) === Function.prototype.toString.call(Object);
}

/** Create a shallow merge using enumerable own properties while blocking prototype-pollution keys. */
function extend(
    object1: Record<string, unknown>,
    object2: Record<string, unknown>
): Record<string, unknown> {
    const result = Object.create(Object.getPrototypeOf(object1)) as Record<PropertyKey, unknown>;
    const blockedKeys = new Set(['__proto__', 'constructor', 'prototype']);
    for (const source of [object1, object2]) {
        for (const key of Reflect.ownKeys(source)) {
            if ((typeof key !== 'string' || !blockedKeys.has(key)) &&
                Object.prototype.propertyIsEnumerable.call(source, key)) {
                result[key] = (source as Record<PropertyKey, unknown>)[key];
            }
        }
    }
    return result as Record<string, unknown>;
}

/** Clone an object state exactly without invoking inherited property setters. */
function cloneObjectState(value: object): Record<PropertyKey, unknown> {
    return Object.create(
        Object.getPrototypeOf(value),
        Object.getOwnPropertyDescriptors(value)
    ) as Record<PropertyKey, unknown>;
}

/** Mutable object, array, or Map state with synchronous change notifications. */
class Model<T extends ModelData = Record<string, unknown>> extends EventTarget {
    modelData: T;
    validator: ((data: unknown) => boolean) | undefined;
    name: string | false = false;
    mediator: ApplicationMediator | false = false;
    readonly #proxyTargets = new WeakMap<object, object>();
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
        const initial = modelData === undefined ? {} : modelData;
        if (!this.isSupportedData(initial)) {
            throw new TypeError('Model data must be a plain object, array, or Map.');
        }
        if (!this.accepts(initial)) {
            throw new TypeError('Initial model data failed validation.');
        }
        this.modelData = this.observe(initial, [], this.#generation) as T;
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

    /** Return the raw target behind one of this model's observable proxies. */
    private toRaw(value: unknown): unknown {
        if (value && typeof value === 'object') {return this.#proxyTargets.get(value) || value;}
        return value;
    }

    /** Return whether a value is a supported root-state container. */
    private isSupportedData(value: unknown): value is ModelData {
        return Array.isArray(value) || isMap(value) || isPlainObject(value);
    }

    /** Return whether a nested value should participate in deep change tracking. */
    private isObservable(value: unknown): value is ModelData {
        return value !== null && typeof value === 'object' &&
            (Array.isArray(value) || isMap(value) || isPlainObject(value));
    }

    /** Prevent direct object writes from using prototype-pollution keys. */
    private isBlockedKey(property: PropertyKey): boolean {
        return typeof property === 'string' &&
            (property === '__proto__' || property === 'constructor' || property === 'prototype');
    }

    /** Return the raw root container. */
    private rawState(): ModelData {return this.toRaw(this.modelData) as ModelData;}

    /** Apply the optional validator to an explicit candidate state. */
    private accepts(candidate: ModelData): boolean {return !this.validator || this.validator(candidate);}

    /** Return whether this proxy and every observed ancestor still represent current state. */
    private isObservationActive(generation: number, token?: ObservationToken): boolean {
        if (generation !== this.#generation) {return false;}
        for (let current = token; current; current = current.parent) {
            if (!current.active) {return false;}
        }
        return true;
    }

    /** Invalidate one cached child proxy while allowing retained detached objects to remain usable. */
    private invalidateObservedChild(cache: ObservedChildCache, key: unknown): void {
        const cached = cache.get(key);
        if (!cached) {return;}
        cached.token.active = false;
        cache.delete(key);
    }

    /** Invalidate cached array items whose index changes after a structural root mutation. */
    private invalidateObservedArrayFrom(index: number): void {
        for (const [key, cached] of this.#rootChildCache) {
            const numericKey = typeof key === 'string' && key !== '' ? Number(key) : Number.NaN;
            if (Number.isInteger(numericKey) && numericKey >= index) {
                cached.token.active = false;
                this.#rootChildCache.delete(key);
            }
        }
    }

    /** Find one current state path to a raw observed container without invoking accessors. */
    private findCurrentPath(target: object): unknown[] | null {
        const queue: Array<{value: unknown; path: unknown[]}> = [{value: this.rawState(), path: []}];
        const seen = new WeakSet<object>();

        for (let index = 0; index < queue.length; index += 1) {
            const entry = queue[index];
            const rawValue = this.toRaw(entry.value);
            if (rawValue === target) {return entry.path;}
            if (!this.isObservable(rawValue) || seen.has(rawValue)) {continue;}
            seen.add(rawValue);

            if (isMap(rawValue)) {
                for (const [key, value] of rawValue) {
                    queue.push({value, path: entry.path.concat(key)});
                }
                continue;
            }

            for (const key of Reflect.ownKeys(rawValue)) {
                if (this.isBlockedKey(key)) {continue;}
                const descriptor = Object.getOwnPropertyDescriptor(rawValue, key);
                if (!descriptor || !('value' in descriptor)) {continue;}
                queue.push({value: descriptor.value, path: entry.path.concat(key)});
            }
        }

        return null;
    }

    /** Resolve the live mutation path, rebasing stale same-generation aliases when possible. */
    private resolveMutationPath(
        generation: number,
        token: ObservationToken | undefined,
        target: object,
        containerPath: unknown[],
        mutationPath: unknown[]
    ): unknown[] | null {
        if (this.isObservationActive(generation, token)) {return mutationPath;}
        if (generation !== this.#generation) {return null;}
        const currentContainerPath = this.findCurrentPath(target);
        if (!currentContainerPath) {return null;}
        return currentContainerPath.concat(mutationPath.slice(containerPath.length));
    }

    /** Dispatch deep-mutation events only while the proxy still maps to current state. */
    private notifyMutation(
        generation: number,
        token: ObservationToken | undefined,
        target: object,
        containerPath: unknown[],
        operation: ModelMutation<T>['operation'],
        path: unknown[],
        oldValue: unknown,
        newValue: unknown
    ): void {
        const resolvedPath = this.resolveMutationPath(generation, token, target, containerPath, path);
        if (!resolvedPath) {return;}
        const state = this.get();
        const mutation: ModelMutation<T> = Object.freeze({
            operation,
            path: Object.freeze(resolvedPath.slice()),
            oldValue,
            newValue,
            state
        });
        this.#dispatchMessages(['change'], state);
        this.#dispatchMessages(['mutate'], mutation);
    }

    /** Observe plain objects and arrays lazily along accessed branches. */
    private observeObject(value: object, path: unknown[], generation: number, token?: ObservationToken): object {
        const childCache: ObservedChildCache = new Map();
        if (path.length === 0) {this.#rootChildCache = childCache;}
        const proxy = new Proxy(value, {
            get: (target, property, receiver) => {
                const hasOwnProperty = Object.prototype.hasOwnProperty.call(target, property);
                if ((!Array.isArray(target) || this.isBlockedKey(property)) && !hasOwnProperty) {return undefined;}
                const result = Reflect.get(target, property, receiver);
                const rawResult = this.toRaw(result);
                if (!this.isObservable(rawResult)) {return result;}
                const cached = childCache.get(property);
                if (cached && cached.raw === rawResult) {return cached.proxy;}
                const childToken: ObservationToken = token ? {active: true, parent: token} : {active: true};
                const childProxy = this.observe(rawResult, path.concat(property), generation, childToken);
                childCache.set(property, {raw: rawResult, proxy: childProxy, token: childToken});
                return childProxy;
            },
            set: (target, property, nextValue) => {
                if (this.isBlockedKey(property)) {return false;}
                const rawNextValue = this.toRaw(nextValue);
                const oldValue = this.toRaw(Reflect.get(target, property, target));
                if (Object.is(oldValue, rawNextValue)) {return true;}
                const applied = Reflect.set(target, property, rawNextValue, target);
                if (applied) {
                    if (Array.isArray(target) && property === 'length' && typeof rawNextValue === 'number' && rawNextValue < Number(oldValue)) {
                        for (const key of [...childCache.keys()]) {
                            const numericKey = typeof key === 'string' && key !== '' ? Number(key) : Number.NaN;
                            if (Number.isInteger(numericKey) && numericKey >= rawNextValue) {this.invalidateObservedChild(childCache, key);}
                        }
                    } else {
                        this.invalidateObservedChild(childCache, property);
                    }
                    this.notifyMutation(generation, token, target, path, 'set', path.concat(property), oldValue, rawNextValue);
                }
                return applied;
            },
            deleteProperty: (target, property) => {
                if (!Object.prototype.hasOwnProperty.call(target, property)) {return true;}
                const oldValue = this.toRaw(Reflect.get(target, property, target));
                const removed = Reflect.deleteProperty(target, property);
                if (removed) {
                    this.invalidateObservedChild(childCache, property);
                    this.notifyMutation(generation, token, target, path, 'delete', path.concat(property), oldValue, undefined);
                }
                return removed;
            }
        });
        this.#proxyTargets.set(proxy, value);
        return proxy;
    }

    /** Observe Map values and mutators without scanning unrelated entries. */
    private observeMap(value: Map<unknown, unknown>, path: unknown[], generation: number, token?: ObservationToken): Map<unknown, unknown> {
        const childCache: ObservedChildCache = new Map();
        if (path.length === 0) {this.#rootChildCache = childCache;}
        const observeValue = (key: unknown, item: unknown): unknown => {
            const rawItem = this.toRaw(item);
            if (!this.isObservable(rawItem)) {return item;}
            const cached = childCache.get(key);
            if (cached && cached.raw === rawItem) {return cached.proxy;}
            const childToken: ObservationToken = token ? {active: true, parent: token} : {active: true};
            const childProxy = this.observe(rawItem, path.concat(key), generation, childToken);
            childCache.set(key, {raw: rawItem, proxy: childProxy, token: childToken});
            return childProxy;
        };
        const proxy = new Proxy(value, {
            get: (target, property) => {
                if (property === 'size') {return target.size;}
                if (property === 'get') {return (key: unknown) => observeValue(key, target.get(key));}
                if (property === 'set') {
                    return (key: unknown, nextValue: unknown) => {
                        const rawNextValue = this.toRaw(nextValue);
                        const hadKey = target.has(key);
                        const oldValue = this.toRaw(target.get(key));
                        if (hadKey && Object.is(oldValue, rawNextValue)) {return proxy;}
                        this.invalidateObservedChild(childCache, key);
                        target.set(key, rawNextValue);
                        this.notifyMutation(generation, token, target, path, 'set', path.concat(key), oldValue, rawNextValue);
                        return proxy;
                    };
                }
                if (property === 'delete') {
                    return (key: unknown) => {
                        if (!target.has(key)) {return false;}
                        const oldValue = this.toRaw(target.get(key));
                        const removed = target.delete(key);
                        if (removed) {
                            this.invalidateObservedChild(childCache, key);
                            this.notifyMutation(generation, token, target, path, 'delete', path.concat(key), oldValue, undefined);
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
                        this.notifyMutation(generation, token, target, path, 'clear', path, oldValue, target);
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
        this.#proxyTargets.set(proxy, value);
        return proxy;
    }

    /** Wrap one supported container lazily so mutations never require a full-tree scan. */
    private observe(value: ModelData, path: unknown[], generation: number, token?: ObservationToken): object {
        return isMap(value) ? this.observeMap(value, path, generation, token) : this.observeObject(value, path, generation, token);
    }

    /** Replace all model state. */
    set(data: unknown, silent = false): boolean {
        const rawData = this.toRaw(data);
        if (!this.isSupportedData(rawData) || !this.accepts(rawData)) {return false;}
        this.#generation += 1;
        this.modelData = this.observe(rawData, [], this.#generation) as T;
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

    /** Shallow-merge an object root, or replace/merge one existing array or Map member. */
    update(keyOrData: unknown, dataOrSilent?: unknown, silent = false): boolean {
        const raw = this.rawState();
        if (isPlainObject(raw)) {
            if (!isPlainObject(keyOrData) ||
                (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean') || arguments.length > 2) {return false;}
            const candidate = extend(raw, keyOrData);
            if (!this.accepts(candidate)) {return false;}
            if (!this.set(candidate, true)) {return false;}
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
        const nextValue = isPlainObject(current) && isPlainObject(dataOrSilent)
            ? extend(current, dataOrSilent)
            : this.toRaw(dataOrSilent);
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
            this.invalidateObservedArrayFrom(key as number);
            raw.splice(key as number, 1);
        }
        else {
            if (!Reflect.deleteProperty(raw, objectKey)) {return false;}
            this.invalidateObservedChild(this.#rootChildCache, objectKey);
        }
        if (!silent) {this.#dispatchMessages(['change', 'delete'], this.get());}
        return true;
    }

    /** Clear all state while preserving its object, array, or Map shape. */
    clear(silent = false): boolean {
        const raw = this.rawState();
        const empty: ModelData = isMap(raw) ? new Map() : Array.isArray(raw) ? [] : {};
        this.#generation += 1;
        this.modelData = this.observe(empty, [], this.#generation) as T;
        if (!silent) {this.#dispatchMessages(['change', 'clear'], this.get());}
        return true;
    }
}

export = Model;