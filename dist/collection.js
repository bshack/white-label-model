"use strict";
/** @module src/collection */
const Utilities = require("./utilities");
/** Array or Map storage with the original positional mutation API. */
class Collection extends Utilities {
    collectionData = [];
    /**
     * Create an instance with its own state and listener references.
     * @param collectionData - Initial array or Map storage.
     */
    constructor(collectionData) {
        super();
        // where the data is held for the collection
        if (collectionData && (Array.isArray(collectionData) || this.isMap(collectionData))) {
            this.set(collectionData);
        }
        else {
            this.set(new Array());
        }
        this.label = 'collection';
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
        this.delete(false, true);
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
        if (Array.isArray(data) || this.isMap(data)) {
            this.collectionData = data;
            if (!silent) {
                this.message(['change', 'set'], this.get());
            }
            return true;
        }
        else {
            return false;
        }
    }
    // the pusher
    /**
     * Append array data or insert Map entries, preserving the backing container.
     * @param key - Map key or array data, according to the legacy positional API.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was appended; false when no usable data was supplied.
     */
    push(key, data, silent = false) {
        //get the data
        const savedData = this.get();
        // if we are adding one item to a Map
        if (key && data) {
            savedData.set(key, data);
            this.set(savedData, true);
            if (!silent) {
                this.message(['change', 'push'], this.get());
            }
            return true;
        }
        else {
            data = key;
        }
        if (this.isMap(data)) {
            data.forEach(function (value, key) {
                savedData.set(key, value);
            });
            this.set(savedData, true);
            if (!silent) {
                this.message(['change', 'push'], this.get());
            }
            return true;
        }
        else if (data) {
            const additions = Array.isArray(data) ? data : [data];
            // Capture the length so appending the collection to itself terminates.
            const length = additions.length;
            for (let index = 0; index < length; index++) {
                savedData.push(additions[index]);
            }
            if (!silent) {
                this.message(['change', 'push'], this.get());
            }
            return true;
        }
        else {
            return false;
        }
    }
    /**
     * Return the stored data or the requested collection member without cloning it.
     * @param index - Array position or Map key; omission selects the whole collection.
     * @returns The backing data container or the selected member.
     */
    get(index) {
        if (index && this.isMap(this.collectionData)) {
            return this.collectionData.get(index);
        }
        else if (this.isFinite(index)) {
            return this.collectionData[index];
        }
        else {
            return this.collectionData;
        }
    }
    /** Recognize model-like collection members without requiring a particular class. */
    isModel(value) {
        return typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function' &&
            'set' in value && typeof value.set === 'function' && 'message' in value && typeof value.message === 'function';
    }
    // the updater
    /**
     * Merge object fields or replace a collection member, retaining the existing mutation contract.
     * @param index - Array position or Map key; omission selects the whole collection.
     * @param updateData - New fields or replacement data.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when an update was applied; false when it could not be applied.
     */
    update(index, updateData, silent = false) {
        const item = this.get(index);
        // if updating an item in the array or object
        if (index !== undefined &&
            updateData !== undefined &&
            this.get(index) &&
            (Array.isArray(this.get()) || this.isMap(this.get()))) {
            // if we are updating a model
            if (this.isPlainObject(updateData) &&
                this.isModel(item) &&
                this.isPlainObject(item.get())) {
                if (item.set(this.extend(item.get(), updateData), true) === false) {
                    return false;
                }
                if (!silent) {
                    item.message(['change', 'update'], item.get());
                    this.message(['change', 'update'], this.get());
                }
                return true;
                // if we are updating a standard object
            }
            else if (this.isPlainObject(updateData) && this.isPlainObject(item)) {
                const updatedData = this.extend(item, updateData);
                if (this.isMap(this.collectionData)) {
                    this.collectionData.set(index, updatedData);
                }
                else {
                    this.collectionData[index] = updatedData;
                }
                if (!silent) {
                    this.message(['change', 'update'], this.get());
                }
                return true;
            }
            else if (updateData) {
                if (this.isMap(this.collectionData)) {
                    this.collectionData.set(index, updateData);
                }
                else {
                    this.collectionData[index] = updateData;
                }
                if (!silent) {
                    this.message(['change', 'update'], this.get());
                }
                return true;
            }
        }
        else if (Array.isArray(index) || this.isMap(index)) {
            this.set(index, true);
            if (!silent) {
                this.message(['change', 'update'], this.get());
            }
            return true;
        }
        else {
            return false;
        }
        return false;
    }
    // the deleter
    /**
     * Remove stored data and notify subscribers unless silent mode is requested.
     * @param index - Array position or Map key; omission selects the whole collection.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was removed or cleared; false for a missing member.
     */
    delete(index, silent = false) {
        if (index !== undefined && index !== false) {
            if (Array.isArray(this.get()) && this.get(index)) {
                this.set(this.pullAt(this.collectionData, index), true);
                if (!silent) {
                    this.message(['change', 'delete'], this.get());
                }
                return true;
            }
            else if (this.isMap(this.get()) && this.get(index)) {
                this.collectionData.delete(index);
                if (!silent) {
                    this.message(['change', 'delete'], this.get());
                }
                return true;
            }
            else {
                return false;
            }
        }
        else {
            //keep the same data type
            if (this.isMap(this.get())) {
                this.set(new Map(), true);
            }
            else {
                this.set(new Array(), true);
            }
            if (!silent) {
                this.message(['change', 'delete'], this.get());
            }
            return true;
        }
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
module.exports = Collection;
//# sourceMappingURL=collection.js.map