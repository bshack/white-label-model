# white-label-model

[![Build Status](https://travis-ci.org/bshack/white-label-model.svg?branch=master)](https://travis-ci.org/bshack/white-label-model) [![Coverage Status](https://coveralls.io/repos/github/bshack/white-label-model/badge.svg?branch=master)](https://coveralls.io/github/bshack/white-label-model?branch=master)

A simple ES6 JS data model that emits events on data change. Offers support for collections of models. Models are for object literals and collections are for arrays and maps.

Model and collection events are emitted using Node.js' events module. For more options on how to listen to events please look at the Node.js documentation:

https://nodejs.org/api/events.html

## Install

Install the node module:

```
npm install white-label-model --save
```

## Model Usage

white-label-model supports models and collections, this first example is for models only.

### Require

```
const Model = require('white-label-model').Model;
```

### Instantiate

Create a new empty model:

```
const modelColor = new Model();
```

optionally you can also set the model data at instantiation:

```
const modelColor = new Model({
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
modelColor.on('change', (data) => {
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

This will emit 'change' and 'set' events. If you do not what the model to emit any events you can pass in the 'silent' argument like so:

```
modelColor.set({
    name: 'red'
}, true);
```

### Get

Retreive the stored model data:

```
const redColorData = modelColor.get();
```

### Update

Update the stored model data with new data:

```
modelColor.update({
    name: 'blue',
    isPrimaryColor: true
});
```

This extends the existing model data, old properties are overwritten, new properties are added to the model. This will emit 'change' and 'update' events. If you do not what the model to emit any events you can pass in the 'silent' argument like so:

```
modelColor.update({
    name: 'blue',
    isPrimaryColor: true
}, true);
```

### Delete

This sets the model data to an empty object:

```
modelColor.delete();
```

This will emit 'change' and 'delete' events. If you do not what the model to emit any events you can pass in the 'silent' argument like so:

```
modelColor.delete(true);
```

### Destroy

Call this when you are done using the model:

```
modelColor.destroy();
```

This will delete all the data and remove all listeners for the model.


## Collection Usage

Collections can be either arrays or maps. They will default to arrays unless otherwise set. They can hold models or any other data types.

To support maps you will likely need to use a polyfill in your project such as the babel-polyfill:

http://babeljs.io/docs/usage/polyfill/

### Require

```
const Model = require('white-label-model').Model;
const Collection = require('white-label-model').Collection;
```

### Instantiate

Create a couple new models.

```
const modelColor1 = new Model({
    name: 'red'
});
const modelColor2 = new Model({
    name: 'green'
});
const modelColor3 = new Model({
    name: 'blue'
});
```

Now create a new collection to hold the models.

If you want your collection to be an array:

```
const modelColors = new Collection();
```
or
```
const modelColors = new Collection(new Array());
```

If you want your collection to be a map:

```
const modelColors = new Collection(new Map());
```

Optionally you can also set the collection data at instantiation:

#### array

```
const modelColors = new Collection([
    modelColor1,
    modelColor2,
    modelColor3
]);
```

#### map

```
const modelColors = new Collection(new Map([
    ['color1', modelColor1],
    ['color2', modelColor2],
    ['color3', modelColor3]
]));
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

#### models:

```
modelColor1.on('change', (data) => {
    console.log('Model 1 Data Change:', data);
});
modelColor2.on('change', (data) => {
    console.log('Model 2 Data Change:', data);
});
modelColor3.on('change', (data) => {
    console.log('Model 3 Data Change:', data);
});
```

#### collection:

```
modelColors.on('change', (data) => {
    console.log('Collection Data Change:', data);
});
```

Whenever these models or this collection change they will emit a 'change' event.

### Set

Set the collection contents:

#### array

```
modelColor1.set([
    modelColor1,
    modelColor2,
    modelColor3
]);
```

#### map

```
const modelColors = new Collection(new Map([
    ['color1', modelColor1],
    ['color2', modelColor2],
    ['color3', modelColor3]
]));
```

The data must be in an array or map and this will overwrite any existing array data stored completely.

This will emit 'change' and 'set' events.  If you do not what the model to emit any events you can pass in the 'silent' argument like so:

```
modelColor1.set([
    modelColor1,
    modelColor2,
    modelColor3
], true);
```

### Push

Add single items to the end of the stored collection:

#### array

```
modelColors.push(modelColor1);
modelColors.push(modelColor2);
modelColors.push(modelColor3);
```

#### map

```
modelColors.push('color1', modelColor1);
modelColors.push('color2', modelColor2);
modelColors.push('color3', modelColor3);
```

or add multiple items to the end of the stored collection:

#### array

```
modelColor1.push([
    modelColor1,
    modelColor2,
    modelColor3
]);
```

#### map

```
modelColor1.push(new Map([
    ['color1', modelColor1],
    ['color2', modelColor2],
    ['color3', modelColor3]
]));
```

This will emit 'change' and 'push' events. If you do not what the model to emit any events you can pass in the 'silent' argument like so:

```
modelColors.push(modelColor1, false, true);
```

or

```
modelColors.push('color1', modelColor1, true);
```

### Get

This returns then entire collection data:

```
const allColors = modelColors.get();
```

This returns only a single item from the collection at the specified index:

#### array

```
const greenData = modelColors.get(1);
```

#### map

```
const greenData = modelColors.get('color2');
```

### Update

This updates a single item in the collection with new object data at the specified index:

#### array

```
modelColors.update(1, {
    isPrimaryColor: true
});
```

#### map

```
modelColors.update('color2', {
    isPrimaryColor: true
});
```

This extends the existing item object data, old properties are overwritten, new properties are added to the object.

or when the item data type is not an object it will simply overwrite completely the old data with new:

#### array

```
modelColors.update(1, true);
```

#### map

```
modelColors.update('color2', true);
```

This will emit 'change' and 'update' events on the collection and on the item if it is a model.

When you don't pass in an index argument the collection is updated with all new data:

#### array

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

#### map

```
modelColors.update([
    ['color1', new Model({
        name: 'cyan'
    })],
    ['color2', new Model({
        name: 'magenta'
    })],
    ['color3', new Model({
        name: 'yellow'
    })],
    ['color4', new Model({
        name: 'black'
    })]
]);
```

The new data must be an array or map. This will emit 'change' and 'update' events only on the collection. If you do not what the model to emit any events you can pass in the 'silent' argument like so:

```
modelColors.update(1, {
    isPrimaryColor: true
}, true);
```

### Delete

This deletes a model from the collection at the specified index:

#### array

```
modelColors.delete(2);
```

#### map

```
modelColors.delete('color3');
```

This sets the collection data to an empty array or map.

```
modelColors.delete();
```

It respect the previous data type. For example if it was a map it will set it to an empty map.

This will emit 'change' and 'delete' events. If you do not what the model to emit any events you can pass in the 'silent' argument like so:

```
modelColors.delete(2, true);
```

or

```
modelColors.delete(false, true);
```

## Interacting with an API

The following methods have been subbed out for working with data from a service as a basic structure. They all return an object by default. You would simply redefined them when extending either the model or collection class.

```
modelColors.serviceGet();
modelColors.servicePatch();
modelColors.servicePost();
modelColors.servicePut();
```

These return promises by default.
