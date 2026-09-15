/** Unified observable state constructor for objects, arrays, and Maps. */
import ModelImplementation = require('./model');

type ModelData = Record<PropertyKey, unknown> | unknown[] | Map<unknown, unknown>;
type ModelEventMethod = 'addEventListener' | 'removeEventListener';

interface ModelMutation<T extends ModelData> {
    operation: 'set' | 'delete' | 'clear';
    path: ReadonlyArray<unknown>;
    oldValue: unknown;
    newValue: unknown;
    state: T;
}

interface ModelEvents<T extends ModelData> {
    change: T;
    mutate: ModelMutation<T>;
    set: T;
    update: T;
    push: T;
    delete: T;
    clear: T;
}

type ModelEventName<T extends ModelData> = keyof ModelEvents<T>;
type ModelEventListener<T extends ModelData, Name extends ModelEventName<T>> =
    ((event: CustomEvent<ModelEvents<T>[Name]>) => void) | EventListenerObject | null;

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
};

interface ModelConstructor {
    new <T extends ModelData = Record<string, unknown>>(
        modelData?: T,
        validator?: (data: unknown) => boolean
    ): Model<T>;
}

const Model = ModelImplementation as ModelConstructor;

export {Model};
