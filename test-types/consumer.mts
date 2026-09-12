import {Model} from '../dist/index.js';

const objectModel = new Model<{name: string}>({name: 'Ada'});
objectModel.update({name: 'Grace'});
const name: string | undefined = objectModel.get().name;

const arrayModel = new Model<unknown[]>([{name: 'Ada'}]);
arrayModel.push({name: 'Lin'});
arrayModel.update(0, {name: 'Grace'});

const mapModel = new Model<Map<string, unknown>>(new Map([['ada', {name: 'Ada'}]]));
mapModel.push('grace', {name: 'Grace'});
mapModel.update('ada', {name: 'Katherine'});

const validated = new Model<{name: string}>({name: 'Ada'}, value =>
    typeof value === 'object' && value !== null && typeof (value as {name?: unknown}).name === 'string'
);
validated.set({name: 'Katherine'});

void [name, arrayModel.get(), mapModel.get(), validated.get()];
