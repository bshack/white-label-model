import EventEmitter from 'events';

((EventEmitter) => {

    'use strict';

    /*
    UTILITIES
    */

    const Utilities = class {

        isMap(object) {
            return (typeof object === 'object' && Number.isFinite(object.size))
        }

        isPlainObject(object) {
            return (typeof object === 'object' && !Number.isFinite(object.size)  && !Array.isArray(object))
        }

        pullAt(data, index) {
            let i;
            let newData = new Array();
            for (i = 0; i < data.length; i++) {
                if (i === index) {
                    continue;
                }
                newData.push(data[i]);
            }
            return newData;
        }

        concat(data, value) {
            if (Array.isArray(value)) {
                let i;
                for (i = 0; i < value.length; i++) {
                    data.push(value[i]);
                }
            } else {
                data.push(value);
            }
            return data;
        }

        extend(object1, object2) {
            let key;
            for (key in object2) {
                object1[key] = object2[key];
            }
            return object1;
        }

    }

    const utilities = new Utilities();

    /*
    MODEL
    */

    const Model = class extends EventEmitter {

        constructor(modelData) {

            super();

            // where the data is held for the model
            if (modelData && utilities.isPlainObject(modelData)) {
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
            if (data && utilities.isPlainObject(data)) {
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

            if (updateData && utilities.isPlainObject(updateData)) {
                this.set(utilities.extend(this.get(), updateData));
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
            if (collectionData && (Array.isArray(collectionData) || utilities.isMap(collectionData))) {
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

            if (Array.isArray(data) || utilities.isMap(data)) {
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

            if (utilities.isMap(data)) {
                data.forEach(function(value, key) {
                    savedData.set(key, value);
                });
                this.set(savedData);
                this.message(['change', 'push'], this.get());
                return true;
            } else if (data) {
                this.set(utilities.concat(savedData, data));
                this.message(['change', 'push'], this.get());
                return true;
            } else {
                return false;
            }

        };

        // the getter
        get(index) {
            if (index && utilities.isMap(this.collectionData)) {
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
                && (Array.isArray(this.get()) || utilities.isMap(this.get())))
            {

                // if we are updating a model
                if (utilities.isPlainObject(updateData)
                    && this.get(index).get
                    && utilities.isPlainObject(this.get(index).get())
                ) {
                    this.get(index).set(utilities.extend(this.get(index).get(), updateData));
                    this.get(index).message(['change', 'update'], this.get(index).get());
                    this.message(['change', 'update'], this.get());
                    return true;
                // if we are updating a standard object
            } else if (utilities.isPlainObject(updateData) && utilities.isPlainObject(this.get(index))) {
                    this.collectionData[index] = utilities.extend(this.get(index), updateData);
                    this.message(['change', 'update'], this.get());
                    return true;
                } else if (updateData) {
                    if (utilities.isMap(this.collectionData)) {
                        this.collectionData.set(index, updateData);
                    } else {
                        this.collectionData[index] = updateData;
                    }
                    this.message(['change', 'update'], this.get());
                    return true;
                }

            } else if (Array.isArray(index) || utilities.isMap(index)) {
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
                    this.set(utilities.pullAt(this.collectionData, index));
                    this.message(['change', 'delete'], this.get());
                    return true;
                } else if (utilities.isMap(this.get()) && this.get(index)) {
                    this.collectionData.delete(index);
                    this.message(['change', 'delete'], this.get());
                    return true;
                } else {
                    return false;
                }

            } else {
                //keep the same data type
                if (utilities.isMap(this.get())) {
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

})(EventEmitter);
