"use strict";
/** @module src/model */
const Utilities = require("./utilities");
/** Mutable plain-object state with synchronous change notifications. */
class Model extends Utilities {
    modelData = {};
    validator;
    proxyTargets = new WeakMap();
    /**
     * Create an instance with its own state and listener references.
     * @param modelData - Initial plain-object fields.
     */
    constructor(modelData, validator) {
        super();
        this.validator = validator;
        // where the data is held for the model
        if (modelData && this.isPlainObject(modelData)) {
            this.set(modelData);
        }
        else {
            this.set(new Object());
        }
        this.label = 'model';
        // optionally add in a mediator when extended
        this.mediator = false;
        // name for this model instance be used in mediator emit. Required on when using a mediator
        this.name = false;
    }
    /**
     * Start this instance and return it for lifecycle chaining.
     * @returns This instance for chaining.
     */
    initialize() {
        return this;
    }
    /**
     * Release owned state and listeners so the instance can leave the application lifecycle.
     * @returns This instance after cleanup.
     */
    destroy() {
        //delete all the data
        this.delete(true);
        // remove all node events
        this.removeAllListeners();
        return this;
    }
    /** Return the raw object behind one of this model's observable proxies. */
    toRaw(value) {
        if (value && typeof value === 'object') {
            return this.proxyTargets.get(value) || value;
        }
        return value;
    }
    /** Return whether a nested value should participate in deep change tracking. */
    isObservable(value) {
        return Array.isArray(value) || this.isPlainObject(value);
    }
    /** Prevent direct proxy writes from bypassing the same dangerous keys blocked by update(). */
    isBlockedKey(property) {
        return typeof property === 'string' &&
            (property === '__proto__' || property === 'constructor' || property === 'prototype');
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
    /**
     * Wrap one object lazily so reads only proxy the branch being accessed.
     * No full-tree traversal or deep comparison occurs when state changes.
     */
    observe(value, path) {
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
    // the setter
    /**
     * Replace stored data when it has a supported shape; optionally suppress change notifications.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was accepted; false for an unsupported shape.
     */
    set(data, silent = false) {
        const rawData = this.toRaw(data);
        if (rawData && this.isPlainObject(rawData) && (!this.validator || this.validator(rawData))) {
            this.modelData = this.observe(rawData, []);
            if (!silent) {
                this.message(['change', 'set'], this.get());
            }
            return true;
        }
        else {
            return false;
        }
    }
    // the getter
    /**
     * Return deeply observable model data without cloning it.
     * Direct property writes and deletes emit change and mutate events.
     * @returns The observable backing data container.
     */
    get() {
        return this.modelData;
    }
    // the updater
    /**
     * Merge object fields or replace a collection member, retaining the existing mutation contract.
     * @param updateData - New fields or replacement data.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when an update was applied; false when it could not be applied.
     */
    update(updateData, silent = false) {
        if (updateData && this.isPlainObject(updateData)) {
            if (!this.set(this.extend(this.get(), updateData), true)) {
                return false;
            }
            if (!silent) {
                this.message(['change', 'update'], this.get());
            }
            return true;
        }
        else {
            return false;
        }
    }
    // the deleter
    /**
     * Remove stored data and notify subscribers unless silent mode is requested.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was removed or cleared; false for a missing member.
     */
    delete(silent = false) {
        // Clearing owned state must not be rejected by an acceptance validator.
        this.modelData = this.observe({}, []);
        if (!silent) {
            this.message(['change', 'delete'], this.get());
        }
        return true;
    }
    //sub service request methods
    /**
     * Extension hook for a future GET transport; the default resolves an empty object without I/O.
     * @returns A promise resolving to an empty object; override to supply a transport.
     */
    serviceGet() {
        return new Promise((resolve, reject) => {
            resolve({});
        });
    }
    /**
     * Extension hook for a future PATCH transport; the default resolves an empty object without I/O.
     * @returns A promise resolving to an empty object; override to supply a transport.
     */
    servicePatch() {
        return new Promise((resolve, reject) => {
            resolve({});
        });
    }
    /**
     * Extension hook for a future POST transport; the default resolves an empty object without I/O.
     * @returns A promise resolving to an empty object; override to supply a transport.
     */
    servicePost() {
        return new Promise((resolve, reject) => {
            resolve({});
        });
    }
    /**
     * Extension hook for a future PUT transport; the default resolves an empty object without I/O.
     * @returns A promise resolving to an empty object; override to supply a transport.
     */
    servicePut() {
        return new Promise((resolve, reject) => {
            resolve({});
        });
    }
}
;
module.exports = Model;
//# sourceMappingURL=model.js.map