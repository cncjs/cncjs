import _ from 'lodash';
import React from 'react';
import ReactDOM from 'react-dom';
import Sortable from 'sortablejs';

const defaultOptions = {
    ref: 'list',
    model: 'items',
    onStart: 'handleStart',
    onEnd: 'handleEnd',
    onAdd: 'handleAdd',
    onUpdate: 'handleUpdate',
    onRemove: 'handleRemove',
    onSort: 'handleSort',
    onFilter: 'handleFilter',
    onMove: 'handleMove'
};

let _nextSibling = null;
let _activeComponent = null;

const getModelName = (component) => {
    let { sortableOptions = {} } = component;
    let { model } = sortableOptions;
    return model || defaultOptions.model;
};

const getModelItems = (component) => {
    let model = getModelName(component);
    let { state = {}, props = {} } = component;
    let items = state[model] || props[model] || [];
    return items.slice();
};

class ReactSortable extends React.Component {
    _sortableInstance = null;

    componentDidMount() {
        const options = _.merge({}, defaultOptions, this.sortableOptions);
        const emitEvent = (type, evt) => {
            const method = this[options[type]];
            method && method.call(this, evt, this._sortableInstance);
        };
        let copyOptions = _.extend({}, options);

        [ // Bind callbacks so that 'this' refers to the component
            'onStart', 'onEnd', 'onAdd', 'onSort', 'onUpdate', 'onRemove', 'onFilter', 'onMove'
        ].forEach((name) => {
            copyOptions[name] = (evt) => {
                if (name === 'onStart') {
                    _nextSibling = evt.item.nextElementSibling;
                    _activeComponent = this;
                } else if (name === 'onAdd' || name === 'onUpdate') {
                    evt.from.insertBefore(evt.item, _nextSibling);

                    let newState = {};
                    let remoteState = {};
                    let oldIndex = evt.oldIndex;
                    let newIndex = evt.newIndex;
                    let items = getModelItems(this);

                    if (name === 'onAdd') {
                        let remoteItems = getModelItems(_activeComponent);
                        let item = remoteItems.splice(oldIndex, 1)[0];
                        items.splice(newIndex, 0, item);

                        remoteState[getModelName(_activeComponent)] = remoteItems;
                    } else {
                        items.splice(newIndex, 0, items.splice(oldIndex, 1)[0]);
                    }

                    newState[getModelName(this)] = items;
                    
                    if (copyOptions.stateHandler) {
                        this[copyOptions.stateHandler](newState);
                    } else {
                        this.setState(newState);
                    }
                    
                    (this !== _activeComponent) && _activeComponent.setState(remoteState);
                }

                setTimeout(() => {
                    emitEvent(name, evt);
                }, 0);
            };

        });

        let domNode = ReactDOM.findDOMNode(this.refs[options.ref] || this);
        this._sortableInstance = Sortable.create(domNode, copyOptions);
    }
    componentWillReceiveProps(nextProps) {
        let newState = {};
        let model = getModelName(this);
        let items = nextProps[model];

        if (items) {
            newState[model] = items;
            this.setState(newState);
        }
    }
    componentWillUnmount() {
        this._sortableInstance.destroy();
        this._sortableInstance = null;
    }
}

export default ReactSortable;
