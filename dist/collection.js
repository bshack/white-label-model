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
        global.collection = mod.exports;
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

        module.exports = function (_Utilities) {
            _inherits(_class, _Utilities);

            function _class(collectionData) {
                _classCallCheck(this, _class);

                var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(_class).call(this));

                // where the data is held for the collection
                if (collectionData && (Array.isArray(collectionData) || _this.isMap(collectionData))) {
                    _this.set(collectionData);
                } else {
                    _this.set(new Array());
                }

                _this.label = 'collection';

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

                    return this;
                }
            }, {
                key: 'serviceGet',
                value: function serviceGet() {

                    return false;
                }
            }, {
                key: 'servicePatch',
                value: function servicePatch() {

                    return false;
                }
            }, {
                key: 'servicePost',
                value: function servicePost() {

                    return false;
                }
            }, {
                key: 'servicePut',
                value: function servicePut() {

                    return false;
                }
            }, {
                key: 'set',
                value: function set(data, silent) {

                    if (Array.isArray(data) || this.isMap(data)) {
                        this.collectionData = data;
                        if (!silent) {
                            this.message(['change', 'set'], this.get());
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                key: 'push',
                value: function push(key, data, silent) {

                    //get the data
                    var savedData = this.get();

                    // if we are adding one item to a Map
                    if (key && data) {
                        savedData.set(key, data);
                        this.set(savedData, true);
                        if (!silent) {
                            this.message(['change', 'push'], this.get());
                        }
                        return true;
                    } else {
                        data = key;
                    }

                    if (this.isMap(data)) {
                        data.forEach(function (value, key) {
                            savedData.set(key, value);
                        });
                        this.set(savedData, true);
                        if (!silent) {
                            this.message(['change', 'push'], this.get());
                        }
                        return true;
                    } else if (data) {
                        this.set(this.concat(savedData, data), true);
                        if (!silent) {
                            this.message(['change', 'push'], this.get());
                        }
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                key: 'get',
                value: function get(index) {
                    if (index && this.isMap(this.collectionData)) {
                        return this.collectionData.get(index);
                    } else if (Number.isFinite(index)) {
                        return this.collectionData[index];
                    } else {
                        return this.collectionData;
                    }
                }
            }, {
                key: 'update',
                value: function update(index, updateData, silent) {

                    // if updating an item in the array or object
                    if (index !== undefined && updateData !== undefined && this.get(index) && (Array.isArray(this.get()) || this.isMap(this.get()))) {

                        // if we are updating a model
                        if (this.isPlainObject(updateData) && this.get(index).get && this.isPlainObject(this.get(index).get())) {
                            this.get(index).set(this.extend(this.get(index).get(), updateData));
                            if (!silent) {
                                this.get(index).message(['change', 'update'], this.get(index).get());
                                this.message(['change', 'update'], this.get());
                            }
                            return true;
                            // if we are updating a standard object
                        } else if (this.isPlainObject(updateData) && this.isPlainObject(this.get(index))) {
                            this.collectionData[index] = this.extend(this.get(index), updateData);
                            if (!silent) {
                                this.message(['change', 'update'], this.get());
                            }
                            return true;
                        } else if (updateData) {
                            if (this.isMap(this.collectionData)) {
                                this.collectionData.set(index, updateData);
                            } else {
                                this.collectionData[index] = updateData;
                            }
                            if (!silent) {
                                this.message(['change', 'update'], this.get());
                            }
                            return true;
                        }
                    } else if (Array.isArray(index) || this.isMap(index)) {
                        this.set(index, true);
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
                value: function _delete(index, silent) {

                    if (index !== undefined && index !== false) {

                        if (Array.isArray(this.get()) && this.get(index)) {
                            this.set(this.pullAt(this.collectionData, index), true);
                            if (!silent) {
                                this.message(['change', 'delete'], this.get());
                            }
                            return true;
                        } else if (this.isMap(this.get()) && this.get(index)) {
                            this.collectionData.delete(index);
                            if (!silent) {
                                this.message(['change', 'delete'], this.get());
                            }
                            return true;
                        } else {
                            return false;
                        }
                    } else {
                        //keep the same data type
                        if (this.isMap(this.get())) {
                            this.set(new Map(), true);
                        } else {
                            this.set(new Array(), true);
                        }
                        if (!silent) {
                            this.message(['change', 'delete'], this.get());
                        }
                        return true;
                    }
                }
            }]);

            return _class;
        }(Utilities);
    })(_utilities2.default);
});
