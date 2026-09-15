/** @module src/utilities */

interface ApplicationMediator {
    dispatchEvent(event: Event): boolean;
}

/** Shared type guards, safe merges, and standards-based model events. */
class Utilities extends EventTarget {
    label = '';
    name: string | false = false;
    mediator: ApplicationMediator | false = false;
    #listenerController = new AbortController();

    /** Create an instance with its own state and listener lifecycle. */
    constructor() {
        super();
    }

    /**
     * Register a native listener owned by this instance's lifecycle.
     * Caller signals remain effective while destroy() can still release every owned listener.
     */
    override addEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: boolean | AddEventListenerOptions
    ): void {
        const settings = typeof options === 'boolean' ? {capture: options} : options ?? {};
        const lifecycleSignal = this.#listenerController.signal;
        const signal = settings.signal
            ? AbortSignal.any([settings.signal, lifecycleSignal])
            : lifecycleSignal;
        super.addEventListener(type, callback, {...settings, signal});
    }

    /** Normalize capture removal so supported Node runtimes match browser EventTarget behavior. */
    override removeEventListener(
        type: string,
        callback: EventListenerOrEventListenerObject | null,
        options?: boolean | EventListenerOptions
    ): void {
        const capture = typeof options === 'boolean' ? options : Boolean(options?.capture);
        super.removeEventListener(type, callback, {capture});
    }

    /** Release every locally owned listener while leaving the EventTarget reusable. */
    protected resetEventListeners(): void {
        this.#listenerController.abort();
        this.#listenerController = new AbortController();
    }

    /** Internal lifecycle hook retained for Model.destroy(). */
    protected removeAllListeners(): this {
        this.resetEventListeners();
        return this;
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

    /** Dispatch each local CustomEvent and, when configured, relay its detail through the application mediator. */
    message(messages: string[], data: unknown): boolean {
        if (data) {
            for (const message of messages) {
                this.dispatchEvent(new CustomEvent(message, {detail: data}));
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
