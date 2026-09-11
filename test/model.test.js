'use strict';

const assert = require('node:assert/strict');
const {describe, it, beforeEach, afterEach, mock} = require('node:test');
const {isDeepStrictEqual} = require('node:util');

afterEach(() => mock.restoreAll());

const WhiteLabelModel = require('../dist/index');

// canary
describe("A suite", function() {
    it("contains spec with an expectation", function() {
        assert.equal(true, true);
    });
});





describe("White Label Model module", function() {
    const Model = WhiteLabelModel.Model;
    const Collection = WhiteLabelModel.Collection;
    it("has a Model function defined", function() {
        assert.ok(typeof WhiteLabelModel.Model === 'function');
    });
    it("has a Collection function defined", function() {
        assert.ok(typeof WhiteLabelModel.Collection === 'function');
    });
});





describe("A Model", function() {
    let callback, initCallback;
    const Model = WhiteLabelModel.Model;
    let modelColor;
    let modelColorChange;
    beforeEach(function() {
        callback = mock.fn();
        initCallback = mock.fn();
        const ModelTest = class extends Model {
            initialize() {
                initCallback();
                return this;
            }
            extendedFunction() {
            }
        };
        modelColor = new ModelTest();
    });
    afterEach(function() {
        callback = undefined;
        initCallback = undefined;
    });
    it("is an object", function() {
        assert.ok(modelColor instanceof Object);
    });
    it("is has an modelData object", function() {
        assert.ok(modelColor.modelData instanceof Object);
    });
    it("is has an initialize function", function() {
        assert.ok(typeof modelColor.initialize === 'function');
    });
    it("is has a set function", function() {
        assert.ok(typeof modelColor.set === 'function');
    });
    it("is has a get function", function() {
        assert.ok(typeof modelColor.get === 'function');
    });
    it("is has an update function", function() {
        assert.ok(typeof modelColor.update === 'function');
    });
    it("is has an delete function", function() {
        assert.ok(typeof modelColor.delete === 'function');
    });
    it("is has an destroy function", function() {
        assert.ok(typeof modelColor.destroy === 'function');
    });
    it("is does not have a mediator setup", function() {
        assert.deepEqual(modelColor.mediator, false);
    });
    it("is does not have a name defined", function() {
        assert.deepEqual(modelColor.name, false);
    });
    it("calls initialize function", function() {
        modelColor.initialize();
        assert.ok(initCallback.mock.callCount() > 0);
    });
    it("calls initialize function and returns 'this'", function() {
        let modelColor = new Model();
        let result = modelColor.initialize();
        assert.ok(result instanceof Object);
    });
    it("will save data in the model at instantiation", function() {
        modelColor = new Model({
            name: 'red'
        });
        assert.deepEqual(modelColor.modelData.name, 'red');
    });
    it("will save data in the model using set", function() {
        let setReturns = modelColor.set({
            name: 'red'
        });
        assert.deepEqual(modelColor.modelData.name, 'red');
        assert.deepEqual(setReturns, true);
    });
    it("will save data in the model using set and passing silent argument", function() {
        let setReturns = modelColor.set({
            name: 'red'
        }, true);
        assert.deepEqual(modelColor.modelData.name, 'red');
        assert.deepEqual(setReturns, true);
    });
    it("will save data in the model using set and emit set event", function() {
        modelColor.on('set', callback);
        let setReturns = modelColor.set({
            name: 'red'
        });
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Object));
    });
    it("will save data in the model using set and will not emit set event when passing the silent argument", function() {
        modelColor.on('set', callback);
        let setReturns = modelColor.set({
            name: 'red'
        }, true);
        assert.equal(callback.mock.calls.some(call =>
            call.arguments.length === 1 && call.arguments[0] instanceof Object), false);
    });
    it("will save data in the model using set and emit change event", function() {
        modelColor.on('change', callback);
        let setReturns = modelColor.set({
            name: 'red'
        });
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Object));
    });
    it("will not save data in the model using set when no data is passed in", function() {
        let setReturns = modelColor.set();
        assert.deepEqual(modelColor.modelData, {});
        assert.deepEqual(setReturns, false);
    });
    it("will retrieve data in the model using get", function() {
        modelColor.set({
            name: 'red'
        });
        var redColorData = modelColor.get();
        assert.deepEqual(redColorData.name, 'red');
    });
    it("will update data in the model using update", function() {
        modelColor.set({
            name: 'red'
        });
        let updateReturns = modelColor.update({
            name: 'blue',
            isPrimaryColor: true
        });
        let updateReturnsEmpty = modelColor.update();
        assert.deepEqual(modelColor.get(), {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.deepEqual(updateReturns, true);
        assert.deepEqual(updateReturnsEmpty, false);
    });
    it("will update data in the model using update and passing silent argument", function() {
        modelColor.set({
            name: 'red'
        });
        let updateReturns = modelColor.update({
            name: 'blue',
            isPrimaryColor: true
        }, true);
        let updateReturnsEmpty = modelColor.update();
        assert.deepEqual(modelColor.get(), {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.deepEqual(updateReturns, true);
        assert.deepEqual(updateReturnsEmpty, false);
    });
    it("will update data in the model using update and emit update event", function() {
        modelColor.on('update', callback);
        modelColor.set({
            name: 'red'
        });
        let updateReturns = modelColor.update({
            name: 'blue',
            isPrimaryColor: true
        });
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Object));
    });
    it("will update data in the model using update and not emit update event when passing slient argument", function() {
        modelColor.on('update', callback);
        modelColor.set({
            name: 'red'
        });
        let updateReturns = modelColor.update({
            name: 'blue',
            isPrimaryColor: true
        }, true);
        assert.equal(callback.mock.calls.some(call =>
            call.arguments.length === 1 && call.arguments[0] instanceof Object), false);
    });
    it("will update data in the model using update and emit change event", function() {
        modelColor.on('change', callback);
        modelColor.set({
            name: 'red'
        });
        let updateReturns = modelColor.update({
            name: 'blue',
            isPrimaryColor: true
        });
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Object));
    });
    it("will remove the data from the model using delete", function() {
        modelColor.set({
            name: 'red'
        });
        let deleteReturns = modelColor.delete();
        assert.deepEqual(modelColor.get(), {});
        assert.deepEqual(deleteReturns, true);
    });
    it("will remove the data from the model using delete when passing silent argument", function() {
        modelColor.set({
            name: 'red'
        });
        let deleteReturns = modelColor.delete(true);
        assert.deepEqual(modelColor.get(), {});
        assert.deepEqual(deleteReturns, true);
    });
    it("will remove data in the model using delete and emit delete event", function() {
        modelColor.on('delete', callback);
        modelColor.set({
            name: 'red'
        });
        let deleteReturns = modelColor.delete();
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Object));
    });
    it("will remove data in the model using delete and emit delete event when passing silent argument", function() {
        modelColor.on('delete', callback);
        modelColor.set({
            name: 'red'
        });
        let deleteReturns = modelColor.delete(true);
        assert.equal(callback.mock.calls.some(call =>
            call.arguments.length === 1 && call.arguments[0] instanceof Object), false);
    });
    it("will remove data in the model using delete and emit change event", function() {
        modelColor.on('change', callback);
        modelColor.set({
            name: 'red'
        });
        let deleteReturns = modelColor.delete();
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Object));
    });
    it("will return 'this' object when destroy is called", function() {
        let destroyReturns = modelColor.destroy();
        assert.ok(destroyReturns instanceof Object);
    });
    it("can be extended", function() {
        assert.ok(typeof modelColor.extendedFunction === 'function');
    });
    it("will save data in the model using set and emit set event with mediator", function() {
        //fake mediator
        let mediator = new function() {
            this.emit = function(message, data) {}
        };
        mock.method(mediator, 'emit');
        const MediatorModelTest = class extends Model {
            constructor() {
                super();
                // optionally add in a mediator when extended
                this.mediator = mediator;
                // name for this model instance be used in mediator emit. Required on when using a mediator
                this.name = 'test-mediator-1';
            }
        };
        const mediatorModelTest = new MediatorModelTest();
        mediatorModelTest.set({
            name: 'red'
        });
        assert.ok(mediator.emit.mock.calls.some(call =>
            isDeepStrictEqual(call.arguments, ['model:test-mediator-1:set', {
            name: 'red'
        }])));
        assert.ok(mediator.emit.mock.calls.some(call =>
            isDeepStrictEqual(call.arguments, ['model:test-mediator-1:change', {
            name: 'red'
        }])));
    });
    it("will update data in the model using update and emit change event with mediator", function() {
        //fake mediator
        let mediator = new function() {
            this.emit = function(message, data) {}
        };
        mock.method(mediator, 'emit');
        const MediatorModelTest = class extends Model {
            constructor() {
                super();
                // optionally add in a mediator when extended
                this.mediator = mediator;
                // name for this model instance be used in mediator emit. Required on when using a mediator
                this.name = 'test-mediator-1';
            }
        };
        const mediatorModelTest = new MediatorModelTest();
        mediatorModelTest.set({
            name: 'red'
        });
        mediatorModelTest.update({
            name: 'blue',
            isPrimaryColor: true
        });
        assert.ok(mediator.emit.mock.calls.some(call =>
            isDeepStrictEqual(call.arguments, ['model:test-mediator-1:update', {
            name: 'blue',
            isPrimaryColor: true
        }])));
        assert.ok(mediator.emit.mock.calls.some(call =>
            isDeepStrictEqual(call.arguments, ['model:test-mediator-1:change', {
            name: 'blue',
            isPrimaryColor: true
        }])));
    });
    it("will remove data in the model using delete and emit delete event with mediator", function() {
        //fake mediator
        let mediator = new function() {
            this.emit = function(message, data) {}
        };
        mock.method(mediator, 'emit');
        const MediatorModelTest = class extends Model {
            constructor() {
                super();
                // optionally add in a mediator when extended
                this.mediator = mediator;
                // name for this model instance be used in mediator emit. Required on when using a mediator
                this.name = 'test-mediator-1';
            }
        };
        const mediatorModelTest = new MediatorModelTest();
        mediatorModelTest.set({
            name: 'red'
        });
        mediatorModelTest.delete();
        assert.ok(mediator.emit.mock.calls.some(call =>
            isDeepStrictEqual(call.arguments, ['model:test-mediator-1:delete', {}])));
        assert.ok(mediator.emit.mock.calls.some(call =>
            isDeepStrictEqual(call.arguments, ['model:test-mediator-1:change', {}])));
    });
});






