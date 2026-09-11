/** @module src/collection */
import Utilities = require('./utilities');
/** Array or Map storage with explicit mutation APIs. */
declare class Collection extends Utilities {
    collectionData: unknown[] | Map<unknown, unknown>;
    /**
     * Create an instance with its own state and listener references.
     * @param collectionData - Initial array or Map storage.
     */
    constructor(collectionData?: unknown[] | Map<unknown, unknown>);
    /**
     * Start this instance and return it for lifecycle chaining.
     * @returns This instance for chaining.
     */
    initialize(): this;
    /**
     * Release owned state and listeners so the instance can leave the application lifecycle.
     * @returns This instance after cleanup.
     */
    destroy(): this;
    /**
     * Replace stored data when it has a supported shape; optionally suppress change notifications.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was accepted; false for an unsupported shape.
     */
    set(data: unknown, silent?: boolean): boolean;
    /**
     * Append array data or insert Map entries without legacy placeholder arguments.
     * Array form: push(valueOrValues, silent?). Map forms: push(key, value, silent?) or push(map, silent?).
     */
    push(key: unknown, dataOrSilent?: unknown, silent?: boolean): boolean;
    get(): unknown[] | Map<unknown, unknown>;
    get(index: unknown): unknown;
    /** Recognize model-like collection members without requiring a particular class. */
    private isModel;
    /** Merge object fields or replace one existing collection member. Use set() to replace the whole collection. */
    update(index: unknown, updateData?: unknown, silent?: boolean): boolean;
    /** Clear all members while preserving the backing collection type. */
    clear(silent?: boolean): boolean;
    /** Remove one member by array index or Map key. */
    delete(index: unknown, silent?: boolean): boolean;
    /**
     * Extension hook for a future GET transport; the default resolves an empty object without I/O.
     * @returns A promise resolving to an empty object; override to supply a transport.
     */
    serviceGet(): Promise<unknown>;
    /**
     * Extension hook for a future PATCH transport; the default resolves an empty object without I/O.
     * @returns A promise resolving to an empty object; override to supply a transport.
     */
    servicePatch(): Promise<unknown>;
    /**
     * Extension hook for a future POST transport; the default resolves an empty object without I/O.
     * @returns A promise resolving to an empty object; override to supply a transport.
     */
    servicePost(): Promise<unknown>;
    /**
     * Extension hook for a future PUT transport; the default resolves an empty object without I/O.
     * @returns A promise resolving to an empty object; override to supply a transport.
     */
    servicePut(): Promise<unknown>;
}
export = Collection;
