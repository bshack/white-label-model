"use strict";
/** @module src/model */
const Utilities = require("./utilities");
/** Mutable object, array, or Map state with synchronous change notifications. */
class Model extends Utilities {
    modelData;
    validator;
    proxyTargets = new WeakMap();
    /**
     * Create one observable state container for a plain object, array, or Map.
     * @param modelData - Initial state; omitted state defaults to an empty object.
     * @param validator - Optional whole-state validator for explicit set/update/push/delete operations.
     */
    constructor(modelData, validator) {
        super();
        this.validator = validator;
        const initial = modelData === undefined ? {} : modelData;
        if (!this.isSupportedData(initial)) {
            throw new TypeError('Model data must be a plain object, array, or Map.');
        }
        if (!this.accepts(initial)) {
            throw new TypeError('Initial model data failed validation.');
        }
        this.modelData = this.observe(initial, []);
        this.label = 'model';
        this.mediator = false;
        this.name = false;
    }
    /** Start this instance and return it for lifecycle chaining. */
    initialize() {
        return this;
    }
    /** Release owned state and listeners so the instance can leave the application lifecycle. */
    destroy() {
        this.clear(true);
        this.removeAllListeners();
        return this;
    }
    /** Return the raw target behind one of this model's observable proxies. */
    toRaw(value) {
        if (value && typeof value === 'object') {
            return this.proxyTargets.get(value) || value;
        }
        return value;
    }
    /** Return whether a value is a supported root-state container. */
    isSupportedData(value) {
        return Array.isArray(value) || this.isMap(value) || this.isPlainObject(value);
    }
    /** Return whether a nested value should participate in deep change tracking. */
    isObservable(value) {
        return value !== null && typeof value === 'object' &&
            (Array.isArray(value) || this.isMap(value) || this.isPlainObject(value));
    }
    /** Prevent direct object writes from using prototype-pollution keys. */
    isBlockedKey(property) {
        return typeof property === 'string' &&
            (property === '__proto__' || property === 'constructor' || property === 'prototype');
    }
    /** Return the raw root container. */
    rawState() {
        return this.toRaw(this.modelData);
    }
    /** Apply the optional validator to an explicit candidate state. */
    accepts(candidate) {
        return !this.validator || this.validator(candidate);
    }
    /** Emit the existing full-state change event plus a path-specific mutation event. */
    notifyMutation(operation, path, oldValue, newValue) {
        const state = this.get();
        const mutation = Object.freeze({
            operation,
            path: Object.freeze(path.slice()),
            oldValue,
            newValue,
            state
        });
        this.message(['change'], state);
        this.message(['mutate'], mutation);
    }
    /** Observe plain objects and arrays lazily along accessed branches. */
    observeObject(value, path) {
        const childCache = new Map();
        const proxy = new Proxy(value, {
            get: (target, property, receiver) => {
                const result = Reflect.get(target, property, receiver);
                const rawResult = this.toRaw(result);
                if (!this.isObservable(rawResult)) {
                    return result;
                }
                const cached = childCache.get(property);
                if (cached && cached.raw === rawResult) {
                    return cached.proxy;
                }
                const childProxy = this.observe(rawResult, path.concat(property));
                childCache.set(property, { raw: rawResult, proxy: childProxy });
                return childProxy;
            },
            set: (target, property, nextValue) => {
                if (this.isBlockedKey(property)) {
                    return false;
                }
                const rawNextValue = this.toRaw(nextValue);
                const oldValue = this.toRaw(Reflect.get(target, property, target));
                if (Object.is(oldValue, rawNextValue)) {
                    return true;
                }
                const applied = Reflect.set(target, property, rawNextValue, target);
                if (applied) {
                    this.notifyMutation('set', path.concat(property), oldValue, rawNextValue);
                }
                return applied;
            },
            deleteProperty: (target, property) => {
                if (!Object.prototype.hasOwnProperty.call(target, property)) {
                    return true;
                }
                const oldValue = this.toRaw(Reflect.get(target, property, target));
                const removed = Reflect.deleteProperty(target, property);
                if (removed) {
                    this.notifyMutation('delete', path.concat(property), oldValue, undefined);
                }
                return removed;
            }
        });
        this.proxyTargets.set(proxy, value);
        return proxy;
    }
    /** Observe Map values and mutators without scanning unrelated entries. */
    observeMap(value, path) {
        const childCache = new Map();
        const observeValue = (key, item) => {
            const rawItem = this.toRaw(item);
            if (!this.isObservable(rawItem)) {
                return item;
            }
            const cached = childCache.get(key);
            if (cached && cached.raw === rawItem) {
                return cached.proxy;
            }
            const childProxy = this.observe(rawItem, path.concat(key));
            childCache.set(key, { raw: rawItem, proxy: childProxy });
            return childProxy;
        };
        const proxy = new Proxy(value, {
            get: (target, property) => {
                if (property === 'size') {
                    return target.size;
                }
                if (property === 'get') {
                    return (key) => observeValue(key, target.get(key));
                }
                if (property === 'set') {
                    return (key, nextValue) => {
                        const rawNextValue = this.toRaw(nextValue);
                        const hadKey = target.has(key);
                        const oldValue = this.toRaw(target.get(key));
                        if (hadKey && Object.is(oldValue, rawNextValue)) {
                            return proxy;
                        }
                        target.set(key, rawNextValue);
                        this.notifyMutation('set', path.concat(key), oldValue, rawNextValue);
                        return proxy;
                    };
                }
                if (property === 'delete') {
                    return (key) => {
                        if (!target.has(key)) {
                            return false;
                        }
                        const oldValue = this.toRaw(target.get(key));
                        const removed = target.delete(key);
                        if (removed) {
                            childCache.delete(key);
                            this.notifyMutation('delete', path.concat(key), oldValue, undefined);
                        }
                        return removed;
                    };
                }
                if (property === 'clear') {
                    return () => {
                        if (target.size === 0) {
                            return;
                        }
                        const oldValue = new Map(target);
                        target.clear();
                        childCache.clear();
                        this.notifyMutation('clear', path, oldValue, target);
                    };
                }
                if (property === 'forEach') {
                    return (callback, thisArg) => {
                        target.forEach((item, key) => callback.call(thisArg, observeValue(key, item), key, proxy));
                    };
                }
                if (property === 'values') {
                    return function* () {
                        for (const [key, item] of target.entries()) {
                            yield observeValue(key, item);
                        }
                    };
                }
                if (property === 'entries' || property === Symbol.iterator) {
                    return function* () {
                        for (const [key, item] of target.entries()) {
                            yield [key, observeValue(key, item)];
                        }
                    };
                }
                const result = Reflect.get(target, property, target);
                return typeof result === 'function' ? result.bind(target) : result;
            }
        });
        this.proxyTargets.set(proxy, value);
        return proxy;
    }
    /** Wrap one supported container lazily so mutations never require a full-tree scan. */
    observe(value, path) {
        return this.isMap(value) ? this.observeMap(value, path) : this.observeObject(value, path);
    }
    /** Replace all model state. */
    set(data, silent = false) {
        const rawData = this.toRaw(data);
        if (!this.isSupportedData(rawData) || !this.accepts(rawData)) {
            return false;
        }
        this.modelData = this.observe(rawData, []);
        if (!silent) {
            this.message(['change', 'set'], this.get());
        }
        return true;
    }
    /** Return all state or one object property, array index, or Map entry. */
    get(key) {
        if (arguments.length === 0) {
            return this.modelData;
        }
        if (this.isMap(this.modelData)) {
            return this.modelData.get(key);
        }
        if (Array.isArray(this.modelData)) {
            return Number.isInteger(key) ? this.modelData[key] : undefined;
        }
        if (typeof key === 'string' || typeof key === 'symbol' || typeof key === 'number') {
            return Reflect.get(this.modelData, typeof key === 'number' ? String(key) : key);
        }
        return undefined;
    }
    /**
     * Shallow-merge a plain-object root, or replace/merge one existing array or Map member.
     * Object form: update(partial, silent?). Collection form: update(keyOrIndex, value, silent?).
     */
    update(keyOrData, dataOrSilent, silent = false) {
        const raw = this.rawState();
        if (this.isPlainObject(raw)) {
            if (!this.isPlainObject(keyOrData) ||
                (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean') || arguments.length > 2) {
                return false;
            }
            const candidate = this.extend(raw, keyOrData);
            if (!this.accepts(candidate)) {
                return false;
            }
            if (!this.set(candidate, true)) {
                return false;
            }
            if (dataOrSilent !== true) {
                this.message(['change', 'update'], this.get());
            }
            return true;
        }
        if (arguments.length < 2) {
            return false;
        }
        const isMapState = this.isMap(raw);
        const hasItem = isMapState
            ? raw.has(keyOrData)
            : Number.isInteger(keyOrData) && keyOrData >= 0 && keyOrData < raw.length;
        if (!hasItem) {
            return false;
        }
        const current = isMapState ? raw.get(keyOrData) : raw[keyOrData];
        const nextValue = this.isPlainObject(current) && this.isPlainObject(dataOrSilent)
            ? this.extend(current, dataOrSilent)
            : this.toRaw(dataOrSilent);
        if (this.validator) {
            const candidate = isMapState ? new Map(raw) : raw.slice();
            if (isMapState) {
                candidate.set(keyOrData, nextValue);
            }
            else {
                candidate[keyOrData] = nextValue;
            }
            if (!this.accepts(candidate)) {
                return false;
            }
        }
        if (isMapState) {
            raw.set(keyOrData, nextValue);
        }
        else {
            raw[keyOrData] = nextValue;
        }
        if (!silent) {
            this.message(['change', 'update'], this.get());
        }
        return true;
    }
    /** Append array values or insert Map entries. Returns false for plain-object state. */
    push(key, dataOrSilent, silent = false) {
        const raw = this.rawState();
        if (Array.isArray(raw)) {
            if (arguments.length > 2 || (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean') || key === undefined) {
                return false;
            }
            const additions = [];
            if (Array.isArray(key)) {
                for (let index = 0; index < key.length; index += 1) {
                    additions.push(this.toRaw(key[index]));
                }
            }
            else {
                additions.push(this.toRaw(key));
            }
            if (this.validator && !this.accepts(raw.concat(additions))) {
                return false;
            }
            for (let index = 0; index < additions.length; index += 1) {
                raw.push(additions[index]);
            }
            if (dataOrSilent !== true) {
                this.message(['change', 'push'], this.get());
            }
            return true;
        }
        if (!this.isMap(raw)) {
            return false;
        }
        if (this.isMap(key)) {
            if (arguments.length > 2 || (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean')) {
                return false;
            }
            if (this.validator) {
                const candidate = new Map(raw);
                key.forEach((value, mapKey) => candidate.set(mapKey, this.toRaw(value)));
                if (!this.accepts(candidate)) {
                    return false;
                }
            }
            key.forEach((value, mapKey) => raw.set(mapKey, this.toRaw(value)));
            if (dataOrSilent !== true) {
                this.message(['change', 'push'], this.get());
            }
            return true;
        }
        if (arguments.length < 2) {
            return false;
        }
        const rawValue = this.toRaw(dataOrSilent);
        if (this.validator) {
            const candidate = new Map(raw);
            candidate.set(key, rawValue);
            if (!this.accepts(candidate)) {
                return false;
            }
        }
        raw.set(key, rawValue);
        if (!silent) {
            this.message(['change', 'push'], this.get());
        }
        return true;
    }
    /** Delete one property, array index, or Map entry. Use clear() to empty all state. */
    delete(key, silent = false) {
        const raw = this.rawState();
        const isMapState = this.isMap(raw);
        const isArrayState = Array.isArray(raw);
        if (isMapState) {
            if (!raw.has(key)) {
                return false;
            }
        }
        else if (isArrayState) {
            if (!Number.isInteger(key) || key < 0 || key >= raw.length) {
                return false;
            }
        }
        else if ((typeof key !== 'string' && typeof key !== 'symbol' && typeof key !== 'number') ||
            !Object.prototype.hasOwnProperty.call(raw, key)) {
            return false;
        }
        if (this.validator) {
            let candidate;
            if (isMapState) {
                candidate = new Map(raw);
                candidate.delete(key);
            }
            else if (isArrayState) {
                candidate = raw.slice();
                candidate.splice(key, 1);
            }
            else {
                candidate = this.extend(raw, null);
                Reflect.deleteProperty(candidate, typeof key === 'number' ? String(key) : key);
            }
            if (!this.accepts(candidate)) {
                return false;
            }
        }
        if (isMapState) {
            raw.delete(key);
        }
        else if (isArrayState) {
            raw.splice(key, 1);
        }
        else {
            Reflect.deleteProperty(raw, typeof key === 'number' ? String(key) : key);
        }
        if (!silent) {
            this.message(['change', 'delete'], this.get());
        }
        return true;
    }
    /** Clear all state while preserving its object, array, or Map shape. */
    clear(silent = false) {
        const raw = this.rawState();
        const empty = this.isMap(raw) ? new Map() : Array.isArray(raw) ? [] : {};
        this.modelData = this.observe(empty, []);
        if (!silent) {
            this.message(['change', 'clear'], this.get());
        }
        return true;
    }
    serviceGet() { return Promise.resolve({}); }
    servicePatch() { return Promise.resolve({}); }
    servicePost() { return Promise.resolve({}); }
    servicePut() { return Promise.resolve({}); }
}
module.exports = Model;
//# sourceMappingURL=model.js.map