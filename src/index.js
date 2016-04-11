import EventEmitter from 'events';
import _ from 'lodash';

((EventEmitter, _) => {

    'use strict';

    /*
    MODEL
    */

    const Model = class extends EventEmitter {

        constructor(modelData) {

            super();

            // where the data is held for the model
            if (modelData && _.isObject(modelData)) {
                this.set(modelData);
            } else {
                this.set(new Object());
            }

        }

        initialize() {
            return this;
        }

        // the setter
        set(data) {
            if (data && _.isObject(data)) {
                this.modelData = data;
                this.emit('change', this.get());
                this.emit('set', this.get());
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

            if (updateData && _.isObject(updateData)) {
                this.set(_.extend(this.get(), updateData));
                this.emit('change', this.get());
                this.emit('update', this.get());
                return true;
            } else {
                return false;
            }

        }

        // the deleter
        delete() {
            this.set({});
            this.emit('change', this.get());
            this.emit('delete', this.get());
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
            if (collectionData && (_.isArray(collectionData) || _.isMap(collectionData))) {
                this.set(collectionData);
            } else {
                this.set(new Array());
            }

        }

        initialize() {

            return this;

        }

        // the setter
        set(data) {

            if (_.isArray(data) || _.isMap(data)) {
                this.collectionData = data;
                this.emit('change', this.get());
                this.emit('set', this.get());
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
                this.emit('change', this.get());
                this.emit('push', this.get());
                return true;
            } else {
                data = key;
            }

            if (_.isMap(data)) {
                data.forEach(function(value, key) {
                    savedData.set(key, value);
                });
                this.set(savedData);
                this.emit('change', this.get());
                this.emit('push', this.get());
                return true;
            } else if (data) {
                this.set(_.concat(savedData, data));
                this.emit('change', this.get());
                this.emit('push', this.get());
                return true;
            } else {
                return false;
            }

        };

        // the getter
        get(index) {
            if (index && _.isMap(this.collectionData)) {
                return this.collectionData.get(index);
            } else if (_.isNumber(index)) {
                return this.collectionData[index];
            } else {
                return this.collectionData;
            }
        };

        // the updater
        update(index, updateData) {
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

        };

        // the deleter
        delete(index) {
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
        };

    };

    module.exports = {
        Model: Model,
        Collection: Collection
    };

})(EventEmitter, _);
