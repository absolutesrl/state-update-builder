!function(r,n){"object"==typeof exports&&"object"==typeof module?module.exports=n():"function"==typeof define&&define.amd?define([],n):"object"==typeof exports?exports["state-update-builder"]=n():r["state-update-builder"]=n()}(this,function(){return function(r){function n(e){if(c[e])return c[e].exports;var I=c[e]={i:e,l:!1,exports:{}};return r[e].call(I.exports,I,I.exports,n),I.l=!0,I.exports}var c={};return n.m=r,n.c=c,n.i=function(r){return r},n.d=function(r,c,e){n.o(r,c)||Object.defineProperty(r,c,{configurable:!1,enumerable:!0,get:e})},n.n=function(r){var c=r&&r.__esModule?function(){return r.default}:function(){return r};return n.d(c,"a",c),c},n.o=function(r,n){return Object.prototype.hasOwnProperty.call(r,n)},n.p="",n(n.s=0)}([function(module,__webpack_exports__,__webpack_require__){"use strict";eval("Object.defineProperty(__webpack_exports__, \"__esModule\", { value: true });\nconst defaultOptions = {\r\n    enableWarnings: false,\r\n    errorsLog: true\r\n};\r\n\r\n\r\n//TODO: ad warnings\r\nclass StateUpdateBuilder {\r\n    constructor(state, options) {\r\n        if (state == undefined)\r\n            console.error('root cannot be null');\r\n\r\n        this._options = Object.assign({}, defaultOptions, options);\r\n\r\n        this.current = this.extendNode(state);\r\n        this.origin = state;\r\n        this.parent = undefined;\r\n        this.parent = undefined;\r\n        this._updated = false;\r\n        this._lastNode = undefined;\r\n        this._refLabel = undefined;\r\n    }\r\n\r\n    //generate a StateUpdateBuilder as passing current root as an\r\n    initChildBuider(newOrigin, lastNode, label) {\r\n        var childBuilder = new StateUpdateBuilder(newOrigin, this._options);\r\n\r\n        //propagate parent builder informations\r\n        childBuilder.parent = this;\r\n        childBuilder._lastNode = lastNode;\r\n        childBuilder._refLabel = label;\r\n\r\n        return childBuilder;\r\n    }\r\n\r\n    //creates new reference for arrays, objects and functions\r\n    extendNode(node) {\r\n        if (Array.isArray(node))\r\n            return [].concat(node);\r\n\r\n        if (typeof node === 'object')\r\n            return Object.assign({}, node);\r\n\r\n        if (typeof node === 'function')\r\n            return () => node();\r\n\r\n        return node\r\n    }\r\n\r\n    //traverse single node object\r\n    traverseNode(label) {\r\n        if (this._treeError) return this;\r\n\r\n        var node = this.current[label];\r\n        if (checkNodeUndefined.call(this, node, label))\r\n            return this;\r\n\r\n        //create new builder with shallow copy of traversed node\r\n        var resultBuilder = this.initChildBuider(node, this.current, label);\r\n\r\n        //assign node copy to parent pointer\r\n        this.current[label] = resultBuilder.current;\r\n\r\n        //returns new builder\r\n        return resultBuilder;\r\n    }\r\n\r\n    //traverse single array object navigate to array instance\r\n    traverseList(label, lambda) {\r\n        if (this._treeError) return this;\r\n\r\n        var node = this.current[label];\r\n\r\n        if (checkNodeUndefined.call(this, node, label) || checkNodeNotArray.call(this, node, label)) {\r\n            this.propagateError(true);\r\n            return this;\r\n        }\r\n\r\n        var choosePath = (el, i) => typeof lambda === 'function' ? lambda(el, i) : true;\r\n        var elemIndex = node.findIndex(choosePath);\r\n\r\n        if (checkListItemUndefined.call(this, elemIndex, label)) return this;\r\n\r\n        var lastNode = this.extendNode(node);\r\n        //create new builder positioned on item found\r\n        var resultBuilder = this.initChildBuider(node.find(choosePath), lastNode, elemIndex);\r\n\r\n        //generate new reference to current node array\r\n        this.current[label] = lastNode;\r\n        this.current[label][elemIndex] = resultBuilder.current;\r\n\r\n        return resultBuilder;\r\n    }\r\n\r\n    //check \"label\" node presence\r\n    checkSubtree(label, lambda) {\r\n        if (this._treeError) return this;\r\n\r\n        const node = this.current[label];\r\n\r\n        if (checkNodeUndefined.call(this, node, label))\r\n            return false;\r\n\r\n        if (Array.isArray(node)) {\r\n            var choosePath = (el, i) => typeof lambda === 'function' ? lambda(el, i) : false;\r\n            var elemIndex = node.findIndex(choosePath);\r\n            return elemIndex >= 0;\r\n        }\r\n        if (typeof lambda === 'function')\r\n            return !!lambda(node);\r\n\r\n        return true;\r\n    }\r\n\r\n    //UPDATE OPERATIONS\r\n    //{$set: any} replace the target entirely.\r\n    set(label, value) {\r\n        if (this._treeError) return this;\r\n\r\n        if (this._options.enableWarnings && this.current[label] === undefined && label !== null)\r\n            console.error('SUB - Warning: node \"' + label + '\" not found');\r\n\r\n        this.propagateUpdate(this._updated || this.current[label] !== value);\r\n        this.current[label] = value;\r\n\r\n\r\n        return this;\r\n    }\r\n\r\n    setNode(node) {\r\n        if (this._treeError) return this;\r\n\r\n        if (!this._lastNode) {\r\n            this.current = node;\r\n            this.propagateUpdate(this._updated || this.current !== node);\r\n        }\r\n        else {\r\n            this._lastNode[this._refLabel] = node;\r\n            this.propagateUpdate(this._updated || this._lastNode[this._refLabel] !== node);\r\n        }\r\n\r\n        return this;\r\n    }\r\n\r\n    //{$merge: object} merge the keys of object with the target.\r\n    merge(label, value) {\r\n        if (this._treeError) return this;\r\n\r\n        if (this._options.enableWarnings && typeof value !== 'object') {\r\n            console.error('SUB - Warning: \"value\" is not an object');\r\n            return this;\r\n        }\r\n\r\n        var node = this.current[label];\r\n\r\n        this.propagateUpdate(this._updated || Object.keys(value).reduce((p, c) => p || node[c] !== value[c], false));\r\n\r\n        this.current[label] = Object.assign(node, value);\r\n\r\n\r\n        return this;\r\n    }\r\n\r\n    mergeNode(node) {\r\n        if (this._treeError) return this;\r\n\r\n        var elem = this._lastNode ? this._lastNode[this._refLabel] : this.current;\r\n        this.propagateUpdate(this._updated || Object.keys(node).reduce((p, c) => p || elem[c] !== node[c], false));\r\n\r\n        if (!this._lastNode) {\r\n            this.current = Object.assign(this.current, node);\r\n        }\r\n        else\r\n            this._lastNode[this._refLabel] = Object.assign(this._lastNode[this._refLabel], node);\r\n\r\n        return this;\r\n    }\r\n\r\n    //remove child node of current object/array node\r\n    removeNode(label, lambda) {\r\n        var node = this.current[label];\r\n\r\n        if (node == undefined) return this;\r\n\r\n        if (Array.isArray(node) && typeof lambda === 'function') {\r\n            var elemIndex = node.findIndex(lambda);\r\n            elemIndex >= 0 && this.splice(elemIndex, 1);\r\n            return this;\r\n        }\r\n\r\n        this.current[label] = undefined;\r\n        this.propagateUpdate(true);\r\n\r\n        return this;\r\n    }\r\n\r\n    //{$apply: function} passes in the current value to the function and updates it with the new returned value.\r\n    apply(label, fn) {\r\n        if (this._treeError) return this;\r\n\r\n        var node = this.current[label];\r\n        if (checkNodeUndefined.call(this, node, label) || checkNotFunction.call(this, fn))\r\n            return this;\r\n\r\n        this.current[label] = fn(this.extendNode(node));\r\n\r\n        this.propagateUpdate(this._updated || node !== this.current[label]);\r\n\r\n        return this;\r\n    }\r\n\r\n    //{$push: array} push() all the items in array on the target.\r\n    push(label, array) {\r\n        if (this._treeError) return this;\r\n        var node = this.current[label];\r\n        if (checkNodeUndefined.call(this, node, label) || checkNodeNotArray.call(this, array, label))\r\n            return this;\r\n\r\n        var newNode = this.current[label] = this.extendNode(node);\r\n        Array.prototype.push.apply(newNode, array);\r\n        this.propagateUpdate(true);\r\n\r\n        return this; //returns the same builder\r\n\r\n\r\n    }\r\n\r\n    //{$unshift: array} unshift() all the items in array on the target.\r\n    unshift(label, array) {\r\n        if (this._treeError) return this;\r\n        var node = this.current[label];\r\n        if (checkNodeUndefined.call(this, node, label) || checkNodeNotArray.call(this, array, label))\r\n            return this;\r\n\r\n        var newNode = this.current[label] = this.extendNode(node);\r\n        Array.prototype.unshift.apply(newNode, array);\r\n        this.propagateUpdate(this._updated || array.length > 0);\r\n\r\n        return this; //returns the same builder\r\n    }\r\n\r\n    //{$splice: array of arrays} for each item in arrays call splice() on the target with the parameters provided by the item.\r\n    splice(label, ...args) {\r\n        if (this._treeError) return this;\r\n        var node = this.current[label];\r\n        if (checkNodeUndefined.call(this, node, label) || checkNodeNotArray.call(this, node, label))\r\n            return this;\r\n\r\n        var newNode = this.current[label] = this.extendNode(node);\r\n        Array.prototype.splice.apply(newNode, args);\r\n\r\n        this.propagateUpdate(this._updated || args.length > 0);\r\n\r\n        return this; //returns the same builder\r\n    }\r\n\r\n\r\n    execute() {\r\n        return this.parent\r\n            ? this.parent.execute()\r\n            : this._treeError ? this.origin : this.current;\r\n    }\r\n\r\n    checkError() {\r\n        return this._treeError;\r\n    }\r\n\r\n    propagateUpdate(update) {\r\n        this._updated = update;\r\n        if (update)\r\n            this.parent && this.parent.propagateUpdate(update);\r\n    };\r\n\r\n    propagateError(error) {\r\n        this._treeError = error;\r\n        this.parent && this.parent.propagateError(error);\r\n    };\r\n\r\n    resetError() {\r\n        this.propagateError(false);\r\n        return this;\r\n    }\r\n\r\n    checkNodeUpdated() {\r\n        return this._updated;\r\n    }\r\n\r\n    pruneSubtree(label) {\r\n        if (this._treeError) return this;\r\n\r\n        var node = this.current[label];\r\n        if (this._options.enableWarnings && node === undefined && label !== null)\r\n            console.error('SUB - Warning: node \"' + label + '\" not found');\r\n\r\n        if (node != undefined)\r\n            this.current[label] = this.origin[label];\r\n        else {\r\n            if (this._lastNode == undefined) {\r\n                if (this._options.errorsLog)\r\n                    console.error('SUB - Error: cannot prune node root');\r\n            }\r\n            else\r\n                this._lastNode[this._refLabel] = this.origin;\r\n        }\r\n        return this.parent || this;\r\n    }\r\n}\n/* harmony export (immutable) */ __webpack_exports__[\"default\"] = StateUpdateBuilder;\n\r\n\r\n///ERROR CHECK AND NOTIFICATION\r\nfunction checkNodeUndefined(node, label) {\r\n    if (node != undefined) return false;\r\n\r\n    this.propagateError(true);\r\n    if (this._options.errorsLog)\r\n        console.error('SUB - Error: node \"' + label + '\" not found');\r\n    return true;\r\n}\r\n\r\nfunction checkListItemUndefined(elemIndex, label) {\r\n    if (elemIndex !== -1) return false;\r\n\r\n    this.propagateError(true);\r\n    if (this._options.errorsLog)\r\n        console.error('SUB - Error: elem of list \"' + label + '\" not found');\r\n    return true;\r\n}\r\n\r\nfunction checkNodeNotArray(node, label) {\r\n    if (Array.isArray(node)) return false;\r\n\r\n    this.propagateError(true);\r\n    if (this._options.errorsLog)\r\n        console.error('SUB - Error: node \"' + label + '\" is not an array');\r\n    return true;\r\n}\r\n\r\nfunction checkNotFunction(fn) {\r\n    if (typeof fn === 'function') return false;\r\n\r\n    this.propagateError(true);\r\n    if (this._options.errorsLog)\r\n        console.error('SUB - Error: parameter \"fn\" is not a function');\r\n    return true;\r\n}\r\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMC5qcyIsInNvdXJjZXMiOlsid2VicGFjazovLy8uL3NyYy9pbmRleC5qcz85NTUyIl0sInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGRlZmF1bHRPcHRpb25zID0ge1xyXG4gICAgZW5hYmxlV2FybmluZ3M6IGZhbHNlLFxyXG4gICAgZXJyb3JzTG9nOiB0cnVlXHJcbn07XHJcblxyXG5cclxuLy9UT0RPOiBhZCB3YXJuaW5nc1xyXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBTdGF0ZVVwZGF0ZUJ1aWxkZXIge1xyXG4gICAgY29uc3RydWN0b3Ioc3RhdGUsIG9wdGlvbnMpIHtcclxuICAgICAgICBpZiAoc3RhdGUgPT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdyb290IGNhbm5vdCBiZSBudWxsJyk7XHJcblxyXG4gICAgICAgIHRoaXMuX29wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBkZWZhdWx0T3B0aW9ucywgb3B0aW9ucyk7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudCA9IHRoaXMuZXh0ZW5kTm9kZShzdGF0ZSk7XHJcbiAgICAgICAgdGhpcy5vcmlnaW4gPSBzdGF0ZTtcclxuICAgICAgICB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZDtcclxuICAgICAgICB0aGlzLnBhcmVudCA9IHVuZGVmaW5lZDtcclxuICAgICAgICB0aGlzLl91cGRhdGVkID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5fbGFzdE5vZGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgdGhpcy5fcmVmTGFiZWwgPSB1bmRlZmluZWQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy9nZW5lcmF0ZSBhIFN0YXRlVXBkYXRlQnVpbGRlciBhcyBwYXNzaW5nIGN1cnJlbnQgcm9vdCBhcyBhblxyXG4gICAgaW5pdENoaWxkQnVpZGVyKG5ld09yaWdpbiwgbGFzdE5vZGUsIGxhYmVsKSB7XHJcbiAgICAgICAgdmFyIGNoaWxkQnVpbGRlciA9IG5ldyBTdGF0ZVVwZGF0ZUJ1aWxkZXIobmV3T3JpZ2luLCB0aGlzLl9vcHRpb25zKTtcclxuXHJcbiAgICAgICAgLy9wcm9wYWdhdGUgcGFyZW50IGJ1aWxkZXIgaW5mb3JtYXRpb25zXHJcbiAgICAgICAgY2hpbGRCdWlsZGVyLnBhcmVudCA9IHRoaXM7XHJcbiAgICAgICAgY2hpbGRCdWlsZGVyLl9sYXN0Tm9kZSA9IGxhc3ROb2RlO1xyXG4gICAgICAgIGNoaWxkQnVpbGRlci5fcmVmTGFiZWwgPSBsYWJlbDtcclxuXHJcbiAgICAgICAgcmV0dXJuIGNoaWxkQnVpbGRlcjtcclxuICAgIH1cclxuXHJcbiAgICAvL2NyZWF0ZXMgbmV3IHJlZmVyZW5jZSBmb3IgYXJyYXlzLCBvYmplY3RzIGFuZCBmdW5jdGlvbnNcclxuICAgIGV4dGVuZE5vZGUobm9kZSkge1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKVxyXG4gICAgICAgICAgICByZXR1cm4gW10uY29uY2F0KG5vZGUpO1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIG5vZGUgPT09ICdvYmplY3QnKVxyXG4gICAgICAgICAgICByZXR1cm4gT2JqZWN0LmFzc2lnbih7fSwgbm9kZSk7XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygbm9kZSA9PT0gJ2Z1bmN0aW9uJylcclxuICAgICAgICAgICAgcmV0dXJuICgpID0+IG5vZGUoKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG5vZGVcclxuICAgIH1cclxuXHJcbiAgICAvL3RyYXZlcnNlIHNpbmdsZSBub2RlIG9iamVjdFxyXG4gICAgdHJhdmVyc2VOb2RlKGxhYmVsKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3RyZWVFcnJvcikgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5jdXJyZW50W2xhYmVsXTtcclxuICAgICAgICBpZiAoY2hlY2tOb2RlVW5kZWZpbmVkLmNhbGwodGhpcywgbm9kZSwgbGFiZWwpKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuXHJcbiAgICAgICAgLy9jcmVhdGUgbmV3IGJ1aWxkZXIgd2l0aCBzaGFsbG93IGNvcHkgb2YgdHJhdmVyc2VkIG5vZGVcclxuICAgICAgICB2YXIgcmVzdWx0QnVpbGRlciA9IHRoaXMuaW5pdENoaWxkQnVpZGVyKG5vZGUsIHRoaXMuY3VycmVudCwgbGFiZWwpO1xyXG5cclxuICAgICAgICAvL2Fzc2lnbiBub2RlIGNvcHkgdG8gcGFyZW50IHBvaW50ZXJcclxuICAgICAgICB0aGlzLmN1cnJlbnRbbGFiZWxdID0gcmVzdWx0QnVpbGRlci5jdXJyZW50O1xyXG5cclxuICAgICAgICAvL3JldHVybnMgbmV3IGJ1aWxkZXJcclxuICAgICAgICByZXR1cm4gcmVzdWx0QnVpbGRlcjtcclxuICAgIH1cclxuXHJcbiAgICAvL3RyYXZlcnNlIHNpbmdsZSBhcnJheSBvYmplY3QgbmF2aWdhdGUgdG8gYXJyYXkgaW5zdGFuY2VcclxuICAgIHRyYXZlcnNlTGlzdChsYWJlbCwgbGFtYmRhKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3RyZWVFcnJvcikgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5jdXJyZW50W2xhYmVsXTtcclxuXHJcbiAgICAgICAgaWYgKGNoZWNrTm9kZVVuZGVmaW5lZC5jYWxsKHRoaXMsIG5vZGUsIGxhYmVsKSB8fCBjaGVja05vZGVOb3RBcnJheS5jYWxsKHRoaXMsIG5vZGUsIGxhYmVsKSkge1xyXG4gICAgICAgICAgICB0aGlzLnByb3BhZ2F0ZUVycm9yKHRydWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBjaG9vc2VQYXRoID0gKGVsLCBpKSA9PiB0eXBlb2YgbGFtYmRhID09PSAnZnVuY3Rpb24nID8gbGFtYmRhKGVsLCBpKSA6IHRydWU7XHJcbiAgICAgICAgdmFyIGVsZW1JbmRleCA9IG5vZGUuZmluZEluZGV4KGNob29zZVBhdGgpO1xyXG5cclxuICAgICAgICBpZiAoY2hlY2tMaXN0SXRlbVVuZGVmaW5lZC5jYWxsKHRoaXMsIGVsZW1JbmRleCwgbGFiZWwpKSByZXR1cm4gdGhpcztcclxuXHJcbiAgICAgICAgdmFyIGxhc3ROb2RlID0gdGhpcy5leHRlbmROb2RlKG5vZGUpO1xyXG4gICAgICAgIC8vY3JlYXRlIG5ldyBidWlsZGVyIHBvc2l0aW9uZWQgb24gaXRlbSBmb3VuZFxyXG4gICAgICAgIHZhciByZXN1bHRCdWlsZGVyID0gdGhpcy5pbml0Q2hpbGRCdWlkZXIobm9kZS5maW5kKGNob29zZVBhdGgpLCBsYXN0Tm9kZSwgZWxlbUluZGV4KTtcclxuXHJcbiAgICAgICAgLy9nZW5lcmF0ZSBuZXcgcmVmZXJlbmNlIHRvIGN1cnJlbnQgbm9kZSBhcnJheVxyXG4gICAgICAgIHRoaXMuY3VycmVudFtsYWJlbF0gPSBsYXN0Tm9kZTtcclxuICAgICAgICB0aGlzLmN1cnJlbnRbbGFiZWxdW2VsZW1JbmRleF0gPSByZXN1bHRCdWlsZGVyLmN1cnJlbnQ7XHJcblxyXG4gICAgICAgIHJldHVybiByZXN1bHRCdWlsZGVyO1xyXG4gICAgfVxyXG5cclxuICAgIC8vY2hlY2sgXCJsYWJlbFwiIG5vZGUgcHJlc2VuY2VcclxuICAgIGNoZWNrU3VidHJlZShsYWJlbCwgbGFtYmRhKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3RyZWVFcnJvcikgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICAgIGNvbnN0IG5vZGUgPSB0aGlzLmN1cnJlbnRbbGFiZWxdO1xyXG5cclxuICAgICAgICBpZiAoY2hlY2tOb2RlVW5kZWZpbmVkLmNhbGwodGhpcywgbm9kZSwgbGFiZWwpKVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSB7XHJcbiAgICAgICAgICAgIHZhciBjaG9vc2VQYXRoID0gKGVsLCBpKSA9PiB0eXBlb2YgbGFtYmRhID09PSAnZnVuY3Rpb24nID8gbGFtYmRhKGVsLCBpKSA6IGZhbHNlO1xyXG4gICAgICAgICAgICB2YXIgZWxlbUluZGV4ID0gbm9kZS5maW5kSW5kZXgoY2hvb3NlUGF0aCk7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtSW5kZXggPj0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiBsYW1iZGEgPT09ICdmdW5jdGlvbicpXHJcbiAgICAgICAgICAgIHJldHVybiAhIWxhbWJkYShub2RlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgLy9VUERBVEUgT1BFUkFUSU9OU1xyXG4gICAgLy97JHNldDogYW55fSByZXBsYWNlIHRoZSB0YXJnZXQgZW50aXJlbHkuXHJcbiAgICBzZXQobGFiZWwsIHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3RyZWVFcnJvcikgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICAgIGlmICh0aGlzLl9vcHRpb25zLmVuYWJsZVdhcm5pbmdzICYmIHRoaXMuY3VycmVudFtsYWJlbF0gPT09IHVuZGVmaW5lZCAmJiBsYWJlbCAhPT0gbnVsbClcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignU1VCIC0gV2FybmluZzogbm9kZSBcIicgKyBsYWJlbCArICdcIiBub3QgZm91bmQnKTtcclxuXHJcbiAgICAgICAgdGhpcy5wcm9wYWdhdGVVcGRhdGUodGhpcy5fdXBkYXRlZCB8fCB0aGlzLmN1cnJlbnRbbGFiZWxdICE9PSB2YWx1ZSk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50W2xhYmVsXSA9IHZhbHVlO1xyXG5cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0Tm9kZShub2RlKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuX3RyZWVFcnJvcikgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5fbGFzdE5vZGUpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50ID0gbm9kZTtcclxuICAgICAgICAgICAgdGhpcy5wcm9wYWdhdGVVcGRhdGUodGhpcy5fdXBkYXRlZCB8fCB0aGlzLmN1cnJlbnQgIT09IG5vZGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5fbGFzdE5vZGVbdGhpcy5fcmVmTGFiZWxdID0gbm9kZTtcclxuICAgICAgICAgICAgdGhpcy5wcm9wYWdhdGVVcGRhdGUodGhpcy5fdXBkYXRlZCB8fCB0aGlzLl9sYXN0Tm9kZVt0aGlzLl9yZWZMYWJlbF0gIT09IG5vZGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLy97JG1lcmdlOiBvYmplY3R9IG1lcmdlIHRoZSBrZXlzIG9mIG9iamVjdCB3aXRoIHRoZSB0YXJnZXQuXHJcbiAgICBtZXJnZShsYWJlbCwgdmFsdWUpIHtcclxuICAgICAgICBpZiAodGhpcy5fdHJlZUVycm9yKSByZXR1cm4gdGhpcztcclxuXHJcbiAgICAgICAgaWYgKHRoaXMuX29wdGlvbnMuZW5hYmxlV2FybmluZ3MgJiYgdHlwZW9mIHZhbHVlICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdTVUIgLSBXYXJuaW5nOiBcInZhbHVlXCIgaXMgbm90IGFuIG9iamVjdCcpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5jdXJyZW50W2xhYmVsXTtcclxuXHJcbiAgICAgICAgdGhpcy5wcm9wYWdhdGVVcGRhdGUodGhpcy5fdXBkYXRlZCB8fCBPYmplY3Qua2V5cyh2YWx1ZSkucmVkdWNlKChwLCBjKSA9PiBwIHx8IG5vZGVbY10gIT09IHZhbHVlW2NdLCBmYWxzZSkpO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnRbbGFiZWxdID0gT2JqZWN0LmFzc2lnbihub2RlLCB2YWx1ZSk7XHJcblxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICBtZXJnZU5vZGUobm9kZSkge1xyXG4gICAgICAgIGlmICh0aGlzLl90cmVlRXJyb3IpIHJldHVybiB0aGlzO1xyXG5cclxuICAgICAgICB2YXIgZWxlbSA9IHRoaXMuX2xhc3ROb2RlID8gdGhpcy5fbGFzdE5vZGVbdGhpcy5fcmVmTGFiZWxdIDogdGhpcy5jdXJyZW50O1xyXG4gICAgICAgIHRoaXMucHJvcGFnYXRlVXBkYXRlKHRoaXMuX3VwZGF0ZWQgfHwgT2JqZWN0LmtleXMobm9kZSkucmVkdWNlKChwLCBjKSA9PiBwIHx8IGVsZW1bY10gIT09IG5vZGVbY10sIGZhbHNlKSk7XHJcblxyXG4gICAgICAgIGlmICghdGhpcy5fbGFzdE5vZGUpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50ID0gT2JqZWN0LmFzc2lnbih0aGlzLmN1cnJlbnQsIG5vZGUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHRoaXMuX2xhc3ROb2RlW3RoaXMuX3JlZkxhYmVsXSA9IE9iamVjdC5hc3NpZ24odGhpcy5fbGFzdE5vZGVbdGhpcy5fcmVmTGFiZWxdLCBub2RlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLy9yZW1vdmUgY2hpbGQgbm9kZSBvZiBjdXJyZW50IG9iamVjdC9hcnJheSBub2RlXHJcbiAgICByZW1vdmVOb2RlKGxhYmVsLCBsYW1iZGEpIHtcclxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuY3VycmVudFtsYWJlbF07XHJcblxyXG4gICAgICAgIGlmIChub2RlID09IHVuZGVmaW5lZCkgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpICYmIHR5cGVvZiBsYW1iZGEgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgdmFyIGVsZW1JbmRleCA9IG5vZGUuZmluZEluZGV4KGxhbWJkYSk7XHJcbiAgICAgICAgICAgIGVsZW1JbmRleCA+PSAwICYmIHRoaXMuc3BsaWNlKGVsZW1JbmRleCwgMSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50W2xhYmVsXSA9IHVuZGVmaW5lZDtcclxuICAgICAgICB0aGlzLnByb3BhZ2F0ZVVwZGF0ZSh0cnVlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgLy97JGFwcGx5OiBmdW5jdGlvbn0gcGFzc2VzIGluIHRoZSBjdXJyZW50IHZhbHVlIHRvIHRoZSBmdW5jdGlvbiBhbmQgdXBkYXRlcyBpdCB3aXRoIHRoZSBuZXcgcmV0dXJuZWQgdmFsdWUuXHJcbiAgICBhcHBseShsYWJlbCwgZm4pIHtcclxuICAgICAgICBpZiAodGhpcy5fdHJlZUVycm9yKSByZXR1cm4gdGhpcztcclxuXHJcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLmN1cnJlbnRbbGFiZWxdO1xyXG4gICAgICAgIGlmIChjaGVja05vZGVVbmRlZmluZWQuY2FsbCh0aGlzLCBub2RlLCBsYWJlbCkgfHwgY2hlY2tOb3RGdW5jdGlvbi5jYWxsKHRoaXMsIGZuKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudFtsYWJlbF0gPSBmbih0aGlzLmV4dGVuZE5vZGUobm9kZSkpO1xyXG5cclxuICAgICAgICB0aGlzLnByb3BhZ2F0ZVVwZGF0ZSh0aGlzLl91cGRhdGVkIHx8IG5vZGUgIT09IHRoaXMuY3VycmVudFtsYWJlbF0pO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuXHJcbiAgICAvL3skcHVzaDogYXJyYXl9IHB1c2goKSBhbGwgdGhlIGl0ZW1zIGluIGFycmF5IG9uIHRoZSB0YXJnZXQuXHJcbiAgICBwdXNoKGxhYmVsLCBhcnJheSkge1xyXG4gICAgICAgIGlmICh0aGlzLl90cmVlRXJyb3IpIHJldHVybiB0aGlzO1xyXG4gICAgICAgIHZhciBub2RlID0gdGhpcy5jdXJyZW50W2xhYmVsXTtcclxuICAgICAgICBpZiAoY2hlY2tOb2RlVW5kZWZpbmVkLmNhbGwodGhpcywgbm9kZSwgbGFiZWwpIHx8IGNoZWNrTm9kZU5vdEFycmF5LmNhbGwodGhpcywgYXJyYXksIGxhYmVsKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICAgIHZhciBuZXdOb2RlID0gdGhpcy5jdXJyZW50W2xhYmVsXSA9IHRoaXMuZXh0ZW5kTm9kZShub2RlKTtcclxuICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShuZXdOb2RlLCBhcnJheSk7XHJcbiAgICAgICAgdGhpcy5wcm9wYWdhdGVVcGRhdGUodHJ1ZSk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzOyAvL3JldHVybnMgdGhlIHNhbWUgYnVpbGRlclxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy97JHVuc2hpZnQ6IGFycmF5fSB1bnNoaWZ0KCkgYWxsIHRoZSBpdGVtcyBpbiBhcnJheSBvbiB0aGUgdGFyZ2V0LlxyXG4gICAgdW5zaGlmdChsYWJlbCwgYXJyYXkpIHtcclxuICAgICAgICBpZiAodGhpcy5fdHJlZUVycm9yKSByZXR1cm4gdGhpcztcclxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuY3VycmVudFtsYWJlbF07XHJcbiAgICAgICAgaWYgKGNoZWNrTm9kZVVuZGVmaW5lZC5jYWxsKHRoaXMsIG5vZGUsIGxhYmVsKSB8fCBjaGVja05vZGVOb3RBcnJheS5jYWxsKHRoaXMsIGFycmF5LCBsYWJlbCkpXHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG5cclxuICAgICAgICB2YXIgbmV3Tm9kZSA9IHRoaXMuY3VycmVudFtsYWJlbF0gPSB0aGlzLmV4dGVuZE5vZGUobm9kZSk7XHJcbiAgICAgICAgQXJyYXkucHJvdG90eXBlLnVuc2hpZnQuYXBwbHkobmV3Tm9kZSwgYXJyYXkpO1xyXG4gICAgICAgIHRoaXMucHJvcGFnYXRlVXBkYXRlKHRoaXMuX3VwZGF0ZWQgfHwgYXJyYXkubGVuZ3RoID4gMCk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzOyAvL3JldHVybnMgdGhlIHNhbWUgYnVpbGRlclxyXG4gICAgfVxyXG5cclxuICAgIC8veyRzcGxpY2U6IGFycmF5IG9mIGFycmF5c30gZm9yIGVhY2ggaXRlbSBpbiBhcnJheXMgY2FsbCBzcGxpY2UoKSBvbiB0aGUgdGFyZ2V0IHdpdGggdGhlIHBhcmFtZXRlcnMgcHJvdmlkZWQgYnkgdGhlIGl0ZW0uXHJcbiAgICBzcGxpY2UobGFiZWwsIC4uLmFyZ3MpIHtcclxuICAgICAgICBpZiAodGhpcy5fdHJlZUVycm9yKSByZXR1cm4gdGhpcztcclxuICAgICAgICB2YXIgbm9kZSA9IHRoaXMuY3VycmVudFtsYWJlbF07XHJcbiAgICAgICAgaWYgKGNoZWNrTm9kZVVuZGVmaW5lZC5jYWxsKHRoaXMsIG5vZGUsIGxhYmVsKSB8fCBjaGVja05vZGVOb3RBcnJheS5jYWxsKHRoaXMsIG5vZGUsIGxhYmVsKSlcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcblxyXG4gICAgICAgIHZhciBuZXdOb2RlID0gdGhpcy5jdXJyZW50W2xhYmVsXSA9IHRoaXMuZXh0ZW5kTm9kZShub2RlKTtcclxuICAgICAgICBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KG5ld05vZGUsIGFyZ3MpO1xyXG5cclxuICAgICAgICB0aGlzLnByb3BhZ2F0ZVVwZGF0ZSh0aGlzLl91cGRhdGVkIHx8IGFyZ3MubGVuZ3RoID4gMCk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzOyAvL3JldHVybnMgdGhlIHNhbWUgYnVpbGRlclxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleGVjdXRlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnBhcmVudFxyXG4gICAgICAgICAgICA/IHRoaXMucGFyZW50LmV4ZWN1dGUoKVxyXG4gICAgICAgICAgICA6IHRoaXMuX3RyZWVFcnJvciA/IHRoaXMub3JpZ2luIDogdGhpcy5jdXJyZW50O1xyXG4gICAgfVxyXG5cclxuICAgIGNoZWNrRXJyb3IoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuX3RyZWVFcnJvcjtcclxuICAgIH1cclxuXHJcbiAgICBwcm9wYWdhdGVVcGRhdGUodXBkYXRlKSB7XHJcbiAgICAgICAgdGhpcy5fdXBkYXRlZCA9IHVwZGF0ZTtcclxuICAgICAgICBpZiAodXBkYXRlKVxyXG4gICAgICAgICAgICB0aGlzLnBhcmVudCAmJiB0aGlzLnBhcmVudC5wcm9wYWdhdGVVcGRhdGUodXBkYXRlKTtcclxuICAgIH07XHJcblxyXG4gICAgcHJvcGFnYXRlRXJyb3IoZXJyb3IpIHtcclxuICAgICAgICB0aGlzLl90cmVlRXJyb3IgPSBlcnJvcjtcclxuICAgICAgICB0aGlzLnBhcmVudCAmJiB0aGlzLnBhcmVudC5wcm9wYWdhdGVFcnJvcihlcnJvcik7XHJcbiAgICB9O1xyXG5cclxuICAgIHJlc2V0RXJyb3IoKSB7XHJcbiAgICAgICAgdGhpcy5wcm9wYWdhdGVFcnJvcihmYWxzZSk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcblxyXG4gICAgY2hlY2tOb2RlVXBkYXRlZCgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5fdXBkYXRlZDtcclxuICAgIH1cclxuXHJcbiAgICBwcnVuZVN1YnRyZWUobGFiZWwpIHtcclxuICAgICAgICBpZiAodGhpcy5fdHJlZUVycm9yKSByZXR1cm4gdGhpcztcclxuXHJcbiAgICAgICAgdmFyIG5vZGUgPSB0aGlzLmN1cnJlbnRbbGFiZWxdO1xyXG4gICAgICAgIGlmICh0aGlzLl9vcHRpb25zLmVuYWJsZVdhcm5pbmdzICYmIG5vZGUgPT09IHVuZGVmaW5lZCAmJiBsYWJlbCAhPT0gbnVsbClcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcignU1VCIC0gV2FybmluZzogbm9kZSBcIicgKyBsYWJlbCArICdcIiBub3QgZm91bmQnKTtcclxuXHJcbiAgICAgICAgaWYgKG5vZGUgIT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRbbGFiZWxdID0gdGhpcy5vcmlnaW5bbGFiZWxdO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fbGFzdE5vZGUgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fb3B0aW9ucy5lcnJvcnNMb2cpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignU1VCIC0gRXJyb3I6IGNhbm5vdCBwcnVuZSBub2RlIHJvb3QnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICB0aGlzLl9sYXN0Tm9kZVt0aGlzLl9yZWZMYWJlbF0gPSB0aGlzLm9yaWdpbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50IHx8IHRoaXM7XHJcbiAgICB9XHJcbn1cclxuXHJcbi8vL0VSUk9SIENIRUNLIEFORCBOT1RJRklDQVRJT05cclxuZnVuY3Rpb24gY2hlY2tOb2RlVW5kZWZpbmVkKG5vZGUsIGxhYmVsKSB7XHJcbiAgICBpZiAobm9kZSAhPSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnByb3BhZ2F0ZUVycm9yKHRydWUpO1xyXG4gICAgaWYgKHRoaXMuX29wdGlvbnMuZXJyb3JzTG9nKVxyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NVQiAtIEVycm9yOiBub2RlIFwiJyArIGxhYmVsICsgJ1wiIG5vdCBmb3VuZCcpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNoZWNrTGlzdEl0ZW1VbmRlZmluZWQoZWxlbUluZGV4LCBsYWJlbCkge1xyXG4gICAgaWYgKGVsZW1JbmRleCAhPT0gLTEpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnByb3BhZ2F0ZUVycm9yKHRydWUpO1xyXG4gICAgaWYgKHRoaXMuX29wdGlvbnMuZXJyb3JzTG9nKVxyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1NVQiAtIEVycm9yOiBlbGVtIG9mIGxpc3QgXCInICsgbGFiZWwgKyAnXCIgbm90IGZvdW5kJyk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2hlY2tOb2RlTm90QXJyYXkobm9kZSwgbGFiZWwpIHtcclxuICAgIGlmIChBcnJheS5pc0FycmF5KG5vZGUpKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5wcm9wYWdhdGVFcnJvcih0cnVlKTtcclxuICAgIGlmICh0aGlzLl9vcHRpb25zLmVycm9yc0xvZylcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdTVUIgLSBFcnJvcjogbm9kZSBcIicgKyBsYWJlbCArICdcIiBpcyBub3QgYW4gYXJyYXknKTtcclxuICAgIHJldHVybiB0cnVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjaGVja05vdEZ1bmN0aW9uKGZuKSB7XHJcbiAgICBpZiAodHlwZW9mIGZuID09PSAnZnVuY3Rpb24nKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgdGhpcy5wcm9wYWdhdGVFcnJvcih0cnVlKTtcclxuICAgIGlmICh0aGlzLl9vcHRpb25zLmVycm9yc0xvZylcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdTVUIgLSBFcnJvcjogcGFyYW1ldGVyIFwiZm5cIiBpcyBub3QgYSBmdW5jdGlvbicpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbn1cclxuXG5cblxuLy8vLy8vLy8vLy8vLy8vLy8vXG4vLyBXRUJQQUNLIEZPT1RFUlxuLy8gLi9zcmMvaW5kZXguanNcbi8vIG1vZHVsZSBpZCA9IDBcbi8vIG1vZHVsZSBjaHVua3MgPSAwIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQUE7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOyIsInNvdXJjZVJvb3QiOiIifQ==")}])});