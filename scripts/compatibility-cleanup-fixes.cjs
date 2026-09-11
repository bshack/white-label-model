'use strict';
const fs = require('node:fs');

function replace(file, from, to) {
    const before = fs.readFileSync(file, 'utf8');
    if (!before.includes(from)) throw new Error(`Expected text not found in ${file}: ${from}`);
    fs.writeFileSync(file, before.split(from).join(to));
}

replace('test/model.test.js', 'mediatorCollectionTest.delete();', 'mediatorCollectionTest.clear();');
replace('test/security.test.js', "collection.push('green', undefined, true)", "collection.push('green', true)");
replace('test/security.test.js', "collection.push(['blue', 'yellow'], undefined, true)", "collection.push(['blue', 'yellow'], true)");
