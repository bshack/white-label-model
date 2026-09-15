import {Model} from '../dist/index.js';

type Profile = {name: string; nested: {active: boolean}};

const model = new Model<Profile>({
    name: 'Ada',
    nested: {active: true}
});

const updateListener = (event: CustomEvent<Profile>) => event.detail.name;

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

const initialized = new Model<Profile>({
    name: 'Grace',
    nested: {active: false}
}).initialize();
initialized.addEventListener('change', event => event.detail.name.toUpperCase());
initialized.addEventListener('update', updateListener);
initialized.removeEventListener('update', updateListener);

const reused = initialized.destroy();
reused.addEventListener('set', event => event.detail.nested.active);

// @ts-expect-error unknown model event names are rejected for typed listeners.
model.addEventListener('missing', () => {});
// @ts-expect-error change listeners receive the complete model state in CustomEvent.detail.
model.addEventListener('change', (_event: CustomEvent<{wrong: number}>) => {});
// @ts-expect-error mutate listeners receive the mutation detail contract.
model.addEventListener('mutate', (_event: CustomEvent<string>) => {});
