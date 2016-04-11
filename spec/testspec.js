'use strict';

const WhiteLabelModel = require('../dist/index');
const _ = require('lodash');
require('babel-polyfill');

// canary
describe("A suite", function() {
    it("contains spec with an expectation", function() {
        expect(true).toBe(true);
    });
});

describe("WhiteLabelModel module", function() {
    const Model = WhiteLabelModel.Model;
    const Collection = WhiteLabelModel.Collection;
    it("has a Model function defined", function() {
        expect(WhiteLabelModel.Model).toEqual(jasmine.any(Function));
    });
    it("has a Collection function defined", function() {
        expect(WhiteLabelModel.Collection).toEqual(jasmine.any(Function));
    });
});

describe("A Model", function() {
    const Model = WhiteLabelModel.Model;
    let modelColor;
    let modelColorChange;
    beforeEach(function() {
        let self = this;
        this.callback = function(data) {};
        this.initCallback = function(data) {};
        spyOn(this, 'callback');
        spyOn(this, 'initCallback');
        const ModelTest = class extends Model {
            initialize() {
                self.initCallback();
                return this;
            }
            extendedFunction() {
            }
        };
        modelColor = new ModelTest();
    });
    afterEach(function() {
        delete this.callback;
        delete this.initCallback;
    });
    it("is an object", function() {
        expect(modelColor).toEqual(jasmine.any(Object));
    });
    it("is has an modelData object", function() {
        expect(modelColor.modelData).toEqual(jasmine.any(Object));
    });
    it("is has an initialize function", function() {
        expect(modelColor.initialize).toEqual(jasmine.any(Function));
    });
    it("is has a set function", function() {
        expect(modelColor.set).toEqual(jasmine.any(Function));
    });
    it("is has a get function", function() {
        expect(modelColor.get).toEqual(jasmine.any(Function));
    });
    it("is has an update function", function() {
        expect(modelColor.update).toEqual(jasmine.any(Function));
    });
    it("is has an delete function", function() {
        expect(modelColor.delete).toEqual(jasmine.any(Function));
    });
    it("calls initialize function", function() {
        modelColor.initialize();
        expect(this.initCallback).toHaveBeenCalled();
    });
    it("calls initialize function and returns 'this'", function() {
        let modelColor = new Model();
        let result = modelColor.initialize();
        expect(result).toEqual(jasmine.any(Object));
    });
    it("will save data in the model at instantiation", function() {
        modelColor = new Model({
            name: 'red'
        });
        expect(modelColor.modelData.name).toEqual('red');
    });
    it("will save data in the model using set", function() {
        let setReturns = modelColor.set({
            name: 'red'
        });
        expect(modelColor.modelData.name).toEqual('red');
        expect(setReturns).toEqual(true);
    });
    it("will save data in the model using set and emit set event", function() {
        modelColor.on('set', this.callback);
        let setReturns = modelColor.set({
            name: 'red'
        });
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Object));
    });
    it("will save data in the model using set and emit change event", function() {
        modelColor.on('change', this.callback);
        let setReturns = modelColor.set({
            name: 'red'
        });
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Object));
    });
    it("will not save data in the model using set when no data is passed in", function() {
        let setReturns = modelColor.set();
        expect(modelColor.modelData).toEqual({});
        expect(setReturns).toEqual(false);
    });
    it("will retrieve data in the model using get", function() {
        modelColor.set({
            name: 'red'
        });
        var redColorData = modelColor.get();
        expect(redColorData.name).toEqual('red');
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
        expect(modelColor.get()).toEqual({
            name: 'blue',
            isPrimaryColor: true
        });
        expect(updateReturns).toEqual(true);
        expect(updateReturnsEmpty).toEqual(false);
    });
    it("will update data in the model using update and emit update event", function() {
        modelColor.on('update', this.callback);
        modelColor.set({
            name: 'red'
        });
        let updateReturns = modelColor.update({
            name: 'blue',
            isPrimaryColor: true
        });
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Object));
    });
    it("will update data in the model using update and emit change event", function() {
        modelColor.on('change', this.callback);
        modelColor.set({
            name: 'red'
        });
        let updateReturns = modelColor.update({
            name: 'blue',
            isPrimaryColor: true
        });
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Object));
    });
    it("will remove the data from the model using delete", function() {
        modelColor.set({
            name: 'red'
        });
        let deleteReturns = modelColor.delete();
        expect(modelColor.get()).toEqual({});
        expect(deleteReturns).toEqual(true);
    });
    it("will remove data in the model using delete and emit delete event", function() {
        modelColor.on('delete', this.callback);
        modelColor.set({
            name: 'red'
        });
        let deleteReturns = modelColor.delete();
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Object));
    });
    it("will remove data in the model using delete and emit change event", function() {
        modelColor.on('change', this.callback);
        modelColor.set({
            name: 'red'
        });
        let deleteReturns = modelColor.delete();
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Object));
    });
    it("can be extended", function() {
        expect(modelColor.extendedFunction).toEqual(jasmine.any(Function));
    });
});

