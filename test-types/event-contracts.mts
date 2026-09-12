import {Model} from '../dist/index.js';

const model = new Model<{name: string; nested: {active: boolean}}>({
    name: 'Ada',
    nested: {active: true}
});

model.on('change', state => state.name.toUpperCase());
model.once('set', state => state.nested.active);
model.addListener('update', state => state.name);
model.off('update', state => state.name);
model.removeListener('change', state => state.name);
model.on('mutate', mutation => {
    mutation.operation;
    mutation.path;
    mutation.state.name;
});
model.emit('change', model.get());

// @ts-expect-error unknown model event names are rejected.
model.on('missing', () => {});
// @ts-expect-error change payloads must match the model state type.
model.emit('change', {name: 'Ada'});
// @ts-expect-error mutate payloads must use the mutation contract.
model.emit('mutate', 'invalid');
