/** Unified observable state constructor for objects, arrays, and Maps. */
import ModelImplementation = require('./model');

type ModelData = Record<PropertyKey, unknown> | unknown[] | Map<unknown, unknown>;
type ModelEventMethod = 'on' | 'once' | 'addListener' | 'off' | 'removeListener' | 'emit';

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

type Model<T extends ModelData = Record<string, unknown>> = Omit<ModelImplementation<T>, ModelEventMethod> & {
    on<Name extends ModelEventName<T>>(
        eventName: Name,
        listener: (...arguments_: ModelEventArguments<T, Name>) => void
    ): Model<T>;
    once<Name extends ModelEventName<T>>(
        eventName: Name,
        listener: (...arguments_: ModelEventArguments<T, Name>) => void
    ): Model<T>;
    addListener<Name extends ModelEventName<T>>(
        eventName: Name,
        listener: (...arguments_: ModelEventArguments<T, Name>) => void
    ): Model<T>;
    off<Name extends ModelEventName<T>>(
        eventName: Name,
        listener: (...arguments_: ModelEventArguments<T, Name>) => void
    ): Model<T>;
    removeListener<Name extends ModelEventName<T>>(
        eventName: Name,
        listener: (...arguments_: ModelEventArguments<T, Name>) => void
    ): Model<T>;
    emit<Name extends ModelEventName<T>>(
        eventName: Name,
        ...arguments_: ModelEventArguments<T, Name>
    ): boolean;
};

interface ModelConstructor {
    new <T extends ModelData = Record<string, unknown>>(
        modelData?: T,
        validator?: (data: unknown) => boolean
    ): Model<T>;
}

const Model = ModelImplementation as ModelConstructor;

export {Model};
