/** @module src/utilities */
import EventEmitter from 'events';
/** Shared type guards, safe merges, and namespaced model events. */
declare class Utilities extends EventEmitter {
    label: string;
    name: string | false;
    mediator: Pick<EventEmitter, 'emit'> | false;
    /**
     * Create an instance with its own state and listener references.
     */
    constructor();
    /**
     * Recognize native Map objects, including Maps created in another realm.
     * @param object - Value to inspect without coercion.
     * @returns Whether the value is a Map.
     */
    isMap(object: unknown): object is Map<unknown, unknown>;
    /**
     * Accept finite numbers without coercing strings or other values.
     * @param number - Numeric value to inspect or format.
     * @returns Whether the value is a finite number.
     */
    isFinite(number: unknown): number is number;
    /**
     * Accept ordinary objects and objects with a null prototype, excluding class instances.
     * @param object - Value to inspect without coercion.
     * @returns Whether the value is a plain object.
     */
    isPlainObject(object: unknown): object is Record<string, unknown>;
    /**
     * Remove one array member in place and return the original array.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @param index - Array position or Map key; omission selects the whole collection.
     * @returns The same array after removing one member.
     */
    pullAt<T>(data: T[], index: number): T[];
    /**
     * Create a shallow merge using enumerable own properties while blocking prototype-pollution keys.
     * The earlier source's prototype is retained so null-prototype state remains null-prototype state.
     * @param object1 - Earlier merge source; null is ignored.
     * @param object2 - Later merge source; null is ignored.
     * @returns A new merged object without blocked prototype keys.
     */
    extend(object1: Record<string, unknown> | null, object2: Record<string, unknown> | null): Record<string, unknown>;
    /**
     * Emit each local event and, when configured, a namespaced mediator event for truthy data.
     * @param messages - Event names to emit in order.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @returns False for falsey data; true after emitting the requested events.
     */
    message(messages: string[], data: unknown): boolean;
}
export = Utilities;
