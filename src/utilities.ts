/** @module src/utilities */
import {EventEmitter as RuntimeEventEmitter} from 'events';

type EventName = string | symbol;
type EventListener = (...arguments_: unknown[]) => void;

interface EventEmitterApi {
    addListener(eventName: EventName, listener: EventListener): this;
    on(eventName: EventName, listener: EventListener): this;
    once(eventName: EventName, listener: EventListener): this;
    removeListener(eventName: EventName, listener: EventListener): this;
    off(eventName: EventName, listener: EventListener): this;
    removeAllListeners(eventName?: EventName): this;
    setMaxListeners(count: number): this;
    getMaxListeners(): number;
    listeners(eventName: EventName): EventListener[];
    rawListeners(eventName: EventName): EventListener[];
    emit(eventName: EventName, ...arguments_: unknown[]): boolean;
    listenerCount(eventName: EventName): number;
    prependListener(eventName: EventName, listener: EventListener): this;
    prependOnceListener(eventName: EventName, listener: EventListener): this;
    eventNames(): EventName[];
}

const EventEmitter: new () => EventEmitterApi = RuntimeEventEmitter;

interface ApplicationMediator {
    dispatchEvent(event: Event): boolean;
}



/*
UTILITIES
*/

/** Shared type guards, safe merges, and namespaced model events. */
class Utilities extends EventEmitter {
    label = '';
    name: string | false = false;
    mediator: ApplicationMediator | false = false;

    /** Create an instance with its own state and listener references. */
    constructor() {
        super();
        this.label = '';
    }

    /** Recognize native Map objects, including Maps created in another realm. */
    isMap(object: unknown): object is Map<unknown, unknown> {
        return Object.prototype.toString.call(object) === '[object Map]';
    }

    /** @deprecated Use Number.isFinite directly; retained for compatibility. */
    isFinite(number: unknown): number is number {
        return Number.isFinite(number);
    }

    /** Accept ordinary objects and objects with a null prototype, including ordinary objects from another realm. */
    isPlainObject(object: unknown): object is Record<string, unknown> {
        if (Object.prototype.toString.call(object) !== '[object Object]') {
            return false;
        }
        const prototype = Object.getPrototypeOf(object);
        if (prototype === null) {
            return true;
        }
        const constructor = Object.prototype.hasOwnProperty.call(prototype, 'constructor')
            ? prototype.constructor
            : undefined;
        return typeof constructor === 'function' &&
            Function.prototype.toString.call(constructor) === Function.prototype.toString.call(Object);
    }

    /** @deprecated Use Array.prototype.splice directly; retained for compatibility. */
    pullAt<T>(data: T[], index: number): T[] {
        data.splice(index, 1);
        return data;
    }

    /** Create a shallow merge using enumerable own properties while blocking prototype-pollution keys. */
    extend(object1: Record<string, unknown> | null, object2: Record<string, unknown> | null): Record<string, unknown> {
        const prototype = object1 ? Object.getPrototypeOf(object1) : Object.prototype;
        const result = Object.create(prototype) as Record<PropertyKey, unknown>;
        const blockedKeys = new Set(['__proto__', 'constructor', 'prototype']);

        [object1, object2].forEach((source) => {
            if (!source) {
                return;
            }

            Reflect.ownKeys(source).forEach((key) => {
                if ((typeof key !== 'string' || !blockedKeys.has(key)) &&
                    Object.prototype.propertyIsEnumerable.call(source, key)) {
                    result[key] = (source as Record<PropertyKey, unknown>)[key];
                }
            });
        });

        return result as Record<string, unknown>;
    }

    /** Emit each local event and, when configured, dispatch a namespaced application event for truthy data. */
    message(messages: string[], data: unknown): boolean {
        if (data) {
            for (const message of messages) {
                this.emit(message, data);
                if (this.name && this.mediator) {
                    this.mediator.dispatchEvent(new CustomEvent(
                        this.label + ':' + this.name + ':' + message,
                        {detail: data}
                    ));
                }
            }
            return true;
        }
        return false;
    }
}

export = Utilities;
