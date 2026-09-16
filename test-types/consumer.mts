import {Model} from '../dist/index.js';

const objectModel = new Model<{name: string}>({name: 'Ada'});
objectModel.update({name: 'Grace'});
objectModel.mediator = new EventTarget();
const name: string | undefined = objectModel.get().name;
const batchResult: string = objectModel.batch(() => {
    objectModel.update({name: 'Katherine'});
    return 'done';
});

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

// @ts-expect-error primitive root state is not supported.
new Model<string>('Ada');
// @ts-expect-error validators must return a boolean.
new Model<{name: string}>({name: 'Ada'}, () => 'valid');
// @ts-expect-error mediator relays require the standards-based dispatchEvent contract.
objectModel.mediator = {emit() {return true;}};
// @ts-expect-error batch requires a callback.
objectModel.batch('not a callback');

void [name, batchResult, arrayModel.get(), mapModel.get(), validated.get()];
