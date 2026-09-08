import {Model, Collection} from '../dist/index.js';
const model = new Model<{name: string}>({name: 'Ada'});
const validated = new Model<{name: string}>({name: 'Ada'}, value =>
    typeof value === 'object' && value !== null && typeof (value as {name?: unknown}).name === 'string'
);
validated.set({name: 'Katherine'});
model.update({name: 'Grace'});
const name: string | undefined = model.get().name;
const collection = new Collection([model]);
collection.push(new Model({name: 'Lin'}));
void [name, collection.get(), validated.get()];