describe("A Collection array", function() {
    this.callback = function(data) {};
    spyOn(this, 'callback');
    const Model = WhiteLabelModel.Model;
    const Collection = WhiteLabelModel.Collection;
    let modelColor1;
    let modelColor2;
    let modelColor3;
    let modelColors;
    beforeEach(function() {
        let self = this;
        this.callback = function(data) {};
        this.initCallback = function(data) {};
        spyOn(this, 'callback');
        spyOn(this, 'initCallback');
        const CollectionTest = class extends Collection {
            initialize() {
                self.initCallback();
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
        delete this.callback;
        delete this.initCallback;
    });
    it("is an object", function() {
        expect(modelColors).toEqual(jasmine.any(Object));
    });
    it("is has an collectionData Array", function() {
        expect(modelColors.collectionData).toEqual(jasmine.any(Array));
    });
    it("is has an initialize function", function() {
        expect(modelColors.initialize).toEqual(jasmine.any(Function));
    });
    it("is has a set function", function() {
        expect(modelColors.set).toEqual(jasmine.any(Function));
    });
    it("is has a push function", function() {
        expect(modelColors.push).toEqual(jasmine.any(Function));
    });
    it("is has a get function", function() {
        expect(modelColors.get).toEqual(jasmine.any(Function));
    });
    it("is has an update function", function() {
        expect(modelColors.update).toEqual(jasmine.any(Function));
    });
    it("is has an delete function", function() {
        expect(modelColors.delete).toEqual(jasmine.any(Function));
    });
    it("calls initialize function", function() {
        modelColors.initialize();
        expect(this.initCallback).toHaveBeenCalled();
    });
    it("calls initialize function and returns 'this'", function() {
        let modelColors = new Collection();
        let result = modelColors.initialize();
        expect(result).toEqual(jasmine.any(Object));
    });
    it("will save data in the collection at instantiation", function() {
        modelColors = new Collection([
            modelColor1,
            modelColor2,
            modelColor3
        ]);
        expect(modelColors.collectionData[0].modelData).toEqual({
            name: 'red'
        });
    });
    it("will save data in the collection using set", function() {
        let setReturns = modelColors.set([
            modelColor1,
            modelColor2,
            modelColor3
        ]);
        expect(modelColors.collectionData[0].modelData).toEqual({
            name: 'red'
        });
        expect(setReturns).toEqual(true);
    });
    it("will not save data in the collection using set when the data is not an array or map", function() {
        let setReturns = modelColors.set('someString');
        expect(modelColors.collectionData).toEqual([]);
        expect(setReturns).toEqual(false);
        setReturns = modelColors.set(3);
        expect(modelColors.collectionData).toEqual([]);
        expect(setReturns).toEqual(false);
    });
    it("will save data in the collection using set and emit set event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('set', this.callback);
        let setReturns = modelColors.set([
            modelColor1,
            modelColor2,
            modelColor3
        ]);
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Array));
    });
    it("will save data in the collection using set and emit change event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('change', this.callback);
        let setReturns = modelColors.set([
            modelColor1,
            modelColor2,
            modelColor3
        ]);
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Array));
    });
    it("will save data to the end of the collection using push with an array", function() {
        modelColors.push(modelColor1);
        let pushReturns = modelColors.push([
            modelColor2,
            modelColor3
        ]);
        expect(modelColors.collectionData[2].modelData).toEqual({
            name: 'blue'
        });
        expect(pushReturns).toEqual(true);
    });
    it("will save data to the end of the collection using push with a single item", function() {
        let pushReturns = modelColors.push(modelColor1);
        expect(modelColors.collectionData[0].modelData).toEqual({
            name: 'red'
        });
        expect(pushReturns).toEqual(true);
    });
    it("will not save data in the collection using push when data is not passed in", function() {
        let pushReturns = modelColors.push();
        expect(modelColors.collectionData).toEqual([]);
        expect(pushReturns).toEqual(false);
    });
    it("will save data in the collection using push and emit push event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('push', this.callback);
        modelColors.push(modelColor1);
        let pushReturns = modelColors.push([
            modelColor2,
            modelColor3
        ]);
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Array));
    });
    it("will save data in the collection using push and emit change event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('change', this.callback);
        modelColors.push(modelColor1);
        let pushReturns = modelColors.push([
            modelColor2,
            modelColor3
        ]);
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Array));
    });
    it("will retrieve all the data in the collection using get", function() {
        modelColors.push(modelColor1);
        var allColorData = modelColors.get();
        expect(allColorData).toEqual(jasmine.any(Array));
        expect(allColorData.length).toEqual(1);
        expect(allColorData[0].modelData).toEqual({
            name: 'red'
        });
    });
    it("will retrieve one model in the collection using get at the specified index", function() {
        modelColors.push(modelColor1);
        var colorData = modelColors.get(0);
        expect(colorData).toEqual(jasmine.any(Object));
        expect(colorData.modelData).toEqual({
            name: 'red'
        });
    });
    it("will update model data in the collection using update at the specified index", function() {
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update(0, {
            name: 'blue',
            isPrimaryColor: true
        });
        expect(modelColors.get(0).modelData).toEqual({
            name: 'blue',
            isPrimaryColor: true
        });
        expect(updateReturns).toEqual(true);
    });
    it("will update object data in the collection using update at the specified index", function() {
        modelColors.push({
            foo: 'bar'
        });
        let updateReturns = modelColors.update(0, {
            foo: 'fighters',
            isBand: true
        });
        expect(modelColors.get(0)).toEqual({
            foo: 'fighters',
            isBand: true
        });
        expect(updateReturns).toEqual(true);
    });
    it("will update non object data in the collection using update at the specified index", function() {
        modelColors.push(123);
        let updateReturns = modelColors.update(0, 456);
        expect(modelColors.get(0)).toEqual(456);
        expect(updateReturns).toEqual(true);
    });
    it("will not update all model data in the collection when the argument is not an array at the specified index",
        function() {
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update(0);
        expect(modelColors.get(0).modelData).toEqual({
            name: 'red'
        });
        expect(updateReturns).toEqual(false);
    });
    it("will update model data in the collection using update with an array of models", function() {
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update([
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
        expect(modelColors.get(3).modelData).toEqual({
            name: 'black'
        });
        expect(updateReturns).toEqual(true);
    });
    it("will not update all model data in the collection when the argument is not an array", function() {
        modelColors.update([
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
        expect(modelColors.get(3).modelData).toEqual({
            name: 'black'
        });
        expect(updateReturns).toEqual(false);
    });
    it("will update data in the collection using update and emit update event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('update', this.callback);
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update(0, {
            name: 'blue',
            isPrimaryColor: true
        });
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Array));
    });
    it("will update data in the collection using update and emit change event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('change', this.callback);
        modelColors.push(modelColor1);
        let updateReturns = modelColors.update(0, {
            name: 'blue',
            isPrimaryColor: true
        });
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Array));
    });
    it("will remove model data from the the collection using delete at the specified index", function() {
        modelColors.update([
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
        expect(modelColors.get(2).modelData).toEqual({
            name: 'black'
        });
        expect(modelColors.get().length).toEqual(3);
        expect(deleteReturns).toEqual(true);
    });
    it("will not remove model data from the the collection using delete at the specified index when that index does not exist", function() {
        modelColors.update([
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
        expect(modelColors.get(2).modelData).toEqual({
            name: 'yellow'
        });
        expect(modelColors.get().length).toEqual(4);
        expect(deleteReturns).toEqual(false);
    });
    it("will remove all the model data from the collection using delete", function() {
        modelColors.push({
            name: 'red'
        });
        let deleteReturns = modelColors.delete();
        expect(modelColors.get()).toEqual(jasmine.any(Array));
        expect(modelColors.get().length).toEqual(0);
        expect(deleteReturns).toEqual(true);
    });
    it("will remove data in the collection using delete and emit delete event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('delete', this.callback);
        let deleteReturns = modelColors.push({
            name: 'red'
        });
        modelColors.delete();
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Array));
    });
    it("will remove data in the collection using delete and emit change event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('change', this.callback);
        let deleteReturns = modelColors.push({
            name: 'red'
        });
        modelColors.delete();
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Array));
    });
    it("can be extended", function() {
        expect(modelColors.extendedFunction).toEqual(jasmine.any(Function));
    });
});

