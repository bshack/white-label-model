/** @module src/model */
import Utilities = require('./utilities');
/** Mutable plain-object state with synchronous change notifications. */
declare class Model<T extends object = Record<string, unknown>> extends Utilities {
    modelData: Partial<T>;
    validator: ((data: unknown) => boolean) | undefined;
    private readonly proxyTargets;
    /**
     * Create an instance with its own state and listener references.
     * @param modelData - Initial plain-object fields.
     */
    constructor(modelData?: T, validator?: (data: unknown) => boolean);
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
    /** Return the raw object behind one of this model's observable proxies. */
    private toRaw;
    /** Return whether a nested value should participate in deep change tracking. */
    private isObservable;
    /** Prevent direct proxy writes from bypassing the same dangerous keys blocked by update(). */
    private isBlockedKey;
    /** Emit the existing full-state change event plus a path-specific mutation event. */
    private notifyMutation;
    /**
     * Wrap one object lazily so reads only proxy the branch being accessed.
     * No full-tree traversal or deep comparison occurs when state changes.
     */
    private observe;
    /**
     * Replace stored data when it has a supported shape; optionally suppress change notifications.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was accepted; false for an unsupported shape.
     */
    set(data: unknown, silent?: boolean): boolean;
    /**
     * Return deeply observable model data without cloning it.
     * Direct property writes and deletes emit change and mutate events.
     * @returns The observable backing data container.
     */
    get(): Partial<T>;
    /**
     * Merge object fields or replace a collection member, retaining the existing mutation contract.
     * @param updateData - New fields or replacement data.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when an update was applied; false when it could not be applied.
     */
    update(updateData: Partial<T>, silent?: boolean): boolean;
    /**
     * Remove stored data and notify subscribers unless silent mode is requested.
     * @param silent - Suppress mutation notifications when true.
     * @returns True when data was removed or cleared; false for a missing member.
     */
    delete(silent?: boolean): boolean;
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
export = Model;
