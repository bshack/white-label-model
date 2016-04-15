import EventEmitter from 'events';

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
                if (object2.hasOwnProperty(key)) {
                    object1[key] = object2[key];
                }
            }
            return object1;
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
