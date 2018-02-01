import EventEmitter from 'events';
import _ from 'lodash';

((EventEmitter) => {

    'use strict';

    /*
    UTILITIES
    */

    module.exports = class extends EventEmitter {

        constructor(modelData) {

            super();

            // used for mediator messaging if in use
            this.label = '';

        }

        isMap(object) {
            return _.isMap(object);
        }

        isFinite(number) {
            return _.isFinite(number);
        }

        isPlainObject(object) {
            return _.isPlainObject(object);
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
            return _.concat(data, value);
        }

        extend(object1, object2) {
            return _.extend(object1, object2);
        }

        message(messages, data) {

            if (Array.isArray(messages), data) {

                let i;
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

    };

})(EventEmitter);
