(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['module', 'events', 'lodash'], factory);
    } else if (typeof exports !== "undefined") {
        factory(module, require('events'), require('lodash'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod, global.events, global.lodash);
        global.utilities = mod.exports;
    }
})(this, function (module, _events, _lodash) {
    'use strict';

    var _events2 = _interopRequireDefault(_events);

    var _lodash2 = _interopRequireDefault(_lodash);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    function _classCallCheck(instance, Constructor) {
        if (!(instance instanceof Constructor)) {
            throw new TypeError("Cannot call a class as a function");
        }
    }

    var _createClass = function () {
        function defineProperties(target, props) {
            for (var i = 0; i < props.length; i++) {
                var descriptor = props[i];
                descriptor.enumerable = descriptor.enumerable || false;
                descriptor.configurable = true;
                if ("value" in descriptor) descriptor.writable = true;
                Object.defineProperty(target, descriptor.key, descriptor);
            }
        }

        return function (Constructor, protoProps, staticProps) {
            if (protoProps) defineProperties(Constructor.prototype, protoProps);
            if (staticProps) defineProperties(Constructor, staticProps);
            return Constructor;
        };
    }();

    function _possibleConstructorReturn(self, call) {
        if (!self) {
            throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        }

        return call && (typeof call === "object" || typeof call === "function") ? call : self;
    }

    function _inherits(subClass, superClass) {
        if (typeof superClass !== "function" && superClass !== null) {
            throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
        }

        subClass.prototype = Object.create(superClass && superClass.prototype, {
            constructor: {
                value: subClass,
                enumerable: false,
                writable: true,
                configurable: true
            }
        });
        if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
    }

    (function (EventEmitter) {

        'use strict';

        /*
        UTILITIES
        */

        module.exports = function (_EventEmitter) {
            _inherits(_class, _EventEmitter);

            function _class(modelData) {
                _classCallCheck(this, _class);

                var _this = _possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this));

                // used for mediator messaging if in use
                _this.label = '';

                return _this;
            }

            _createClass(_class, [{
                key: 'isMap',
                value: function isMap(object) {
                    return _lodash2.default.isMap(object);
                }
            }, {
                key: 'isFinite',
                value: function isFinite(number) {
                    return _lodash2.default.isFinite(number);
                }
            }, {
                key: 'isPlainObject',
                value: function isPlainObject(object) {
                    return _lodash2.default.isPlainObject(object);
                }
            }, {
                key: 'pullAt',
                value: function pullAt(data, index) {
                    var i = void 0;
                    var newData = new Array();
                    for (i = 0; i < data.length; i++) {
                        if (i === index) {
                            continue;
                        }
                        newData.push(data[i]);
                    }
                    return newData;
                }
            }, {
                key: 'concat',
                value: function concat(data, value) {
                    return _lodash2.default.concat(data, value);
                }
            }, {
                key: 'extend',
                value: function extend(object1, object2) {
                    return _lodash2.default.extend(object1, object2);
                }
            }, {
                key: 'message',
                value: function message(messages, data) {

                    if (Array.isArray(messages), data) {

                        var i = void 0;
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
            }]);

            return _class;
        }(EventEmitter);
    })(_events2.default);
});
