/** @module src/collection */
import Utilities = require('./utilities');




/** Array or Map storage with explicit mutation APIs. */
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
        this.clear(true);

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
     * Append array data or insert Map entries without legacy placeholder arguments.
     * Array form: push(valueOrValues, silent?). Map forms: push(key, value, silent?) or push(map, silent?).
     */
    push(key: unknown, dataOrSilent?: unknown, silent = false): boolean {

        const savedData = this.get();

        if (this.isMap(savedData)) {
            if (this.isMap(key)) {
                if (arguments.length > 2 || (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean')) {
                    return false;
                }
                key.forEach((value, mapKey) => savedData.set(mapKey, value));
                if (dataOrSilent !== true) this.message(['change', 'push'], this.get());
                return true;
            }

            if (arguments.length < 2) return false;
            savedData.set(key, dataOrSilent);
            if (!silent) this.message(['change', 'push'], this.get());
            return true;
        }

        if (!Array.isArray(savedData) || arguments.length > 2 ||
            (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean') ||
            this.isMap(key) || key === undefined) {
            return false;
        }

        const additions = Array.isArray(key) ? key : [key];
        const length = additions.length;
        for (let index = 0; index < length; index++) savedData.push(additions[index]);
        if (dataOrSilent !== true) this.message(['change', 'push'], this.get());
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
    private isModel(value: unknown): value is {get(): Record<string, unknown>; set(data: unknown, silent?: boolean): boolean; message(events: string[], data: unknown): unknown} {
        return typeof value === 'object' && value !== null && 'get' in value && typeof value.get === 'function' &&
            'set' in value && typeof value.set === 'function' && 'message' in value && typeof value.message === 'function';
    }

    // the updater
    /** Merge object fields or replace one existing collection member. Use set() to replace the whole collection. */
    update(index: unknown, updateData?: unknown, silent = false): boolean {

        const collection = this.get();
        if (index === undefined || updateData === undefined ||
            (!Array.isArray(collection) && !this.isMap(collection))) return false;

        const hasItem = this.isMap(collection)
            ? collection.has(index)
            : Number.isInteger(index) && (index as number) >= 0 && (index as number) < collection.length;
        if (!hasItem) return false;

        const item = this.get(index);
        if (this.isPlainObject(updateData) && this.isModel(item) && this.isPlainObject(item.get())) {
            if (item.set(this.extend(item.get(), updateData), true) !== true) return false;
            if (!silent) {
                item.message(['change', 'update'], item.get());
                this.message(['change', 'update'], this.get());
            }
            return true;
        }

        const value = this.isPlainObject(updateData) && this.isPlainObject(item)
            ? this.extend(item, updateData)
            : updateData;
        if (this.isMap(this.collectionData)) this.collectionData.set(index, value);
        else (this.collectionData as unknown[])[index as number] = value;
        if (!silent) this.message(['change', 'update'], this.get());
        return true;

    }

    // the clearer and deleter
    /** Clear all members while preserving the backing collection type. */
    clear(silent = false): boolean {
        this.collectionData = this.isMap(this.collectionData) ? new Map() : [];
        if (!silent) this.message(['change', 'delete'], this.get());
        return true;
    }

    /** Remove one member by array index or Map key. */
    delete(index: unknown, silent = false): boolean {
        if (Array.isArray(this.collectionData)) {
            if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= this.collectionData.length) return false;
            this.pullAt(this.collectionData, index as number);
        } else if (this.isMap(this.collectionData)) {
            if (!this.collectionData.has(index)) return false;
            this.collectionData.delete(index);
        } else {
            return false;
        }
        if (!silent) this.message(['change', 'delete'], this.get());
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

};



export = Collection;
