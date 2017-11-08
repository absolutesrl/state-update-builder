const defaultOptions = {
    enableWarnings: false,
    errorsLog: true
};


//TODO: ad warnings
export default class StateUpdateBuilder {
    constructor(state, options) {
        if (state == undefined)
            console.error('root cannot be null');

        this._options = Object.assign({}, defaultOptions, options);

        this.current = this.extendNode(state);
        this.origin = state;
        this.parent = undefined;
        this.parent = undefined;
        this._updated = false;
        this._lastNode = undefined;
        this._refLabel = undefined;
    }

    //generate a StateUpdateBuilder as passing current root as an
    initChildBuider(newOrigin, lastNode, label) {
        var childBuilder = new StateUpdateBuilder(newOrigin, this._options);

        //propagate parent builder informations
        childBuilder.parent = this;
        childBuilder._lastNode = lastNode;
        childBuilder._refLabel = label;

        return childBuilder;
    }

    //creates new reference for arrays, objects and functions
    extendNode(node) {
        if (Array.isArray(node))
            return [].concat(node);

        if (typeof node === 'object')
            return Object.assign({}, node);

        if (typeof node === 'function')
            return () => node();

        return node
    }

    //traverse single node object
    traverseNode(label) {
        if (this._treeError) return this;

        var node = this.current[label];
        if (checkNodeUndefined.call(this, node, label))
            return this;

        //create new builder with shallow copy of traversed node
        var resultBuilder = this.initChildBuider(node, this.current, label);

        //assign node copy to parent pointer
        this.current[label] = resultBuilder.current;

        //returns new builder
        return resultBuilder;
    }

    //traverse single array object navigate to array instance
    traverseList(label, lambda) {
        if (this._treeError) return this;

        var node = this.current[label];

        if (checkNodeUndefined.call(this, node, label) || checkNodeNotArray.call(this, node, label)) {
            this.propagateError(true);
            return this;
        }

        var choosePath = (el, i) => typeof lambda === 'function' ? lambda(el, i) : true;
        var elemIndex = node.findIndex(choosePath);

        if (checkListItemUndefined.call(this, elemIndex, label)) return this;

        var lastNode = this.extendNode(node);
        //create new builder positioned on item found
        var resultBuilder = this.initChildBuider(node.find(choosePath), lastNode, elemIndex);

        //generate new reference to current node array
        this.current[label] = lastNode;
        this.current[label][elemIndex] = resultBuilder.current;

        return resultBuilder;
    }

    //check "label" node presence
    checkSubtree(label, lambda) {
        if (this._treeError) return this;

        const node = this.current[label];

        if (checkNodeUndefined.call(this, node, label))
            return false;

        if (Array.isArray(node)) {
            var choosePath = (el, i) => typeof lambda === 'function' ? lambda(el, i) : false;
            var elemIndex = node.findIndex(choosePath);
            return elemIndex >= 0;
        }
        if (typeof lambda === 'function')
            return !!lambda(node);

        return true;
    }

    //UPDATE OPERATIONS
    //{$set: any} replace the target entirely.
    set(label, value) {
        if (this._treeError) return this;

        if (this._options.enableWarnings && this.current[label] === undefined && label !== null)
            console.error('SUB - Warning: node "' + label + '" not found');

        this.propagateUpdate(this._updated || this.current[label] !== value);
        this.current[label] = value;


        return this;
    }

    setNode(node) {
        if (this._treeError) return this;

        if (!this._lastNode) {
            this.current = node;
            this.propagateUpdate(this._updated || this.current !== node);
        }
        else {
            this._lastNode[this._refLabel] = node;
            this.propagateUpdate(this._updated || this._lastNode[this._refLabel] !== node);
        }

        return this;
    }

    //{$merge: object} merge the keys of object with the target.
    merge(label, value) {
        if (this._treeError) return this;

        if (this._options.enableWarnings && typeof value !== 'object') {
            console.error('SUB - Warning: "value" is not an object');
            return this;
        }

        var node = this.current[label];

        this.propagateUpdate(this._updated || Object.keys(value).reduce((p, c) => p || node[c] !== value[c], false));

        this.current[label] = Object.assign(node, value);


        return this;
    }

    mergeNode(node) {
        if (this._treeError) return this;

        var elem = this._lastNode ? this._lastNode[this._refLabel] : this.current;
        this.propagateUpdate(this._updated || Object.keys(node).reduce((p, c) => p || elem[c] !== node[c], false));

        if (!this._lastNode) {
            this.current = Object.assign(this.current, node);
        }
        else
            this._lastNode[this._refLabel] = Object.assign(this._lastNode[this._refLabel], node);

        return this;
    }

