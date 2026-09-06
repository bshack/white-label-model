(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["./utilities"], factory);
  } else if (typeof exports !== "undefined") {
    factory(require("./utilities"));
  } else {
    var mod = {
      exports: {}
    };
    factory(global.utilities);
    global.model = mod.exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (_utilities) {
  "use strict";

  _utilities = _interopRequireDefault(_utilities);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  (Utilities => {
    'use strict';

    /*
    MODEL
    */
    module.exports = class extends Utilities {
      constructor(modelData) {
        super();

        // where the data is held for the model
        if (modelData && this.isPlainObject(modelData)) {
          this.set(modelData);
        } else {
          this.set(new Object());
        }
        this.label = 'model';

        // optionally add in a mediator when extended
        this.mediator = false;

        // name for this model instance be used in mediator emit. Required on when using a mediator
        this.name = false;
      }
      initialize() {
        return this;
      }
      destroy() {
        //delete all the data
        this.delete(true);

        // remove all node events
        this.removeAllListeners();
        return this;
      }

      // the setter
      set(data, silent) {
        if (data && this.isPlainObject(data)) {
          this.modelData = data;
          if (!silent) {
            this.message(['change', 'set'], this.get());
          }
          return true;
        } else {
          return false;
        }
      }

      // the getter
      get() {
        return this.modelData;
      }

      // the updater
      update(updateData, silent) {
        if (updateData && this.isPlainObject(updateData)) {
          this.set(this.extend(this.get(), updateData), true);
          if (!silent) {
            this.message(['change', 'update'], this.get());
          }
          return true;
        } else {
          return false;
        }
      }

      // the deleter
      delete(silent) {
        this.set({}, true);
        if (!silent) {
          this.message(['change', 'delete'], this.get());
        }
        return true;
      }

      //sub service request methods
      serviceGet() {
        return new Promise((resolve, reject) => {
          resolve({});
        });
      }
      servicePatch() {
        return new Promise((resolve, reject) => {
          resolve({});
        });
      }
      servicePost() {
        return new Promise((resolve, reject) => {
          resolve({});
        });
      }
      servicePut() {
        return new Promise((resolve, reject) => {
          resolve({});
        });
      }
    };
  })(_utilities.default);
});