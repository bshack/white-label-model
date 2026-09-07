/** @module src/collection */
import Utilities = require('./utilities');
/** Array or Map storage with the original positional mutation API. */
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
     * Append array data or insert Map entries, preserving the backing container.
     * @param key - Map key or array data, according to the legacy positional API.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was appended; false when no usable data was supplied.
     */
    push(key: unknown, data?: unknown, silent?: boolean): boolean;
    get(): unknown[] | Map<unknown, unknown>;
    get(index: unknown): unknown;
    /** Recognize model-like collection members without requiring a particular class. */
    private isModel;
    /**
     * Merge object fields or replace a collection member, retaining the existing mutation contract.
     * @param index - Array position or Map key; omission selects the whole collection.
     * @param updateData - New fields or replacement data.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when an update was applied; false when it could not be applied.
     */
    update(index: unknown, updateData?: unknown, silent?: boolean): boolean;
    /**
     * Remove stored data and notify subscribers unless silent mode is requested.
     * @param index - Array position or Map key; omission selects the whole collection.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was removed or cleared; false for a missing member.
     */
    delete(index?: unknown, silent?: boolean): boolean;
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
