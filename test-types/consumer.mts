import {Model, Collection} from '../dist/index.js';
const model = new Model<{name: string}>({name: 'Ada'});
model.update({name: 'Grace'});
const name: string | undefined = model.get().name;
const collection = new Collection([model]);
collection.push(new Model({name: 'Lin'}));
void [name, collection.get()];
