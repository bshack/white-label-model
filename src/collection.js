import Utilities from './utilities';

((Utilities) => {

    'use strict';

    module.exports = class extends Utilities {

        constructor(collectionData) {

            super();

            // where the data is held for the collection
            if (collectionData && (Array.isArray(collectionData) || this.isMap(collectionData))) {
                this.set(collectionData);
            } else {
                this.set(new Array());
            }

            this.label = 'collection';

            // optionally add in a mediator when extended
            this.mediator = false;

            // name for this model instance be used in mediator emit. Required on when using a mediator
            this.name = false;

        }

        initialize() {

            return this;

        }

        destroy() {

            return this;

        }

        // the setter
        set(data, silent) {

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

        // the pusher
        push(key, data, silent) {

            //get the data
            const savedData = this.get();

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
                data.forEach(function(value, key) {
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

        // the getter
        get(index) {
            if (index && this.isMap(this.collectionData)) {
                return this.collectionData.get(index);
            } else if (Number.isFinite(index)) {
                return this.collectionData[index];
            } else {
                return this.collectionData;
            }
        }

        // the updater
        update(index, updateData, silent) {

            // if updating an item in the array or object
            if (index !== undefined &&
                updateData !== undefined &&
                this.get(index) &&
                (Array.isArray(this.get()) || this.isMap(this.get()))) {

                // if we are updating a model
                if (this.isPlainObject(updateData) &&
                    this.get(index).get &&
                    this.isPlainObject(this.get(index).get())
                ) {
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

        // the deleter
        delete(index, silent) {

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

        //sub service request methods
        serviceGet() {
            return new Promise((resolve, reject) => {
                resolve({});
            });
        }

        servicePatch() {
            return new Promise((resolve, reject) => {
                resolve({});
            });
        }

        servicePost() {
            return new Promise((resolve, reject) => {
                resolve({});
            });
        }

        servicePut() {
            return new Promise((resolve, reject) => {
                resolve({});
            });
        }

    };


})(Utilities);
