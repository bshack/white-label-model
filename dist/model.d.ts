/** @module src/model */
import Utilities = require('./utilities');
/** Supported root-state containers. */
type ModelData = Record<PropertyKey, unknown> | unknown[] | Map<unknown, unknown>;
/** Property-level mutation details emitted by deeply observable model state. */
interface ModelMutation<T extends ModelData> {
    operation: 'set' | 'delete' | 'clear';
    path: ReadonlyArray<unknown>;
    oldValue: unknown;
    newValue: unknown;
    state: T;
}
interface ModelEvents<T extends ModelData> {
    change: [state: T];
    mutate: [mutation: ModelMutation<T>];
    set: [state: T];
    update: [state: T];
    push: [state: T];
    delete: [state: T];
    clear: [state: T];
}
type ModelEventName<T extends ModelData> = keyof ModelEvents<T>;
type ModelEventArguments<T extends ModelData, Name extends ModelEventName<T>> = ModelEvents<T>[Name];
/** Mutable object, array, or Map state with synchronous change notifications. */
declare class Model<T extends ModelData = Record<string, unknown>> extends Utilities {
    modelData: T;
    validator: ((data: unknown) => boolean) | undefined;
    private readonly proxyTargets;
    /**
     * Create one observable state container for a plain object, array, or Map.
     * @param modelData - Initial state; omitted state defaults to an empty object.
     * @param validator - Optional whole-state validator for explicit set/update/push/delete operations.
     */
    constructor(modelData?: T, validator?: (data: unknown) => boolean);
    /** Start this instance and return it for lifecycle chaining. */
    initialize(): this;
    /** Release owned state and listeners so the instance can leave the application lifecycle. */
    destroy(): this;
    /** Return the raw target behind one of this model's observable proxies. */
    private toRaw;
    /** Return whether a value is a supported root-state container. */
    private isSupportedData;
    /** Return whether a nested value should participate in deep change tracking. */
    private isObservable;
    /** Prevent direct object writes from using prototype-pollution keys. */
    private isBlockedKey;
    /** Return the raw root container. */
    private rawState;
    /** Apply the optional validator to an explicit candidate state. */
    private accepts;
    /** Emit the existing full-state change event plus a path-specific mutation event. */
    private notifyMutation;
    /** Observe plain objects and arrays lazily along accessed branches. */
    private observeObject;
    /** Observe Map values and mutators without scanning unrelated entries. */
    private observeMap;
    /** Wrap one supported container lazily so mutations never require a full-tree scan. */
    private observe;
    /** Replace all model state. */
    set(data: unknown, silent?: boolean): boolean;
    get(): T;
    get(key: unknown): unknown;
    /**
     * Shallow-merge a plain-object root, or replace/merge one existing array or Map member.
     * Object form: update(partial, silent?). Collection form: update(keyOrIndex, value, silent?).
     */
    update(keyOrData: unknown, dataOrSilent?: unknown, silent?: boolean): boolean;
    /** Append array values or insert Map entries. Returns false for plain-object state. */
    push(key: unknown, dataOrSilent?: unknown, silent?: boolean): boolean;
    /** Delete one property, array index, or Map entry. Use clear() to empty all state. */
    delete(key: unknown, silent?: boolean): boolean;
    /** Clear all state while preserving its object, array, or Map shape. */
    clear(silent?: boolean): boolean;
    serviceGet(): Promise<{}>;
    servicePatch(): Promise<{}>;
    servicePost(): Promise<{}>;
    servicePut(): Promise<{}>;
}
/** Compile-time event contracts without adding runtime EventEmitter wrappers. */
interface Model<T extends ModelData = Record<string, unknown>> {
    on<Name extends ModelEventName<T>>(eventName: Name, listener: (...arguments_: ModelEventArguments<T, Name>) => void): this;
    once<Name extends ModelEventName<T>>(eventName: Name, listener: (...arguments_: ModelEventArguments<T, Name>) => void): this;
    addListener<Name extends ModelEventName<T>>(eventName: Name, listener: (...arguments_: ModelEventArguments<T, Name>) => void): this;
    off<Name extends ModelEventName<T>>(eventName: Name, listener: (...arguments_: ModelEventArguments<T, Name>) => void): this;
    removeListener<Name extends ModelEventName<T>>(eventName: Name, listener: (...arguments_: ModelEventArguments<T, Name>) => void): this;
    emit<Name extends ModelEventName<T>>(eventName: Name, ...arguments_: ModelEventArguments<T, Name>): boolean;
}
export = Model;
