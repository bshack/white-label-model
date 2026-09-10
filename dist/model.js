"use strict";
/** @module src/model */
const Utilities = require("./utilities");
/*
MODEL
*/
/** Mutable plain-object state with synchronous change notifications. */
class Model extends Utilities {
    modelData = {};
    validator;
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
    // the setter
    /**
     * Replace stored data when it has a supported shape; optionally suppress change notifications.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was accepted; false for an unsupported shape.
     */
    set(data, silent = false) {
        if (data && this.isPlainObject(data) && (!this.validator || this.validator(data))) {
            this.modelData = data;
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
     * Return the stored data or the requested collection member without cloning it.
     * @returns The backing data container or the selected member.
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
        this.modelData = {};
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