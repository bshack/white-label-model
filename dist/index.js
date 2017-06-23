(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['module', './collection', './model', 'babel-polyfill'], factory);
    } else if (typeof exports !== "undefined") {
        factory(module, require('./collection'), require('./model'), require('babel-polyfill'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod, global.collection, global.model, global.babelPolyfill);
        global.index = mod.exports;
    }
})(this, function (module, _collection, _model) {
    'use strict';

    var _collection2 = _interopRequireDefault(_collection);

    var _model2 = _interopRequireDefault(_model);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    module.exports = {
        Model: _model2.default,
        Collection: _collection2.default
    };
});