describe("A Collection array", function() {
    let callback, initCallback;
    const Model = WhiteLabelModel.Model;
    const Collection = WhiteLabelModel.Collection;
    let modelColor1;
    let modelColor2;
    let modelColor3;
    let modelColors;
    beforeEach(function() {
        callback = mock.fn();
        initCallback = mock.fn();
        const CollectionTest = class extends Collection {
            initialize() {
                initCallback();
                return this;
            }
            extendedFunction() {
            }
        };
        modelColor1 = new Model({
            name: 'red'
        });
        modelColor2 = new Model({
            name: 'green'
        });
        modelColor3 = new Model({
            name: 'blue'
        });
        modelColors = new CollectionTest();
    });
    afterEach(function() {
        callback = undefined;
        initCallback = undefined;
    });
    it("is an object", function() {
        assert.ok(modelColors instanceof Object);
    });
    it("is has an collectionData Array", function() {
        assert.ok(Array.isArray(modelColors.collectionData));
    });
    it("is has an initialize function", function() {
        assert.ok(typeof modelColors.initialize === 'function');
    });
    it("is has a set function", function() {
        assert.ok(typeof modelColors.set === 'function');
    });
    it("is has a push function", function() {
        assert.ok(typeof modelColors.push === 'function');
    });
    it("is has a get function", function() {
        assert.ok(typeof modelColors.get === 'function');
    });
    it("is has an update function", function() {
        assert.ok(typeof modelColors.update === 'function');
    });
    it("is has an delete function", function() {
        assert.ok(typeof modelColors.delete === 'function');
    });
    it("is has an destroy function", function() {
        assert.ok(typeof modelColors.destroy === 'function');
    });
    it("is does not have a mediator setup", function() {
        assert.deepEqual(modelColors.mediator, false);
    });
    it("is does not have a name defined", function() {
        assert.deepEqual(modelColors.name, false);
    });
    it("calls initialize function", function() {
        modelColors.initialize();
        assert.ok(initCallback.mock.callCount() > 0);
    });
    it("calls initialize function and returns 'this'", function() {
        let modelColors = new Collection();
        let result = modelColors.initialize();
        assert.ok(result instanceof Object);
    });
    it("will save data in the collection at instantiation", function() {
        modelColors = new Collection([
            modelColor1,
            modelColor2,
            modelColor3
        ]);
        assert.deepEqual(modelColors.collectionData[0].modelData, {
            name: 'red'
        });
    });
    it("will save data in the collection using set", function() {
        let setReturns = modelColors.set([
            modelColor1,
            modelColor2,
            modelColor3
        ]);
        assert.deepEqual(modelColors.collectionData[0].modelData, {
            name: 'red'
        });
        assert.deepEqual(setReturns, true);
    });
    it("will save data in the collection using set with the silent argument defined", function() {
        let setReturns = modelColors.set([
            modelColor1,
            modelColor2,
            modelColor3
        ], true);
        assert.deepEqual(modelColors.collectionData[0].modelData, {
            name: 'red'
        });
        assert.deepEqual(setReturns, true);
    });
    it("will not save data in the collection using set when the data is not an array or map", function() {
        let setReturns = modelColors.set('someString');
        assert.deepEqual(modelColors.collectionData, []);
        assert.deepEqual(setReturns, false);
        setReturns = modelColors.set(3);
        assert.deepEqual(modelColors.collectionData, []);
        assert.deepEqual(setReturns, false);
    });
    it("will save data in the collection using set and emit set event", function() {
        callback = mock.fn();
        modelColors.on('set', callback);
        let setReturns = modelColors.set([
            modelColor1,
            modelColor2,
            modelColor3
        ]);
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && Array.isArray(call.arguments[0])));
    });
    it("will save data in the collection using set and not emit set event with the silent argument", function() {
        callback = mock.fn();
        modelColors.on('set', callback);
        let setReturns = modelColors.set([
            modelColor1,
            modelColor2,
            modelColor3
        ], true);
        assert.equal(callback.mock.callCount(), 0);
    });
    it("will save data in the collection using set and emit change event", function() {
        callback = mock.fn();
        modelColors.on('change', callback);
        let setReturns = modelColors.set([
            modelColor1,
            modelColor2,
            modelColor3
        ]);
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && Array.isArray(call.arguments[0])));
    });
    it("will save data to the end of the collection using push with an array", function() {
        modelColors.push(modelColor1);
        let pushReturns = modelColors.push([
            modelColor2,
            modelColor3
        ]);
        assert.deepEqual(modelColors.collectionData[2].modelData, {
            name: 'blue'
        });
        assert.deepEqual(pushReturns, true);
    });
    it("will save data to the end of the collection using push with an array with silent argument", function() {
        modelColors.push(modelColor1);
        let pushReturns = modelColors.push([
            modelColor2,
            modelColor3
        ], true);
        assert.deepEqual(modelColors.collectionData[2].modelData, {
            name: 'blue'
        });
        assert.deepEqual(pushReturns, true);
    });
    it("will save data to the end of the collection using push with a single item", function() {
        let pushReturns = modelColors.push(modelColor1);
        assert.deepEqual(modelColors.collectionData[0].modelData, {
            name: 'red'
        });
        assert.deepEqual(pushReturns, true);
    });
    it("will not save data in the collection using push when data is not passed in", function() {
        let pushReturns = modelColors.push();
        assert.deepEqual(modelColors.collectionData, []);
        assert.deepEqual(pushReturns, false);
    });
    it("will save data in the collection using push and emit push event", function() {
        callback = mock.fn();
        modelColors.on('push', callback);
        modelColors.push(modelColor1);
        let pushReturns = modelColors.push([
            modelColor2,
            modelColor3
        ]);
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && Array.isArray(call.arguments[0])));
    });
    it("will save data in the collection using push and will not emit push event with silent argument passed in", function() {
        callback = mock.fn();
        modelColors.on('push', callback);
        modelColors.push(modelColor1, true);
        let pushReturns = modelColors.push([
            modelColor2,
            modelColor3
        ], true);
        assert.equal(callback.mock.callCount(), 0);
    });
    it("will save data in the collection using push and emit change event", function() {
        callback = mock.fn();
        modelColors.on('change', callback);
        modelColors.push(modelColor1);
        let pushReturns = modelColors.push([
            modelColor2,
            modelColor3
        ]);
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && Array.isArray(call.arguments[0])));
    });
    it("will retrieve all the data in the collection using get", function() {
        modelColors.push(modelColor1);
        var allColorData = modelColors.get();
        assert.ok(Array.isArray(allColorData));
        assert.deepEqual(allColorData.length, 1);
        assert.deepEqual(allColorData[0].modelData, {
            name: 'red'
        });
    });
    it("will retrieve one model in the collection using get at the specified index", function() {
        modelColors.push(modelColor1);
        var colorData = modelColors.get(0);
        assert.ok(colorData instanceof Object);
        assert.deepEqual(colorData.modelData, {
            name: 'red'
        });
    });
    it("will update model data in the collection using update at the specified index", function() {
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update(0, {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.deepEqual(modelColors.get(0).modelData, {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.deepEqual(updateReturns, true);
    });
    it("will update model data in the collection using update at the specified index with the silent argument passed in", function() {
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update(0, {
            name: 'blue',
            isPrimaryColor: true
        }, true);
        assert.deepEqual(modelColors.get(0).modelData, {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.deepEqual(updateReturns, true);
    });
    it("will update object data in the collection using update at the specified index", function() {
        modelColors.push({
            foo: 'bar'
        });
        let updateReturns = modelColors.update(0, {
            foo: 'fighters',
            isBand: true
        });
        assert.deepEqual(modelColors.get(0), {
            foo: 'fighters',
            isBand: true
        });
        assert.deepEqual(updateReturns, true);
    });
    it("will update non object data in the collection using update at the specified index", function() {
        modelColors.push(123);
        let updateReturns = modelColors.update(0, 456);
        assert.deepEqual(modelColors.get(0), 456);
        assert.deepEqual(updateReturns, true);
    });
    it("will not update all model data in the collection when the argument is not an array at the specified index",
        function() {
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update(0);
        assert.deepEqual(modelColors.get(0).modelData, {
            name: 'red'
        });
        assert.deepEqual(updateReturns, false);
    });
    it("will update model data in the collection using update with an array of models", function() {
        modelColors.push(modelColor1);
        let updateReturns = modelColors.set([
            new Model({
                name: 'cyan'
            }),
            new Model({
                name: 'magenta'
            }),
            new Model({
                name: 'yellow'
            }),
            new Model({
                name: 'black'
            })
        ]);
        assert.deepEqual(modelColors.get(0).modelData, {
            name: 'cyan'
        });
        assert.deepEqual(modelColors.get(3).modelData, {
            name: 'black'
        });
        assert.deepEqual(updateReturns, true);
    });
    it("will not update all model data in the collection when the argument is not an array", function() {
        modelColors.set([
            new Model({
                name: 'cyan'
            }),
            new Model({
                name: 'magenta'
            }),
            new Model({
                name: 'yellow'
            }),
            new Model({
                name: 'black'
            })
        ]);
        let updateReturns = modelColors.update({});
        assert.deepEqual(modelColors.get(3).modelData, {
            name: 'black'
        });
        assert.deepEqual(updateReturns, false);
    });
    it("will update data in the collection using update and emit update event", function() {
        callback = mock.fn();
        modelColors.on('update', callback);
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update(0, {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && Array.isArray(call.arguments[0])));
    });
    it("will update data in the collection using update and not emit update event with silent argument passed in", function() {
        callback = mock.fn();
        modelColors.on('update', callback);
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update(0, {
            name: 'blue',
            isPrimaryColor: true
        }, true);
        assert.equal(callback.mock.callCount(), 0);
    });
    it("will update data in the collection using update and emit change event", function() {
        callback = mock.fn();
        modelColors.on('change', callback);
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update(0, {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && Array.isArray(call.arguments[0])));
    });
    it("will remove model data from the the collection using delete at the specified index", function() {
        modelColors.set([
            new Model({
                name: 'cyan'
            }),
            new Model({
                name: 'magenta'
            }),
            new Model({
                name: 'yellow'
            }),
            new Model({
                name: 'black'
            })
        ]);
        let deleteReturns = modelColors.delete(2);
        assert.deepEqual(modelColors.get(2).modelData, {
            name: 'black'
        });
        assert.deepEqual(modelColors.get().length, 3);
        assert.deepEqual(deleteReturns, true);
    });
    it("will not remove model data from the the collection using delete at the specified index when that index does not exist", function() {
        modelColors.set([
            new Model({
                name: 'cyan'
            }),
            new Model({
                name: 'magenta'
            }),
            new Model({
                name: 'yellow'
            }),
            new Model({
                name: 'black'
            })
        ]);
        let deleteReturns = modelColors.delete(10);
        assert.deepEqual(modelColors.get(2).modelData, {
            name: 'yellow'
        });
        assert.deepEqual(modelColors.get().length, 4);
        assert.deepEqual(deleteReturns, false);
    });
    it("will remove all the model data from the collection using delete", function() {
        modelColors.push({
            name: 'red'
        });
        let deleteReturns = modelColors.clear();
        assert.ok(Array.isArray(modelColors.get()));
        assert.deepEqual(modelColors.get().length, 0);
        assert.deepEqual(deleteReturns, true);
    });
    it("will remove all the model data from the collection using delete and passing in silent argument", function() {
        modelColors.push({
            name: 'red'
        });
        let deleteReturns = modelColors.clear(true);
        assert.ok(Array.isArray(modelColors.get()));
        assert.deepEqual(modelColors.get().length, 0);
        assert.deepEqual(deleteReturns, true);
    });
    it("will remove data in the collection using delete and emit delete event", function() {
        callback = mock.fn();
        modelColors.on('delete', callback);
        let deleteReturns = modelColors.push({
            name: 'red'
        });
        modelColors.clear();
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && Array.isArray(call.arguments[0])));
    });
    it("will remove data in the collection using delete and not emit delete event when passing silent argument", function() {
        callback = mock.fn();
        modelColors.on('delete', callback);
        let deleteReturns = modelColors.push({
            name: 'red'
        });
        modelColors.clear(true);
        assert.equal(callback.mock.callCount(), 0);
    });
    it("will remove data in the collection using delete and emit change event", function() {
        callback = mock.fn();
        modelColors.on('change', callback);
        let deleteReturns = modelColors.push({
            name: 'red'
        });
        modelColors.clear();
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && Array.isArray(call.arguments[0])));
    });
    it("will add data to the model using push and emit push event with the mediator", function() {
        //fake mediator
        let mediator = new function() {
            this.emit = function(message, data) {}
        };
        mock.method(mediator, 'emit');
        const MediatorCollectionTest = class extends Collection {
            constructor() {
                super();
                // optionally add in a mediator when extended
                this.mediator = mediator;
                // name for this model instance be used in mediator emit. Required on when using a mediator
                this.name = 'test-mediator-1';
            }
        };
        const mediatorCollectionTest = new MediatorCollectionTest();
        mediatorCollectionTest.push(modelColor1);
        assert.ok(mediator.emit.mock.calls.some(call =>
            call.arguments.length === 2 && call.arguments[0] === 'collection:test-mediator-1:push' && Array.isArray(call.arguments[1])));
        assert.ok(mediator.emit.mock.calls.some(call =>
            call.arguments.length === 2 && call.arguments[0] === 'collection:test-mediator-1:change' && Array.isArray(call.arguments[1])));
    });
    it("will set data in the model using set and emit set event with the mediator", function() {
        //fake mediator
        let mediator = new function() {
            this.emit = function(message, data) {}
        };
        mock.method(mediator, 'emit');
        const MediatorCollectionTest = class extends Collection {
            constructor() {
                super();
                // optionally add in a mediator when extended
                this.mediator = mediator;
                // name for this model instance be used in mediator emit. Required on when using a mediator
                this.name = 'test-mediator-1';
            }
        };
        const mediatorCollectionTest = new MediatorCollectionTest();
        mediatorCollectionTest.set([modelColor1]);
        assert.ok(mediator.emit.mock.calls.some(call =>
            call.arguments.length === 2 && call.arguments[0] === 'collection:test-mediator-1:set' && Array.isArray(call.arguments[1])));
        assert.ok(mediator.emit.mock.calls.some(call =>
            call.arguments.length === 2 && call.arguments[0] === 'collection:test-mediator-1:change' && Array.isArray(call.arguments[1])));
    });
    it("will update data in the model using update and emit delete event with the mediator", function() {
        //fake mediator
        let mediator = new function() {
            this.emit = function(message, data) {}
        };
        mock.method(mediator, 'emit');
        const MediatorCollectionTest = class extends Collection {
            constructor() {
                super();
                // optionally add in a mediator when extended
                this.mediator = mediator;
                // name for this model instance be used in mediator emit. Required on when using a mediator
                this.name = 'test-mediator-1';
            }
        };
        const mediatorCollectionTest = new MediatorCollectionTest();
        mediatorCollectionTest.push(modelColor1);
        mediatorCollectionTest.update(0, {
            color: 'brown'
        });
        assert.ok(mediator.emit.mock.calls.some(call =>
            call.arguments.length === 2 && call.arguments[0] === 'collection:test-mediator-1:update' && Array.isArray(call.arguments[1])));
        assert.ok(mediator.emit.mock.calls.some(call =>
            call.arguments.length === 2 && call.arguments[0] === 'collection:test-mediator-1:change' && Array.isArray(call.arguments[1])));
    });
    it("will remove data in the model using delete and emit delete event with the mediator", function() {
        //fake mediator
        let mediator = new function() {
            this.emit = function(message, data) {}
        };
        mock.method(mediator, 'emit');
        const MediatorCollectionTest = class extends Collection {
            constructor() {
                super();
                // optionally add in a mediator when extended
                this.mediator = mediator;
                // name for this model instance be used in mediator emit. Required on when using a mediator
                this.name = 'test-mediator-1';
            }
        };
        const mediatorCollectionTest = new MediatorCollectionTest();
        mediatorCollectionTest.push(modelColor1);
        mediatorCollectionTest.clear();
        assert.ok(mediator.emit.mock.calls.some(call =>
            call.arguments.length === 2 && call.arguments[0] === 'collection:test-mediator-1:delete' && Array.isArray(call.arguments[1])));
        assert.ok(mediator.emit.mock.calls.some(call =>
            call.arguments.length === 2 && call.arguments[0] === 'collection:test-mediator-1:change' && Array.isArray(call.arguments[1])));
    });
    it("will remove data in the model using delete and not emit delete event with the mediator", function() {
        //fake mediator
        let mediator = new function() {
            this.emit = function(message, data) {}
        };
        mock.method(mediator, 'emit');
        const MediatorCollectionTest = class extends Collection {
            constructor() {
                super();
                // optionally add in a mediator when extended
                this.mediator = mediator;
                // name for this model instance be used in mediator emit. Required on when using a mediator
                this.name = 'test-mediator-1';
            }
        };
        const mediatorCollectionTest = new MediatorCollectionTest();
        mediatorCollectionTest.push(modelColor1);
        mediatorCollectionTest.clear();
        assert.ok(mediator.emit.mock.calls.some(call =>
            call.arguments.length === 2 && call.arguments[0] === 'collection:test-mediator-1:delete' && Array.isArray(call.arguments[1])));
        assert.ok(mediator.emit.mock.calls.some(call =>
            call.arguments.length === 2 && call.arguments[0] === 'collection:test-mediator-1:change' && Array.isArray(call.arguments[1])));
    });
    it("will return 'this' object when destroy is called", function() {
        let destroyReturns = modelColors.destroy();
        assert.ok(destroyReturns instanceof Object);
    });
    it("can be extended", function() {
        assert.ok(typeof modelColors.extendedFunction === 'function');
    });
});






