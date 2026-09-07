/** @module src/utilities */
import EventEmitter from 'events';




/*
UTILITIES
*/

/** Shared type guards, safe merges, and namespaced model events. */
class Utilities extends EventEmitter {
    label = '';
    name: string | false = false;
    mediator: Pick<EventEmitter, 'emit'> | false = false;

    /**
     * Create an instance with its own state and listener references.
     */
    constructor() {

        super();

        // used for mediator messaging if in use
        this.label = '';

    }

    /**
     * Recognize native Map objects, including Maps created in another realm.
     * @param object - Value to inspect without coercion.
     * @returns Whether the value is a Map.
     */
    isMap(object: unknown): object is Map<unknown, unknown> {
        return Object.prototype.toString.call(object) === '[object Map]';
    }

    /**
     * Accept finite numbers without coercing strings or other values.
     * @param number - Numeric value to inspect or format.
     * @returns Whether the value is a finite number.
     */
    isFinite(number: unknown): number is number {
        return Number.isFinite(number);
    }

    /**
     * Accept ordinary objects and objects with a null prototype, excluding class instances.
     * @param object - Value to inspect without coercion.
     * @returns Whether the value is a plain object.
     */
    isPlainObject(object: unknown): object is Record<string, unknown> {
        if (Object.prototype.toString.call(object) !== '[object Object]') {
            return false;
        }
        const prototype = Object.getPrototypeOf(object);
        return prototype === null || prototype === Object.prototype;
    }

    /**
     * Remove one array member in place and return the original array.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @param index - Array position or Map key; omission selects the whole collection.
     * @returns The same array after removing one member.
     */
    pullAt<T>(data: T[], index: number): T[] {
        data.splice(index, 1);
        return data;
    }

    /**
     * Create a shallow merge using own properties while blocking prototype-pollution keys.
     * @param object1 - Earlier merge source; null is ignored.
     * @param object2 - Later merge source; null is ignored.
     * @returns A new merged object without blocked prototype keys.
     */
    extend(object1: Record<string, unknown> | null, object2: Record<string, unknown> | null): Record<string, unknown> {
        // Copy only own, safe properties into a new object. In particular,
        // never treat attacker-controlled prototype keys as data or mutate
        // a caller-owned object while applying an update.
        const result: Record<string, unknown> = {};
        const blockedKeys = ['__proto__', 'constructor', 'prototype'];

        [object1, object2].forEach((source) => {
            if (!source) {
                return;
            }

            Object.keys(source).forEach((key) => {
                if (blockedKeys.indexOf(key) === -1) {
                    result[key] = source[key];
                }
            });
        });

        return result;
    }

    /**
     * Emit each local event and, when configured, a namespaced mediator event for truthy data.
     * @param messages - Event names to emit in order.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @returns False for falsey data; true after emitting the requested events.
     */
    message(messages: string[], data: unknown): boolean {

        if (data) {

            let i;
            for (i = 0; i < messages.length; i++) {
                this.emit(messages[i], data);
                if (this.name && this.mediator && this.mediator.emit) {
                    this.mediator.emit(this.label + ':' + this.name + ':' + messages[i], data);
                }
            }

            return true;

        } else {

            return false;

        }

    }

};


export = Utilities;
