'use strict';
const fs = require('node:fs');

function update(file, transform) {
    const before = fs.readFileSync(file, 'utf8');
    const after = transform(before);
    if (after === before) throw new Error(`Expected compatibility changes were not found in ${file}`);
    fs.writeFileSync(file, after);
}

update('src/collection.ts', source => {
    source = source.replace('/** Array or Map storage with the original positional mutation API. */', '/** Array or Map storage with explicit mutation APIs. */');
    source = source.replace('        this.delete(false, true);', '        this.clear(true);');

    const pushStart = source.indexOf('    // the pusher');
    const pushEnd = source.indexOf('    // the getter');
    if (pushStart < 0 || pushEnd < 0) throw new Error('Collection push block not found');
    const push = `    // the pusher\n    /**\n     * Append array data or insert Map entries without legacy placeholder arguments.\n     * Array form: push(valueOrValues, silent?). Map forms: push(key, value, silent?) or push(map, silent?).\n     */\n    push(key: unknown, dataOrSilent?: unknown, silent = false): boolean {\n\n        const savedData = this.get();\n\n        if (this.isMap(savedData)) {\n            if (this.isMap(key)) {\n                if (arguments.length > 2 || (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean')) {\n                    return false;\n                }\n                key.forEach((value, mapKey) => savedData.set(mapKey, value));\n                if (dataOrSilent !== true) this.message(['change', 'push'], this.get());\n                return true;\n            }\n\n            if (arguments.length < 2) return false;\n            savedData.set(key, dataOrSilent);\n            if (!silent) this.message(['change', 'push'], this.get());\n            return true;\n        }\n\n        if (!Array.isArray(savedData) || arguments.length > 2 ||\n            (dataOrSilent !== undefined && typeof dataOrSilent !== 'boolean') ||\n            this.isMap(key) || key === undefined) {\n            return false;\n        }\n\n        const additions = Array.isArray(key) ? key : [key];\n        const length = additions.length;\n        for (let index = 0; index < length; index++) savedData.push(additions[index]);\n        if (dataOrSilent !== true) this.message(['change', 'push'], this.get());\n        return true;\n\n    }\n\n`;
    source = source.slice(0, pushStart) + push + source.slice(pushEnd);

    source = source.replace(
        'private isModel(value: unknown): value is {get(): Record<string, unknown>; set(data: unknown, silent?: boolean): unknown; message(events: string[], data: unknown): unknown}',
        'private isModel(value: unknown): value is {get(): Record<string, unknown>; set(data: unknown, silent?: boolean): boolean; message(events: string[], data: unknown): unknown}'
    );

    const updateStart = source.indexOf('    // the updater');
    const updateEnd = source.indexOf('    // the deleter');
    if (updateStart < 0 || updateEnd < 0) throw new Error('Collection update block not found');
    const updater = `    // the updater\n    /** Merge object fields or replace one existing collection member. Use set() to replace the whole collection. */\n    update(index: unknown, updateData?: unknown, silent = false): boolean {\n\n        const collection = this.get();\n        if (index === undefined || updateData === undefined ||\n            (!Array.isArray(collection) && !this.isMap(collection))) return false;\n\n        const hasItem = this.isMap(collection)\n            ? collection.has(index)\n            : Number.isInteger(index) && (index as number) >= 0 && (index as number) < collection.length;\n        if (!hasItem) return false;\n\n        const item = this.get(index);\n        if (this.isPlainObject(updateData) && this.isModel(item) && this.isPlainObject(item.get())) {\n            if (item.set(this.extend(item.get(), updateData), true) !== true) return false;\n            if (!silent) {\n                item.message(['change', 'update'], item.get());\n                this.message(['change', 'update'], this.get());\n            }\n            return true;\n        }\n\n        const value = this.isPlainObject(updateData) && this.isPlainObject(item)\n            ? this.extend(item, updateData)\n            : updateData;\n        if (this.isMap(this.collectionData)) this.collectionData.set(index, value);\n        else (this.collectionData as unknown[])[index as number] = value;\n        if (!silent) this.message(['change', 'update'], this.get());\n        return true;\n\n    }\n\n`;
    source = source.slice(0, updateStart) + updater + source.slice(updateEnd);

    const deleteStart = source.indexOf('    // the deleter');
    const deleteEnd = source.indexOf('    //sub service request methods');
    if (deleteStart < 0 || deleteEnd < 0) throw new Error('Collection delete block not found');
    const deleter = `    // the clearer and deleter\n    /** Clear all members while preserving the backing collection type. */\n    clear(silent = false): boolean {\n        this.collectionData = this.isMap(this.collectionData) ? new Map() : [];\n        if (!silent) this.message(['change', 'delete'], this.get());\n        return true;\n    }\n\n    /** Remove one member by array index or Map key. */\n    delete(index: unknown, silent = false): boolean {\n        if (Array.isArray(this.collectionData)) {\n            if (!Number.isInteger(index) || (index as number) < 0 || (index as number) >= this.collectionData.length) return false;\n            this.pullAt(this.collectionData, index as number);\n        } else if (this.isMap(this.collectionData)) {\n            if (!this.collectionData.has(index)) return false;\n            this.collectionData.delete(index);\n        } else {\n            return false;\n        }\n        if (!silent) this.message(['change', 'delete'], this.get());\n        return true;\n    }\n\n`;
    return source.slice(0, deleteStart) + deleter + source.slice(deleteEnd);
});

