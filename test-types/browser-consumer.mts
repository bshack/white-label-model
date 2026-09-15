import {Model} from '../dist/index.js';

const model = new Model<{name: string}>({name: 'Ada'});
model.addEventListener('change', event => {
    const name: string = event.detail.name;
    void name;
});
model.mediator = new EventTarget();

void model.get();
