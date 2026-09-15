import {Model} from '../dist/index.js';

const model = new Model<{name: string; nested: {active: boolean}}>({
    name: 'Ada',
    nested: {active: true}
});

const updateListener = (event: CustomEvent<{name: string; nested: {active: boolean}}>) => event.detail.name;

model.addEventListener('change', event => event.detail.name.toUpperCase());
model.addEventListener('set', event => event.detail.nested.active, {once: true});
model.addEventListener('update', updateListener);
model.removeEventListener('update', updateListener);
model.addEventListener('mutate', event => {
    event.detail.operation;
    event.detail.path;
    event.detail.state.name;
});
model.dispatchEvent(new CustomEvent('change', {detail: model.get()}));

// @ts-expect-error unknown model event names are rejected for typed listeners.
model.addEventListener('missing', () => {});
// @ts-expect-error change listeners receive the complete model state in CustomEvent.detail.
model.addEventListener('change', (_event: CustomEvent<{wrong: number}>) => {});
// @ts-expect-error mutate listeners receive the mutation detail contract.
model.addEventListener('mutate', (_event: CustomEvent<string>) => {});
