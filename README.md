# white-label-model

[![Build Status](https://travis-ci.org/bshack/white-label-model.svg?branch=master)](https://travis-ci.org/bshack/white-label-model) [![Coverage Status](https://coveralls.io/repos/github/bshack/white-label-model/badge.svg?branch=master)](https://coveralls.io/github/bshack/white-label-model?branch=master)

A simple ES6 JS data model that emits events on data change. Offers support for collections of models.

Learn more about ES6 classes here:

https://babeljs.io/docs/learn-es2015/

Model and collection events are emited using Node.js' events module. For more options on how to listen to events please look at the Node.js documentation:

https://nodejs.org/api/events.html

## Install

Install the node module:

```
npm install trndymodel --save
```

## Model Usage

trndyModel supports models and collections, this first example is for models only.

### Require

```
var Model = require('trndymodel').Model;
```

### Instantiate

Create a new empty model:

```
var modelColor = new Model();
```

optionally you can also set the model data at instantiation:

```
var modelColor = new Model({
    name: 'red'
});
```

## Extend

extend the Model class for your own needs:

```
const MyModel = class extends Model {
    someGreatFeature() {
        console.log('this is great!');
    }
};

const myModel = new MyModel();

myModel.someGreatFeature();
```

### Events

Add change listener to the model:

```
modelColor.on('change', function(data) {
    console.log('Model Data Change:', data);
});
```

Whenever a model changes it will emit a 'change' event.

### Set

Save some data in the model:

```
modelColor.set({
    name: 'red'
});
```

This will emit 'change' and 'set' events.

### Get

Retreive the stored model data:

```
var redColorData = modelColor.get();
```

### Update

Update the stored model data with new data:

```
modelColor.update({
    name: 'blue',
    isPrimaryColor: true
});
```

This extends the existing model data, old properties are overwritten, new properties are added to the model. This will emit 'change' and 'update' events.

### Delete

This sets the model data to an empty object:

```
modelColor.delete();
```

This will emit 'change' and 'delete' events.

## Initialize

At instantiation the initialize function will execute if defined:

```
const MyModel = class extends Model {
    initialize() {
        console.log('model has initialized');
    }
};

const myModel = new MyModel();
```

## Collection Usage

Collections are arrays. They can hold models or any other data types.

### Require

```
var Model = require('trndymodel').Model;
var Collection = require('trndymodel').Collection;
```

### Instantiate

Create a couple new models.

```
var modelColor1 = new Model({
    name: 'red'
});
var modelColor2 = new Model({
    name: 'green'
});
var modelColor3 = new Model({
    name: 'blue'
});
```

Now create a new collection to hold the models.

```
var modelColors = new Collection();
```

Optionally you can also set the collection data at instantiation:

```
var modelColors = new Collection([
    modelColor1,
    modelColor2,
    modelColor3
]);
```

## Extend

extend the Collection class for your own needs:

```
const MyCollection = class extends Collection {
    someGreatFeature() {
        console.log('this is great!');
    }
};

const myCollection = new MyCollection();

myCollection.someGreatFeature();
```

### Events

Add change listeners to the models and the collection:

models:

```
modelColor1.on('change', function(data) {
    console.log('Model 1 Data Change:', data);
});
modelColor2.on('change', function(data) {
    console.log('Model 2 Data Change:', data);
});
modelColor3.on('change', function(data) {
    console.log('Model 3 Data Change:', data);
});
```

collection:

```
modelColors.on('change', function(data) {
    console.log('Collection Data Change:', data);
});
```

Whenever these models or this collection change they will emit a 'change' event.

### Set

Set the collection array contents:

```
modelColor1.set([
    modelColor1,
    modelColor2,
    modelColor3
]);
```

The data must be in an array and this will overwrite any existing array data stored completely. This will emit 'change' and 'set' events.

### Push

Add single items to the end of the stored collection array:

```
modelColors.push(modelColor1);
modelColors.push(modelColor2);
modelColors.push(modelColor3);
```

or add multiple items to the end of the stored collection array:

```
modelColor1.push([
    modelColor1,
    modelColor2,
    modelColor3
]);
```

This will emit 'change' and 'push' events.

### Get

This returns then entire collection data array:

```
var allColors = modelColors.get();
```

This returns only a single item from the collection array at the specified index:

```
var greenData = modelColors.get(1);
```

### Update

This updates a single item in the collection array with new object data at the specified index:

```
modelColors.update(1, {
    isPrimaryColor: true
});
```

This extends the existing item object data, old properties are overwritten, new properties are added to the object.

or when the item data type is not an object it will simply overwrite completely the old data with new:

```
modelColors.update(1, true);
```

This will emit 'change' and 'update' events on the collection and on the item if it is a model.

When you don't pass in an index argument the collection is updated with all new data:

```
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
```

The new data must be an array. This will emit 'change' and 'update' events only on the collection.

### Delete

This deletes a model from the collection at the specified index:

```
modelColors.delete(2);
```

This will emit 'change' and 'delete' events.

This sets the collection data to an empty array.

```
modelColors.delete();
```

This will emit 'change' and 'delete' events.

## Initialize

At instantiation the initialize function will execute if defined:

```
const MyCollection = class extends Collection {
    initialize() {
        console.log('collection has initialized');
    }
};

const myCollection = new MyCollection();
```