describe("A Collection map", function() {
    this.callback = function(data) {};
    spyOn(this, 'callback');
    const Model = WhiteLabelModel.Model;
    const Collection = WhiteLabelModel.Collection;
    let modelColor1;
    let modelColor2;
    let modelColor3;
    let modelColors;
    beforeEach(function() {
        let self = this;
        this.callback = function(data) {};
        spyOn(this, 'callback');
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
        delete this.callback;
    });
    it("will save data in the collection at instantiation", function() {
        let map = new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]);
        modelColors = new Collection(map);
        expect(modelColors.collectionData.get('color1').modelData).toEqual({
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
        expect(modelColors.collectionData.get('color1').modelData).toEqual({
            name: 'red'
        });
        expect(setReturns).toEqual(true);
    });
    it("will save data in the collection using set and emit set event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('set', this.callback);
        let map = new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]);
        let setReturns = modelColors.set(map);
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Map));
    });
    it("will save data in the collection using set and emit change event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('change', this.callback);
        let map = new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]);
        let setReturns = modelColors.set(map);
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Map));
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
        expect(modelColors.collectionData.get('color1').modelData).toEqual({
            name: 'red'
        });
        expect(pushReturns).toEqual(true);
    });
    it("will save data to the end of the collection using push with a single item", function() {
        let pushReturns = modelColors.push('color1', modelColor1);
        expect(modelColors.collectionData.get('color1').modelData).toEqual({
            name: 'red'
        });
        expect(pushReturns).toEqual(true);
    });
    it("will save data in the collection using push and emit push event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors = new Collection(new Map());
        modelColors.on('push', this.callback);
        modelColors.push('color1', modelColor1);
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Map));
    });
    it("will save data in the collection using push and emit change event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors = new Collection(new Map());
        modelColors.on('change', this.callback);
        modelColors.push('color1', modelColor1);
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Map));
    });
    it("will retrieve all the data in the collection using get", function() {
        modelColors.push('color1', modelColor1);
        var allColorData = modelColors.get();
        expect(allColorData).toEqual(jasmine.any(Map));
        expect(allColorData.size).toEqual(1);
        expect(allColorData.get('color1').modelData).toEqual({
            name: 'red'
        });
    });
    it("will retrieve one model in the collection using get at the specified index", function() {
        modelColors.push('color1', modelColor1);
        var colorData = modelColors.get('color1');
        expect(colorData).toEqual(jasmine.any(Object));
        expect(colorData.modelData).toEqual({
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
        expect(modelColors.get('color1').modelData).toEqual({
            name: 'blue',
            isPrimaryColor: true,
            isCMYK: false
        });
        expect(updateReturns).toEqual(true);
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
        expect(modelColors.get('color1')).toEqual({
            name: 'blue',
            isPrimaryColor: true,
            isCMYK: false
        });
        expect(updateReturns).toEqual(true);
    });
    // it("will update non object data in the collection using update at the specified index", function() {
    //     modelColors.push('color1', 'red');
    //     console.log(modelColors);
    //     let updateReturns = modelColors.update('color1', 'blue');
    //     console.log(modelColors);
    //     console.log(modelColors.get('color1'));
    //     expect(modelColors.get('color1')).toEqual('blue');
    //     expect(updateReturns).toEqual(true);
    // });
    // it("will not update all model data in the collection when the argument is not an array at the specified index",
    //     function() {
    //     modelColors.push(modelColor1);
    //     let updateReturns = modelColors.update(0);
    //     expect(modelColors.get(0).modelData).toEqual({
    //         name: 'red'
    //     });
    //     expect(updateReturns).toEqual(false);
    // });
    // it("will update model data in the collection using update with an array of models", function() {
    //     modelColors.push(modelColor1);
    //     let updateReturns = modelColors.update([
    //         new Model({
    //             name: 'cyan'
    //         }),
    //         new Model({
    //             name: 'magenta'
    //         }),
    //         new Model({
    //             name: 'yellow'
    //         }),
    //         new Model({
    //             name: 'black'
    //         })
    //     ]);
    //     expect(modelColors.get(3).modelData).toEqual({
    //         name: 'black'
    //     });
    //     expect(updateReturns).toEqual(true);
    // });
    // it("will not update all model data in the collection when the argument is not an array", function() {
    //     modelColors.update([
    //         new Model({
    //             name: 'cyan'
    //         }),
    //         new Model({
    //             name: 'magenta'
    //         }),
    //         new Model({
    //             name: 'yellow'
    //         }),
    //         new Model({
    //             name: 'black'
    //         })
    //     ]);
    //     let updateReturns = modelColors.update({});
    //     expect(modelColors.get(3).modelData).toEqual({
    //         name: 'black'
    //     });
    //     expect(updateReturns).toEqual(false);
    // });
    // it("will update data in the collection using update and emit update event", function() {
    //     this.callback = function(data) {};
    //     spyOn(this, 'callback');
    //     modelColors.on('update', this.callback);
    //     modelColors.push(modelColor1);
    //     let updateReturns = modelColors.update(0, {
    //         name: 'blue',
    //         isPrimaryColor: true
    //     });
    //     expect(this.callback).toHaveBeenCalledWith(jasmine.any(Object));
    // });
    // it("will update data in the collection using update and emit change event", function() {
    //     this.callback = function(data) {};
    //     spyOn(this, 'callback');
    //     modelColors.on('change', this.callback);
    //     modelColors.push(modelColor1);
    //     let updateReturns = modelColors.update(0, {
    //         name: 'blue',
    //         isPrimaryColor: true
    //     });
    //     expect(this.callback).toHaveBeenCalledWith(jasmine.any(Object));
    // });
    it("will remove model data from the the collection using delete at the specified index", function() {
        modelColors.set(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        let deleteReturns = modelColors.delete('color2');
        expect(modelColors.get('color2')).toEqual(undefined);
        expect(modelColors.get().size).toEqual(2);
        expect(deleteReturns).toEqual(true);
    });
    it("will not remove model data from the the collection using delete at the specified index when that index does not exist", function() {
        modelColors.set(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        let deleteReturns = modelColors.delete('color4');
        expect(modelColors.get('color4')).toEqual(undefined);
        expect(modelColors.get().size).toEqual(3);
        expect(deleteReturns).toEqual(false);
    });
    it("will remove all the model data from the collection using delete", function() {
        modelColors.set(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        let deleteReturns = modelColors.delete();
        expect(modelColors.get()).toEqual(jasmine.any(Map));
        expect(modelColors.get().size).toEqual(0);
        expect(deleteReturns).toEqual(true);
    });
    it("will remove data in the collection using delete and emit delete event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('delete', this.callback);
        modelColors.set(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        modelColors.delete();
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Map));
    });
    it("will remove data in the collection using delete and emit change event", function() {
        this.callback = function(data) {};
        spyOn(this, 'callback');
        modelColors.on('change', this.callback);
        modelColors.set(new Map([
            ['color1', modelColor1],
            ['color2', modelColor2],
            ['color3', modelColor3]
        ]));
        modelColors.delete();
        expect(this.callback).toHaveBeenCalledWith(jasmine.any(Map));
    });
});
