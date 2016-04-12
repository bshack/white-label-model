import EventEmitter from 'events';
import _ from 'lodash';

((EventEmitter, _) => {

    'use strict';

    const utils = {

        /*
        UTILS
        */

        isMap: function(object) {
            return (typeof object === 'object' && Number.isFinite(object.size))
        },
        extend: function(object1, object2) {
            let key;
            for (key in object2) {
                object1[key] = object2[key];
            }
            return object1;
        }

    };

    /*
    MODEL
    */

    const Model = class extends EventEmitter {

        constructor(modelData) {

            super();

            // where the data is held for the model
            if (modelData && typeof modelData === 'object') {
                this.set(modelData);
            } else {
                this.set(new Object());
            }

            // optionally add in a mediator when extended
            this.mediator = false;

            // name for this model instance be used in mediator emit. Required on when using a mediator
            this.name = false;

        }

        message(messages, data) {

            if (Array.isArray(messages), data) {

                let i;
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

        initialize() {

            return this;

        }

        destroy() {

            return this;

        }

        // the setter
        set(data) {
            if (data && typeof data === 'object') {
                this.modelData = data;
                this.message(['change', 'set'], this.get());
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
        update(updateData) {

            if (updateData && typeof updateData === 'object') {
                this.set(utils.extend(this.get(), updateData));
                this.message(['change', 'update'], this.get());
                return true;
            } else {
                return false;
            }

        }

        // the deleter
        delete() {
            this.set({});
            this.message(['change', 'delete'], this.get());
            return true;
        };

    };

    /*
    Collection
    */

    const Collection = class extends EventEmitter {

        constructor(collectionData) {

            super();

            // where the data is held for the collection
            if (collectionData && (Array.isArray(collectionData) || utils.isMap(collectionData))) {
                this.set(collectionData);
            } else {
                this.set(new Array());
            }

            // optionally add in a mediator when extended
            this.mediator = false;

            // name for this model instance be used in mediator emit. Required on when using a mediator
            this.name = false;

        }

        message(messages, data) {

            if (Array.isArray(messages), data) {

                let i;
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

        initialize() {

            return this;

        }

        destroy() {

            return this;

        }

        // the setter
        set(data) {

            if (Array.isArray(data) || utils.isMap(data)) {
                this.collectionData = data;
                this.message(['change', 'set'], this.get());
                return true;
            } else {
                return false;
            }

        };

        // the pusher
        push(key, data) {

            //get the data
            const savedData = this.get();

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
                data.forEach(function(value, key) {
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

        };

        // the getter
        get(index) {
            if (index && utils.isMap(this.collectionData)) {
                return this.collectionData.get(index);
            } else if (Number.isFinite(index)) {
                return this.collectionData[index];
            } else {
                return this.collectionData;
            }
        };

        // the updater
        update(index, updateData) {

            // if updating an item in the array or object
            if (index !== undefined
                && updateData !== undefined
                && this.get(index)
                && (Array.isArray(this.get()) || utils.isMap(this.get())))
            {

                // if we are updating a model
                if (typeof updateData === 'object' && this.get(index).get && typeof this.get(index).get() === 'object') {
                    this.get(index).set(utils.extend(this.get(index).get(), updateData));
                    this.get(index).message(['change', 'update'], this.get(index).get());
                    this.message(['change', 'update'], this.get());
                    return true;
                // if we are updating a standard object
                } else if (typeof updateData === 'object' && typeof this.get(index) === 'object') {
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

        };

        // the deleter
        delete(index) {

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

        };

    };

    module.exports = {
        Model: Model,
        Collection: Collection
    };

})(EventEmitter, _);
