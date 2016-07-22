import Utilities from './utilities';

((Utilities) => {

    'use strict';

    /*
    MODEL
    */

    module.exports = class extends Utilities {

        constructor(modelData) {

            super();

            // where the data is held for the model
            if (modelData && this.isPlainObject(modelData)) {
                this.set(modelData);
            } else {
                this.set(new Object());
            }

            this.label = 'model';

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
        set(data) {
            if (data && this.isPlainObject(data)) {
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

            if (updateData && this.isPlainObject(updateData)) {
                this.set(this.extend(this.get(), updateData));
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
        }

        //sub service request methods
        serviceGet() {

            return false;

        }

        servicePatch() {

            return false;

        }

        servicePost() {

            return false;

        }

        servicePut() {

            return false;

        }

    };

})(Utilities);
