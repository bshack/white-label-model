"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
/** @module src/utilities */
const events_1 = __importDefault(require("events"));
/*
UTILITIES
*/
/** Shared type guards, safe merges, and namespaced model events. */
class Utilities extends events_1.default {
    label = '';
    name = false;
    mediator = false;
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
    isMap(object) {
        return Object.prototype.toString.call(object) === '[object Map]';
    }
    /**
     * Accept finite numbers without coercing strings or other values.
     * @deprecated Use Number.isFinite directly; retained for compatibility.
     * @param number - Numeric value to inspect or format.
     * @returns Whether the value is a finite number.
     */
    isFinite(number) {
        return Number.isFinite(number);
    }
    /**
     * Accept ordinary objects and objects with a null prototype, including ordinary objects from another realm.
     * @param object - Value to inspect without coercion.
     * @returns Whether the value is a plain object.
     */
    isPlainObject(object) {
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
    /**
     * Remove one array member in place and return the original array.
     * @deprecated Use Array.prototype.splice directly; retained for compatibility.
     * @param data - Data supplied by the caller; validation follows the method contract.
     * @param index - Array position or Map key; omission selects the whole collection.
     * @returns The same array after removing one member.
     */
    pullAt(data, index) {
        data.splice(index, 1);
        return data;
    }
    /**
     * Create a shallow merge using enumerable own properties while blocking prototype-pollution keys.
     * The earlier source's prototype is retained so null-prototype state remains null-prototype state.
     * @param object1 - Earlier merge source; null is ignored.
     * @param object2 - Later merge source; null is ignored.
     * @returns A new merged object without blocked prototype keys.
     */
    extend(object1, object2) {
        // Copy only enumerable own, safe properties into a new object. In particular,
        // never treat attacker-controlled prototype keys as data or mutate
        // a caller-owned object while applying an update.
        const prototype = object1 ? Object.getPrototypeOf(object1) : Object.prototype;
        const result = Object.create(prototype);
        const blockedKeys = new Set(['__proto__', 'constructor', 'prototype']);
        [object1, object2].forEach((source) => {
            if (!source) {
                return;
            }
            Reflect.ownKeys(source).forEach((key) => {
                if ((typeof key !== 'string' || !blockedKeys.has(key)) &&
                    Object.prototype.propertyIsEnumerable.call(source, key)) {
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
    message(messages, data) {
        if (data) {
            for (const message of messages) {
                this.emit(message, data);
                if (this.name && this.mediator && this.mediator.emit) {
                    this.mediator.emit(this.label + ':' + this.name + ':' + message, data);
                }
            }
            return true;
        }
        else {
            return false;
        }
    }
}
;
module.exports = Utilities;
//# sourceMappingURL=utilities.js.map