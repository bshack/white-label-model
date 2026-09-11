/** @module src/collection */
import Utilities = require('./utilities');




/** Array or Map storage with the original positional mutation API. */
class Collection extends Utilities {
    collectionData: unknown[] | Map<unknown, unknown> = [];

    /**
     * Create an instance with its own state and listener references.
     * @param collectionData - Initial array or Map storage.
     */
    constructor(collectionData?: unknown[] | Map<unknown, unknown>) {

        super();

        // where the data is held for the collection
        if (collectionData && (Array.isArray(collectionData) || this.isMap(collectionData))) {
            this.set(collectionData);
        } else {
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
    set(data: unknown, silent = false): boolean {

        if (Array.isArray(data) || this.isMap(data)) {
            this.collectionData = data;
            if (!silent) {
                this.message(['change', 'set'], this.get());
            }
            return true;
        } else {
            return false;
        }

    }

    // the pusher
    /**
     * Append array data or insert Map entries, preserving the backing container.
     * @param key - Map key or array data, according to the legacy positional API.
     * @param data - Map value, or the legacy false placeholder used before the silent argument.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was appended; false when no usable data was supplied.
     */
    push(key: unknown, data?: unknown, silent = false): boolean {

        const savedData = this.get();

        if (this.isMap(savedData)) {
            // Preserve the legacy push(map, false, silent) overload as well as push(map).
            if (this.isMap(key) && (data === undefined || data === false)) {
                key.forEach(function(value, mapKey) {
                    savedData.set(mapKey, value);
                });
                if (!silent) {
                    this.message(['change', 'push'], this.get());
                }
                return true;
            }

            if (data !== undefined) {
                savedData.set(key, data);
                if (!silent) {
                    this.message(['change', 'push'], this.get());
                }
                return true;
            }

            return false;
        }

        // Array callers historically pass false as a placeholder before the silent flag.
        if ((data !== undefined && data !== false) || this.isMap(key) || key === undefined) {
            return false;
        }

        const additions = Array.isArray(key) ? key : [key];
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

    // the getter
    get(): unknown[] | Map<unknown, unknown>;
    get(index: unknown): unknown;
    /**
     * Return the stored data or the requested collection member without cloning it.
     * @param index - Array position or Map key; omission selects the whole collection.
     * @returns The backing data container or the selected member.
     */
    get(index?: unknown): unknown {
        if (index !== undefined && this.isMap(this.collectionData)) {
            return this.collectionData.get(index);
        } else if (this.isFinite(index)) {
            return (this.collectionData as unknown[])[index];
        } else {
            return this.collectionData;
        }
    }

    /** Recognize model-like collection members without requiring a particular class. */
    private isModel(value: unknown): value is {get(): Record<string, unknown>; set(data: unknown, silent?: boolean): unknown; message(events: string[], data: unknown): unknown} {
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
    update(index: unknown, updateData?: unknown, silent = false): boolean {

        const collection = this.get();
        if (index !== undefined &&
            updateData !== undefined &&
            (Array.isArray(collection) || this.isMap(collection))) {

            const hasItem = this.isMap(collection)
                ? collection.has(index)
                : Number.isInteger(index) && (index as number) >= 0 && (index as number) < collection.length;

            if (!hasItem) {
                return false;
            }

            const item = this.get(index);

            // if we are updating a model
            if (this.isPlainObject(updateData) &&
                this.isModel(item) &&
                this.isPlainObject(item.get())
            ) {
                if (item.set(this.extend(item.get(), updateData), true) === false) {
                    return false;
                }
                if (!silent) {
                    item.message(['change', 'update'], item.get());
                    this.message(['change', 'update'], this.get());
                }
                return true;
                // if we are updating a standard object
            } else if (this.isPlainObject(updateData) && this.isPlainObject(item)) {
                const updatedData = this.extend(item, updateData);
                if (this.isMap(this.collectionData)) {
                    this.collectionData.set(index, updatedData);
                } else {
                    (this.collectionData as unknown[])[index as number] = updatedData;
                }
                if (!silent) {
                    this.message(['change', 'update'], this.get());
                }
                return true;
            } else {
                if (this.isMap(this.collectionData)) {
                    this.collectionData.set(index, updateData);
                } else {
                    (this.collectionData as unknown[])[index as number] = updateData;
                }
                if (!silent) {
                    this.message(['change', 'update'], this.get());
                }
                return true;
            }

        } else if (Array.isArray(index) || this.isMap(index)) {
            this.set(index, true);
            if (!silent) {
                this.message(['change', 'update'], this.get());
            }
            return true;
        } else {
            return false;
        }

    }

    // the deleter
    /**
     * Remove stored data and notify subscribers unless silent mode is requested.
     * @param index - Array position or Map key; omission selects the whole collection.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was removed or cleared; false for a missing member.
     */
    delete(index?: unknown, silent = false): boolean {

        if (index !== undefined && index !== false) {

            if (Array.isArray(this.collectionData)) {
                if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= this.collectionData.length) {
                    return false;
                }
                this.pullAt(this.collectionData, index as number);
                if (!silent) {
                    this.message(['change', 'delete'], this.get());
                }
                return true;
            } else if (this.isMap(this.collectionData)) {
                if (!this.collectionData.has(index)) {
                    return false;
                }
                this.collectionData.delete(index);
                if (!silent) {
                    this.message(['change', 'delete'], this.get());
                }
                return true;
            }

        } else {
            //keep the same data type
            if (this.isMap(this.get())) {
                this.set(new Map(), true);
            } else {
                this.set(new Array(), true);
            }
            if (!silent) {
                this.message(['change', 'delete'], this.get());
            }
            return true;
        }

        return false;

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

};



export = Collection;
