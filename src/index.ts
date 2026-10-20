/**
 * Public entry point. Re-exports the Model class with listener signatures typed per event name, so
 * `event.detail` has the right type in `addEventListener` callbacks.
 */
import ModelImplementation = require('./model');

/** The state shapes a Model can hold: a plain object, an array, or a Map. */
type ModelData = Record<PropertyKey, unknown> | unknown[] | Map<unknown, unknown>;
/** Members whose implementation signatures are replaced by the typed versions below. */
type ModelEventMethod = 'addEventListener' | 'removeEventListener' | 'initialize' | 'destroy';

/** The `detail` of a `mutate` event, describing one direct write to nested state. */
interface ModelMutation<T extends ModelData> {
    /** `'set'` for assignments and definitions, `'delete'` for removals, `'clear'` for `Map#clear()`. */
    operation: 'set' | 'delete' | 'clear';
    /** Keys from the root to the written property (or to the cleared Map). */
    path: ReadonlyArray<unknown>;
    /** The previous value, or `undefined` if there was none. For `clear`, a copy of the Map before clearing. */
    oldValue: unknown;
    /** The new value, or `undefined` for `delete`. For `clear`, the now-empty Map. */
    newValue: unknown;
    /** The complete current state. */
    state: T;
}

/** Event names and the type of `event.detail` for each. */
interface ModelEvents<T extends ModelData> {
    change: T;
    mutate: ModelMutation<T>;
    set: T;
    update: T;
    push: T;
    delete: T;
    clear: T;
}

/** Any Model event name. */
type ModelEventName<T extends ModelData> = keyof ModelEvents<T>;
/** A listener for one Model event, receiving a `CustomEvent` with the matching `detail` type. */
type ModelEventListener<T extends ModelData, Name extends ModelEventName<T>> =
    ((event: CustomEvent<ModelEvents<T>[Name]>) => void) | EventListenerObject | null;

/** A Model instance holding state of type `T`. */
type Model<T extends ModelData = Record<string, unknown>> = Omit<ModelImplementation<T>, ModelEventMethod> & {
    addEventListener<Name extends ModelEventName<T>>(
        type: Name,
        callback: ModelEventListener<T, Name>,
        options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener<Name extends ModelEventName<T>>(
        type: Name,
        callback: ModelEventListener<T, Name>,
        options?: boolean | EventListenerOptions
    ): void;
    initialize(): Model<T>;
    destroy(): Model<T>;
};

/** Constructor signature: `new Model(data?, validator?)`. Throws `TypeError` for unsupported or rejected data. */
interface ModelConstructor {
    new <T extends ModelData = Record<string, unknown>>(
        modelData?: T,
        validator?: (data: unknown) => boolean
    ): Model<T>;
}

const Model = ModelImplementation as ModelConstructor;

export {Model};