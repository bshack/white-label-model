(function (global, factory) {
    if (typeof define === "function" && define.amd) {
        define(['module', './utilities'], factory);
    } else if (typeof exports !== "undefined") {
        factory(module, require('./utilities'));
    } else {
        var mod = {
            exports: {}
        };
        factory(mod, global.utilities);
        global.model = mod.exports;
    }
})(this, function (module, _utilities) {
    'use strict';

    var _utilities2 = _interopRequireDefault(_utilities);

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

    (function (Utilities) {

        'use strict';

        /*
        MODEL
        */

        module.exports = function (_Utilities) {
            _inherits(_class, _Utilities);

            function _class(modelData) {
                _classCallCheck(this, _class);

                var _this = _possibleConstructorReturn(this, (_class.__proto__ || Object.getPrototypeOf(_class)).call(this));

                // where the data is held for the model
                if (modelData && _this.isPlainObject(modelData)) {
                    _this.set(modelData);
                } else {
                    _this.set(new Object());
                }

                _this.label = 'model';

                // optionally add in a mediator when extended
                _this.mediator = false;

                // name for this model instance be used in mediator emit. Required on when using a mediator
                _this.name = false;

                return _this;
            }

            _createClass(_class, [{
                key: 'initialize',
                value: function initialize() {

                    return this;
                }
            }, {
                key: 'destroy',
                value: function destroy() {

                    //delete all the data
                    this.delete(true);

                    // remove all node events
                    this.removeAllListeners();

                    return this;
                }
            }, {
                key: 'set',
                value: function set(data, silent) {
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
            }, {
                key: 'get',
                value: function get() {
                    return this.modelData;
                }
            }, {
                key: 'update',
                value: function update(updateData, silent) {

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
            }, {
                key: 'delete',
                value: function _delete(silent) {
                    this.set({}, true);
                    if (!silent) {
                        this.message(['change', 'delete'], this.get());
                    }
                    return true;
                }
            }, {
                key: 'serviceGet',
                value: function serviceGet() {
                    return new Promise(function (resolve, reject) {
                        resolve({});
                    });
                }
            }, {
                key: 'servicePatch',
                value: function servicePatch() {
                    return new Promise(function (resolve, reject) {
                        resolve({});
                    });
                }
            }, {
                key: 'servicePost',
                value: function servicePost() {
                    return new Promise(function (resolve, reject) {
                        resolve({});
                    });
                }
            }, {
                key: 'servicePut',
                value: function servicePut() {
                    return new Promise(function (resolve, reject) {
                        resolve({});
                    });
                }
            }]);

            return _class;
        }(Utilities);
    })(_utilities2.default);
});