update('test/model.test.js', source => source
    .split(', false, true)').join(', true)')
    .split('modelColors.update([').join('modelColors.set([')
    .split('modelColors.update(new Map').join('modelColors.set(new Map')
    .split('modelColors.delete(false, true)').join('modelColors.clear(true)')
    .split('modelColors.delete()').join('modelColors.clear()'));

update('test/review-regressions.test.js', source => {
    const oldVoid = `test('void-returning model-like setters remain accepted and receive silence', () => {\n    const child = {data: {count: 1}, get() {return this.data;}, set(data, silent) {assert.equal(silent, true); this.data = data;}, message() {}};\n    assert.equal(new Collection([child]).update(0, {count: 2}), true);\n    assert.equal(child.data.count, 2);\n});`;
    const newVoid = `test('model-like setters must explicitly accept nested updates', () => {\n    const accepted = {data: {count: 1}, get() {return this.data;}, set(data, silent) {assert.equal(silent, true); this.data = data; return true;}, message() {}};\n    assert.equal(new Collection([accepted]).update(0, {count: 2}), true);\n    assert.equal(accepted.data.count, 2);\n    const legacyVoid = {data: {count: 1}, get() {return this.data;}, set() {}, message() {}};\n    assert.equal(new Collection([legacyVoid]).update(0, {count: 2}), false);\n    assert.equal(legacyVoid.data.count, 1);\n});`;
    if (!source.includes(oldVoid)) throw new Error('Void-return compatibility test not found');
    source = source.replace(oldVoid, newVoid);
    source = source.replace("test('push respects backing type while preserving legacy silent placeholders', () => {", "test('push uses explicit current signatures and rejects legacy silent placeholders', () => {");
    source = source.replace("    assert.equal(array.push(['a', 'b'], false, true), true);", "    assert.equal(array.push(['legacy'], false, true), false);\n    assert.equal(array.push(['a', 'b'], true), true);");
    source = source.replace("    assert.equal(map.push(new Map([['a', 1], ['b', 2]]), false, true), true);", "    assert.equal(map.push(new Map([['legacy', 9]]), false, true), false);\n    assert.equal(map.push(new Map([['a', 1], ['b', 2]]), true), true);");
    source = source.replace("    assert.equal(map.delete(''), true);\n    assert.equal(map.get().has(''), false);", "    assert.equal(map.delete(''), true);\n    assert.equal(map.get().has(''), false);\n    assert.equal(map.delete(false), true);\n    assert.equal(map.get().has(false), false);");
    return source;
});

update('README.md', source => {
    source = source
        .replace('| `push(value, placeholder, silent)` | Adds one value or an array of values to an array collection. Use `false` as the placeholder when passing `silent`. | `change`, `push` |', '| `push(value, silent)` | Adds one value or an array of values to an array collection. | `change`, `push` |')
        .replace('| `push(map, placeholder, silent)` | Adds every entry from another `Map`. Use `false` as the placeholder when passing `silent`. | `change`, `push` |', '| `push(map, silent)` | Adds every entry from another `Map`. | `change`, `push` |')
        .replace('| `update(collection, placeholder, silent)` | Replaces all data with an array or `Map`. Leave the placeholder undefined when passing `silent`. | `change`, `update` |\n', '')
        .replace('| `delete(false, silent)` | Clears the collection while preserving array/map type. | `change`, `delete` |', '| `clear(silent)` | Clears the collection while preserving array/map type. | `change`, `delete` |')
        .replace('tasks.update([], undefined, true);', 'tasks.set([], true);')
        .replace('tasks.push({id: 4, complete: false}, false, true);', 'tasks.push({id: 4, complete: false}, true);')
        .replace('Collections preserve the existing array/Map API and expose unknown members until callers narrow them.', 'Collections expose unknown members until callers narrow them.')
        .replace('An explicit `false` from the child setter rejects the update; a void return remains supported.', 'Nested model-like setters must return `true` to accept an update; `false` or `undefined` rejects it.');
    const marker = '## Install and import\n';
    if (!source.includes(marker)) throw new Error('README install marker not found');
    return source.replace(marker,
        '## Versioning policy\n\nBackward compatibility is not maintained through placeholder arguments, sentinel values, deprecated overloads, or permissive legacy return contracts. Breaking public API changes are communicated with a Semantic Versioning major release and migration notes.\n\n### Version 4 migration\n\nArray `push` now uses `push(valueOrValues, silent?)`; bulk Map `push` uses `push(map, silent?)`. The legacy `false` placeholder forms are rejected. Whole-collection replacement uses `set()` rather than the former `update(collection, placeholder, silent)` overload. Clearing uses `clear(silent?)`; `delete()` now always removes one member, so `false` is a valid Map key. Model-like nested setters must return `true` to accept updates. No compatibility shims are retained.\n\n' + marker
    );
});

update('package.json', source => {
    const data = JSON.parse(source);
    if (data.version !== '3.1.0') throw new Error(`Unexpected package version ${data.version}`);
    data.version = '4.0.0';
    return JSON.stringify(data, null, 2) + '\n';
});
