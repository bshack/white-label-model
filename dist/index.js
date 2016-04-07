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

    (function (EventEmitter, _) {

        'use strict';

        /*
        MODEL
        */

        var Model = function (_EventEmitter) {
            _inherits(Model, _EventEmitter);

            function Model(modelData) {
                _classCallCheck(this, Model);

                var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(Model).call(this));

                // where the data is held for the model
                if (modelData && _.isObject(modelData)) {
                    _this.set(modelData);
                } else {
                    _this.set({});
                }

                _this.initialize();

                return _this;
            }

            _createClass(Model, [{
                key: 'initialize',
                value: function initialize() {
                    return this;
                }
            }, {
                key: 'set',
                value: function set(data) {
                    if (data && _.isObject(data)) {
                        this.modelData = data;
                        this.emit('change', this.get());
                        this.emit('set', this.get());
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

                    if (updateData && _.isObject(updateData)) {
                        this.set(_.extend(this.get(), updateData));
                        this.emit('change', this.get());
                        this.emit('update', this.get());
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                key: 'delete',
                value: function _delete() {
                    this.set({});
                    this.emit('change', this.get());
                    this.emit('delete', this.get());
                    return true;
                }
            }]);

            return Model;
        }(EventEmitter);

        var Collection = function (_EventEmitter2) {
            _inherits(Collection, _EventEmitter2);

            function Collection(collectionData) {
                _classCallCheck(this, Collection);

                var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(Collection).call(this));

                // where the data is held for the collection
                if (collectionData && _.isArray(collectionData)) {
                    _this2.set(collectionData);
                } else {
                    _this2.set([]);
                }

                _this2.initialize();

                return _this2;
            }

            _createClass(Collection, [{
                key: 'initialize',
                value: function initialize() {

                    return this;
                }
            }, {
                key: 'set',
                value: function set(data) {

                    if (_.isArray(data)) {
                        this.collectionData = data;
                        this.emit('change', this.get());
                        this.emit('set', this.get());
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                key: 'push',
                value: function push(data) {
                    if (data) {
                        this.set(_.concat(this.get(), data));
                        this.emit('change', this.get());
                        this.emit('push', this.get());
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                key: 'get',
                value: function get(index) {
                    if (_.isNumber(index)) {
                        return this.collectionData[index];
                    } else {
                        return this.collectionData;
                    }
                }
            }, {
                key: 'update',
                value: function update(index, updateData) {
                    // if updating an item in the array
                    if (_.isNumber(index) && this.get(index)) {
                        // if we are updating a model
                        if (_.isObject(updateData) && this.get(index).get && _.isObject(this.get(index).get())) {
                            this.get(index).set(_.extend(this.get(index).get(), updateData));
                            this.get(index).emit('change', this.get(index).get());
                            this.get(index).emit('update', this.get(index).get());
                            this.emit('change', this.get());
                            this.emit('update', this.get());
                            return true;
                            // if we are updating a standard object
                        } else if (_.isObject(updateData) && _.isObject(this.get(index))) {
                                this.collectionData[index] = _.extend(this.get(index), updateData);
                                this.emit('change', this.get());
                                this.emit('update', this.get());
                                return true;
                            } else if (updateData) {
                                this.collectionData[index] = updateData;
                                this.emit('change', this.get());
                                this.emit('update', this.get());
                                return true;
                            } else {
                                return false;
                            }
                    } else if (_.isArray(index)) {
                        this.set(index);
                        this.emit('change', this.get());
                        this.emit('update', this.get());
                        return true;
                    } else {
                        return false;
                    }
                }
            }, {
                key: 'delete',
                value: function _delete(index) {
                    if (_.isNumber(index) && this.get(index)) {
                        _.pullAt(this.collectionData, index);
                        this.emit('change', this.get());
                        this.emit('delete', this.get());
                        return true;
                    } else if (!index) {
                        this.set([]);
                        this.emit('change', this.get());
                        this.emit('delete', this.get());
                        return true;
                    } else {
                        return false;
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
