(function (global, factory) {
  if (typeof define === "function" && define.amd) {
    define(["./collection", "./model"], factory);
  } else if (typeof exports !== "undefined") {
    factory(require("./collection"), require("./model"));
  } else {
    var mod = {
      exports: {}
    };
    factory(global.collection, global.model);
    global.index = mod.exports;
  }
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : this, function (_collection, _model) {
  "use strict";

  _collection = _interopRequireDefault(_collection);
  _model = _interopRequireDefault(_model);
  function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
  module.exports = {
    Model: _model.default,
    Collection: _collection.default
  };
});