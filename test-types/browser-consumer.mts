import {Model} from '../dist/index.js';

const model = new Model<{name: string}>({name: 'Ada'});
model.on('change', state => {
    const name: string = state.name;
    void name;
});
model.mediator = new EventTarget();

void model.get();
