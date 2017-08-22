# state-update-builder

A javascript utility to navigate, update and then generate versionable copies of plain js objects

## Why You Should Use It
This small lib is useful in the following scenarios: 
- navigate through objects subtree and retrieve data
- shallow copy objects
- object versioning:
  - you have to change data or structure of a shallow copy without affecting the original
  - grant immutable objects using plain objects

## Install

```
  npm install --save state-update-builder 
```
## Basic Usage (ES6 syntax)
You can simply navigate and update create a copy of an object 
```javascript
import StateUpdateBuilder from 'state-update-builder'

let obj = {a:{ b:1},c:{ d:3}};

let builder = new StateUpdateBuilder(obj);

//set param b of a to 2
builder.traverseNode('a').set('b', 2);

let objNextState = builder.execute();

console.log(obj == objNextState) //returns false

console.log(obj.a == objNextState.a) //returns false

console.log(obj.c == objNextState.c) //returns true because only the "a" subtree is changed 

```

## PROPS
Name|Description
----|-----------
```origin```| current SUB subtree node. You should consider it as readonly prop
```current```| current SUB updated node. You should consider it as readonly prop

## API

#### API to navigate object
Name|Description|Return
----|-----------|------
```traverseNode(label:string)```|navigate to "label" subtree. "label" prop must be an object|a new StateUpdateBuilder (linked to caller SUB) positioned on "label" subtree
```traverseList(label:string, lambda:function)```|navigate from current subtree to "label" array than into the first element of "lambda" that matches lambda condition|a new StateUpdateBuilder (linked to caller SUB) positioned on matched "label" element subtree

#### API to update object subtree
Name|Description|Return
----|-----------|------
```set(label:string, value:any)```|set "value" to "label" (original object wont be affected)|current SUB
```setNode(node:any)```|replace current subtree with "node" (original object wont be affected)|current SUB
```merge(label:string, value)```|merge "value" with "label" (original object wont be affected)|current SUB
```mergeNode(node:object)```|merge current subtree with "node" (original object wont be affected)|current SUB
```removeNode(label:string [, lambda:function])```| remove "label" subtree (original object wont be affected). If "label" is an array and you you can pass lambda to select the element you want to remove (without lambda the whole array will be removed)|current SUB
```push(label:string, array:Array)```|add "array" elements into "label" array (original object wont be affected)|current SUB
```unshift(label:string, array:Array)```|remove "array" elments from "label" array (original object wont be affected)|current SUB
```splice(label:string, array:Array of Array)```| for each item of "array" calls splice on "label" array (original object wont be affected)|current SUB
```apply(label:string, fn:function)```| calls "fn" passing the value of "label" then update "label" with the function result|current SUB

#### API to manage Current State
Name|Description|Return
----|-----------|------
```checkNodeUpdated()```|check if node related to current SUB has been modified|bool
```checkError()```|check if current SUB is in error|bool
```resetError()```|remove error status to current SUB and to related ancestors|void

Note: the traverse functions returns a new StateUpdateBuilder linked to the caller SUB with a parent-child relationship. When a SUB generates an exception, an error status will be set and propagated to every parent SUB.

#### Generate object
Name|Description|Return
----|-----------|------
```execute()```|generates the new object version|bool

### TODO
  - add more examples
  - use a.b.c syntax in labels to navigate and update model at the same time