describe("A Collection map", function() {
    let callback, initCallback;
    const Model = WhiteLabelModel.Model;
    const Collection = WhiteLabelModel.Collection;
    let modelColor1;
    let modelColor2;
    let modelColor3;
    let modelColors;
    beforeEach(function() {
        callback = mock.fn();
        const CollectionTest = class extends Collection {};
        modelColor1 = new Model({
            name: 'red'
        });
        modelColor2 = new Model({
            name: 'green'
        });
        modelColor3 = new Model({
            name: 'blue'
        });
        modelColors = new Collection(new Map());
    });
    afterEach(function() {
        callback = undefined;
    });
    it("will save data in the collection at instantiation", function() {
        let map = new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]);
        modelColors = new Collection(map);
        assert.deepEqual(modelColors.collectionData.get('color1').modelData, {
            name: 'red'
        });
    });
    it("will save data in the collection using set", function() {
        let map = new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]);
        let setReturns = modelColors.set(map);
        assert.deepEqual(modelColors.collectionData.get('color1').modelData, {
            name: 'red'
        });
        assert.deepEqual(setReturns, true);
    });
    it("will save data in the collection using set and emit set event", function() {
        callback = mock.fn();
        modelColors.on('set', callback);
        let map = new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]);
        let setReturns = modelColors.set(map);
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Map));
    });
    it("will save data in the collection using set and emit change event", function() {
        callback = mock.fn();
        modelColors.on('change', callback);
        let map = new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]);
        let setReturns = modelColors.set(map);
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Map));
    });
    it("will save data to the end of the collection using push with a map", function() {
        let map1 = new Map([
            ['color1', modelColor1]
        ]);
        let map2 = new Map([
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]);
        modelColors.push(map1);
        let pushReturns = modelColors.push(map2);
        assert.deepEqual(modelColors.collectionData.get('color1').modelData, {
            name: 'red'
        });
        assert.deepEqual(pushReturns, true);
    });
    it("will save data to the end of the collection using push with a single item", function() {
        let pushReturns = modelColors.push('color1', modelColor1);
        assert.deepEqual(modelColors.collectionData.get('color1').modelData, {
            name: 'red'
        });
        assert.deepEqual(pushReturns, true);
    });
    it("will save data in the collection using push and emit push event", function() {
        callback = mock.fn();
        modelColors = new Collection(new Map());
        modelColors.on('push', callback);
        modelColors.push('color1', modelColor1);
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Map));
    });
    it("will save data in the collection using push and emit change event", function() {
        callback = mock.fn();
        modelColors = new Collection(new Map());
        modelColors.on('change', callback);
        modelColors.push('color1', modelColor1);
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Map));
    });
    it("will retrieve all the data in the collection using get", function() {
        modelColors.push('color1', modelColor1);
        var allColorData = modelColors.get();
        assert.ok(allColorData instanceof Map);
        assert.deepEqual(allColorData.size, 1);
        assert.deepEqual(allColorData.get('color1').modelData, {
            name: 'red'
        });
    });
    it("will retrieve one model in the collection using get at the specified index", function() {
        modelColors.push('color1', modelColor1);
        var colorData = modelColors.get('color1');
        assert.ok(colorData instanceof Object);
        assert.deepEqual(colorData.modelData, {
            name: 'red'
        });
    });
    it("will update model data in the collection using update at the specified index", function() {
        modelColors.push('color1', new Model({
            name: 'red',
            isCMYK: false
        }));
        let updateReturns = modelColors.update('color1', {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.deepEqual(modelColors.get('color1').modelData, {
            name: 'blue',
            isPrimaryColor: true,
            isCMYK: false
        });
        assert.deepEqual(updateReturns, true);
    });
    it("will update object data in the collection using update at the specified index", function() {
        modelColors.push('color1', {
            name: 'red',
            isCMYK: false
        });
        let updateReturns = modelColors.update('color1', {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.deepEqual(modelColors.get('color1'), {
            name: 'blue',
            isPrimaryColor: true,
            isCMYK: false
        });
        assert.deepEqual(updateReturns, true);
    });
    it("will update non object data in the collection using update at the specified index", function() {
        modelColors.push('color1', 'red');
        modelColors.push('color2', 'green');
        let updateReturns = modelColors.update('color1', 'blue');
        assert.deepEqual(modelColors.get('color1'), 'blue');
        assert.deepEqual(modelColors.get('color2'), 'green');
        assert.deepEqual(updateReturns, true);
    });
    it("will not update all model data in the collection when the update data argument is empty with a specified index",
        function() {
        modelColors.push('color1', modelColor1);
        let updateReturns = modelColors.update('color1');
        assert.deepEqual(modelColors.get('color1').modelData, {
            name: 'red'
        });
        assert.deepEqual(updateReturns, false);
    });
    it("will update model data in the collection using update with a map of models", function() {
        modelColors = new Collection(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        let updateReturns = modelColors.set(new Map([
            ['color1', modelColor3],
            ['color2', modelColor2],
            ['color3', modelColor1]
        ]));
        assert.deepEqual(modelColors.get('color3').modelData, {
            name: 'red'
        });
        assert.deepEqual(updateReturns, true);
    });
    it("will update data in the collection using update and emit update event", function() {
        callback = mock.fn();
        modelColors.on('update', callback);
        modelColors.push('color1', modelColor1);
        let updateReturns = modelColors.update('color1', {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Map));
    });
    it("will update data in the collection using update and emit change event", function() {
        callback = mock.fn();
        modelColors.on('change', callback);
        modelColors.push('color1', modelColor1);
        let updateReturns = modelColors.update('color1', {
            name: 'blue',
            isPrimaryColor: true
        });
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Map));
    });
    it("will remove model data from the the collection using delete at the specified index", function() {
        modelColors.set(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        let deleteReturns = modelColors.delete('color2');
        assert.deepEqual(modelColors.get('color2'), undefined);
        assert.deepEqual(modelColors.get().size, 2);
        assert.deepEqual(deleteReturns, true);
    });
    it("will not remove model data from the the collection using delete at the specified index when that index does not exist", function() {
        modelColors.set(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        let deleteReturns = modelColors.delete('color4');
        assert.deepEqual(modelColors.get('color4'), undefined);
        assert.deepEqual(modelColors.get().size, 3);
        assert.deepEqual(deleteReturns, false);
    });
    it("will remove all the model data from the collection using delete", function() {
        modelColors.set(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        let deleteReturns = modelColors.clear();
        assert.ok(modelColors.get() instanceof Map);
        assert.deepEqual(modelColors.get().size, 0);
        assert.deepEqual(deleteReturns, true);
    });
    it("will remove data in the collection using delete and emit delete event", function() {
        callback = mock.fn();
        modelColors.on('delete', callback);
        modelColors.set(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        modelColors.clear();
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Map));
    });
    it("will remove data in the collection using delete and emit change event", function() {
        callback = mock.fn();
        modelColors.on('change', callback);
        modelColors.set(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        modelColors.clear();
        assert.ok(callback.mock.calls.some(call => call.arguments.length === 1 && call.arguments[0] instanceof Map));
    });
});
