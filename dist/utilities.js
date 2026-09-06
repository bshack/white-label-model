(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["events"], factory);
  } else if (typeof exports !== "undefined") {
    factory(require("events"));
  } else {
    var mod = {
      exports: {}
    };
    factory(global.events);
    global.utilities = mod.exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (_events) {
  "use strict";

  _events = _interopRequireDefault(_events);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  (EventEmitter => {
    'use strict';

    /*
    UTILITIES
    */
    module.exports = class extends EventEmitter {
      constructor(modelData) {
        super();

        // used for mediator messaging if in use
        this.label = '';
      }
      isMap(object) {
        return Object.prototype.toString.call(object) === '[object Map]';
      }
      isFinite(number) {
        return Number.isFinite(number);
      }
      isPlainObject(object) {
        if (Object.prototype.toString.call(object) !== '[object Object]') {
          return false;
        }
        const prototype = Object.getPrototypeOf(object);
        return prototype === null || prototype === Object.prototype;
      }
      pullAt(data, index) {
        data.splice(index, 1);
        return data;
      }
      extend(object1, object2) {
        // Copy only own, safe properties into a new object. In particular,
        // never treat attacker-controlled prototype keys as data or mutate
        // a caller-owned object while applying an update.
        const result = {};
        const blockedKeys = ['__proto__', 'constructor', 'prototype'];
        [object1, object2].forEach(source => {
          if (!source) {
            return;
          }
          Object.keys(source).forEach(key => {
            if (blockedKeys.indexOf(key) === -1) {
              result[key] = source[key];
            }
          });
        });
        return result;
      }
      message(messages, data) {
        if (Array.isArray(messages), data) {
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
  })(_events.default);
});