#!/bin/bash
../node_modules/babel-cli/bin/babel.js ../src/index.js --out-file ../dist/index.js; ../node_modules/babel-cli/bin/babel.js ../src/utilities.js --out-file ../dist/utilities.js; ../node_modules/babel-cli/bin/babel.js ../src/collection.js --out-file ../dist/collection.js; ../node_modules/babel-cli/bin/babel.js ../src/model.js --out-file ../dist/model.js;
