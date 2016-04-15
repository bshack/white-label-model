(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['module', 'events'], factory);
    } else if (typeof exports !== "undefined") {
        factory(module, require('events'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod, global.events);
        global.utilities = mod.exports;
    }
})(this, function (module, _events) {
    'use strict';

    var _events2 = _interopRequireDefault(_events);

    function _interopRequireDefault(obj) {
        return obj && obj.__esModule ? obj : {
            default: obj
        };
    }

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
    } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
    };

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

                var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(_class).call(this));

                // used for mediator messaging if in use
                _this.label = '';

                return _this;
            }

            _createClass(_class, [{
                key: 'isMap',
                value: function isMap(object) {
                    return (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && Number.isFinite(object.size);
                }
            }, {
                key: 'isPlainObject',
                value: function isPlainObject(object) {
                    return (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && !Number.isFinite(object.size) && !Array.isArray(object);
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
                    if (Array.isArray(value)) {
                        var i = void 0;
                        for (i = 0; i < value.length; i++) {
                            data.push(value[i]);
                        }
                    } else {
                        data.push(value);
                    }
                    return data;
                }
            }, {
                key: 'extend',
                value: function extend(object1, object2) {
                    var key = void 0;
                    for (key in object2) {
                        if (object2.hasOwnProperty(key)) {
                            object1[key] = object2[key];
                        }
                    }
                    return object1;
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