    //remove child node of current object/array node
    removeNode(label, lambda) {
        var node = this.current[label];

        if (node == undefined) return this;

        if (Array.isArray(node) && typeof lambda === 'function') {
            var elemIndex = node.findIndex(lambda);
            elemIndex >= 0 && this.splice(elemIndex, 1);
            return this;
        }

        this.current[label] = undefined;
        this.propagateUpdate(true);

        return this;
    }

    //{$apply: function} passes in the current value to the function and updates it with the new returned value.
    apply(label, fn) {
        if (this._treeError) return this;

        var node = this.current[label];
        if (checkNodeUndefined.call(this, node, label) || checkNotFunction.call(this, fn))
            return this;

        this.current[label] = fn(this.extendNode(node));

        this.propagateUpdate(this._updated || node !== this.current[label]);

        return this;
    }

    //{$push: array} push() all the items in array on the target.
    push(label, array) {
        if (this._treeError) return this;
        var node = this.current[label];
        if (checkNodeUndefined.call(this, node, label) || checkNodeNotArray.call(this, array, label))
            return this;

        var newNode = this.current[label] = this.extendNode(node);
        Array.prototype.push.apply(newNode, array);
        this.propagateUpdate(true);

        return this; //returns the same builder


    }

    //{$unshift: array} unshift() all the items in array on the target.
    unshift(label, array) {
        if (this._treeError) return this;
        var node = this.current[label];
        if (checkNodeUndefined.call(this, node, label) || checkNodeNotArray.call(this, array, label))
            return this;

        var newNode = this.current[label] = this.extendNode(node);
        Array.prototype.unshift.apply(newNode, array);
        this.propagateUpdate(this._updated || array.length > 0);

        return this; //returns the same builder
    }

    //{$splice: array of arrays} for each item in arrays call splice() on the target with the parameters provided by the item.
    splice(label, ...args) {
        if (this._treeError) return this;
        var node = this.current[label];
        if (checkNodeUndefined.call(this, node, label) || checkNodeNotArray.call(this, node, label))
            return this;

        var newNode = this.current[label] = this.extendNode(node);
        Array.prototype.splice.apply(newNode, args);

        this.propagateUpdate(this._updated || args.length > 0);

        return this; //returns the same builder
    }


    execute() {
        return this.parent
            ? this.parent.execute()
            : this._treeError ? this.origin : this.current;
    }

    checkError() {
        return this._treeError;
    }

    propagateUpdate(update) {
        this._updated = update;
        if (update)
            this.parent && this.parent.propagateUpdate(update);
    };

    propagateError(error) {
        this._treeError = error;
        this.parent && this.parent.propagateError(error);
    };

    resetError() {
        this.propagateError(false);
        return this;
    }

    checkNodeUpdated() {
        return this._updated;
    }

    pruneSubtree(label) {
        if (this._treeError) return this;

        var node = this.current[label];
        if (this._options.enableWarnings && node === undefined && label !== null)
            console.error('SUB - Warning: node "' + label + '" not found');

        if (node != undefined)
            this.current[label] = this.origin[label];
        else {
            if (this._lastNode == undefined) {
                if (this._options.errorsLog)
                    console.error('SUB - Error: cannot prune node root');
            }
            else
                this._lastNode[this._refLabel] = this.origin;
        }
        return this.parent || this;
    }
}

///ERROR CHECK AND NOTIFICATION
function checkNodeUndefined(node, label) {
    if (node != undefined) return false;

    this.propagateError(true);
    if (this._options.errorsLog)
        console.error('SUB - Error: node "' + label + '" not found');
    return true;
}

function checkListItemUndefined(elemIndex, label) {
    if (elemIndex !== -1) return false;

    this.propagateError(true);
    if (this._options.errorsLog)
        console.error('SUB - Error: elem of list "' + label + '" not found');
    return true;
}

function checkNodeNotArray(node, label) {
    if (Array.isArray(node)) return false;

    this.propagateError(true);
    if (this._options.errorsLog)
        console.error('SUB - Error: node "' + label + '" is not an array');
    return true;
}

function checkNotFunction(fn) {
    if (typeof fn === 'function') return false;

    this.propagateError(true);
    if (this._options.errorsLog)
        console.error('SUB - Error: parameter "fn" is not a function');
    return true;
}
