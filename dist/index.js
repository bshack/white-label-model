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
        global.index = mod.exports;
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

    var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
        return typeof obj;
    } : function (obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj;
    };

    (function (EventEmitter, _) {

        'use strict';

        var utils = {

            isMap: function isMap(object) {
                return (typeof object === 'undefined' ? 'undefined' : _typeof(object)) === 'object' && Number.isFinite(object.size);
            },
            extend: function extend(object1, object2) {
                var key = void 0;
                for (key in object2) {
                    object1[key] = object2[key];
                }
                return object1;
            }

        };

        /*
        MODEL
        */

        var Model = function (_EventEmitter) {
            _inherits(Model, _EventEmitter);

            function Model(modelData) {
                _classCallCheck(this, Model);

                var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Model).call(this));

                // where the data is held for the model
                if (modelData && (typeof modelData === 'undefined' ? 'undefined' : _typeof(modelData)) === 'object') {
                    _this.set(modelData);
                } else {
                    _this.set(new Object());
                }

                // optionally add in a mediator when extended
                _this.mediator = false;

                // name for this model instance be used in mediator emit. Required on when using a mediator
                _this.name = false;

                return _this;
            }

            _createClass(Model, [{
                key: 'message',
                value: function message(messages, data) {

                    if (Array.isArray(messages), data) {

                        var i = void 0;
                        for (i = 0; i < messages.length; i++) {
                            this.emit(messages[i], data);
                            if (this.name && this.mediator && this.mediator.emit) {
                                this.mediator.emit('model:' + this.name + ':' + messages[i], data);
                            }
                        }

                        return true;
                    } else {

                        return false;
                    }
                }
            }, {
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
                key: 'set',
                value: function set(data) {
                    if (data && (typeof data === 'undefined' ? 'undefined' : _typeof(data)) === 'object') {
                        this.modelData = data;
                        this.message(['change', 'set'], this.get());
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
                value: function update(updateData) {

                    if (updateData && (typeof updateData === 'undefined' ? 'undefined' : _typeof(updateData)) === 'object') {
                        this.set(utils.extend(this.get(), updateData));
                        this.message(['change', 'update'], this.get());
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                key: 'delete',
                value: function _delete() {
                    this.set({});
                    this.message(['change', 'delete'], this.get());
                    return true;
                }
            }]);

            return Model;
        }(EventEmitter);

        /*
        Collection
        */

        var Collection = function (_EventEmitter2) {
            _inherits(Collection, _EventEmitter2);

            function Collection(collectionData) {
                _classCallCheck(this, Collection);

                var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(Collection).call(this));

                // where the data is held for the collection
                if (collectionData && (Array.isArray(collectionData) || utils.isMap(collectionData))) {
                    _this2.set(collectionData);
                } else {
                    _this2.set(new Array());
                }

                // optionally add in a mediator when extended
                _this2.mediator = false;

                // name for this model instance be used in mediator emit. Required on when using a mediator
                _this2.name = false;

                return _this2;
            }

            _createClass(Collection, [{
                key: 'message',
                value: function message(messages, data) {

                    if (Array.isArray(messages), data) {

                        var i = void 0;
                        for (i = 0; i < messages.length; i++) {
                            this.emit(messages[i], data);
                            if (this.name && this.mediator && this.mediator.emit) {
                                this.mediator.emit('collection:' + this.name + ':' + messages[i], data);
                            }
                        }

                        return true;
                    } else {

                        return false;
                    }
                }
            }, {
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
                key: 'set',
                value: function set(data) {

                    if (Array.isArray(data) || utils.isMap(data)) {
                        this.collectionData = data;
                        this.message(['change', 'set'], this.get());
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                key: 'push',
                value: function push(key, data) {

                    //get the data
                    var savedData = this.get();

                    // if we are adding one item to a Map
                    if (key && data) {
                        savedData.set(key, data);
                        this.set(savedData);
                        this.message(['change', 'push'], this.get());
                        return true;
                    } else {
                        data = key;
                    }

                    if (utils.isMap(data)) {
                        data.forEach(function (value, key) {
                            savedData.set(key, value);
                        });
                        this.set(savedData);
                        this.message(['change', 'push'], this.get());
                        return true;
                    } else if (data) {
                        this.set(_.concat(savedData, data));
                        this.message(['change', 'push'], this.get());
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                key: 'get',
                value: function get(index) {
                    if (index && utils.isMap(this.collectionData)) {
                        return this.collectionData.get(index);
                    } else if (Number.isFinite(index)) {
                        return this.collectionData[index];
                    } else {
                        return this.collectionData;
                    }
                }
            }, {
                key: 'update',
                value: function update(index, updateData) {

                    // if updating an item in the array or object
                    if (index !== undefined && updateData !== undefined && this.get(index) && (Array.isArray(this.get()) || utils.isMap(this.get()))) {

                        // if we are updating a model
                        if ((typeof updateData === 'undefined' ? 'undefined' : _typeof(updateData)) === 'object' && this.get(index).get && _typeof(this.get(index).get()) === 'object') {
                            this.get(index).set(utils.extend(this.get(index).get(), updateData));
                            this.get(index).message(['change', 'update'], this.get(index).get());
                            this.message(['change', 'update'], this.get());
                            return true;
                            // if we are updating a standard object
                        } else if ((typeof updateData === 'undefined' ? 'undefined' : _typeof(updateData)) === 'object' && _typeof(this.get(index)) === 'object') {
                                this.collectionData[index] = utils.extend(this.get(index), updateData);
                                this.message(['change', 'update'], this.get());
                                return true;
                            } else if (updateData) {
                                if (utils.isMap(this.collectionData)) {
                                    this.collectionData.set(index, updateData);
                                } else {
                                    this.collectionData[index] = updateData;
                                }
                                this.message(['change', 'update'], this.get());
                                return true;
                            }
                    } else if (Array.isArray(index) || utils.isMap(index)) {
                        this.set(index);
                        this.message(['change', 'update'], this.get());
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                key: 'delete',
                value: function _delete(index) {

                    if (index !== undefined) {

                        if (Array.isArray(this.get()) && this.get(index)) {
                            _.pullAt(this.collectionData, index);
                            this.message(['change', 'delete'], this.get());
                            return true;
                        } else if (utils.isMap(this.get()) && this.get(index)) {
                            this.collectionData.delete(index);
                            this.message(['change', 'delete'], this.get());
                            return true;
                        } else {
                            return false;
                        }
                    } else {
                        //keep the same data type
                        if (utils.isMap(this.get())) {
                            this.set(new Map());
                        } else {
                            this.set(new Array());
                        }
                        this.message(['change', 'delete'], this.get());
                        return true;
                    }
                }
            }]);

            return Collection;
        }(EventEmitter);

        module.exports = {
            Model: Model,
            Collection: Collection
        };
    })(_events2.default, _lodash2.default);
});
