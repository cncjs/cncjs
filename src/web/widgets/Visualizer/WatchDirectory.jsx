import path from 'path';
import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import shallowCompare from 'react-addons-shallow-compare';
import InfiniteTree from 'react-infinite-tree';
import renderer from './renderer';
import api from '../../api';
import Modal from '../../components/Modal';
import i18n from '../../lib/i18n';
import styles from './renderer.styl';

class WatchDirectory extends Component {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    tableNode = null;
    treeNode = null;

    componentDidMount() {
        this.addColumnGroup();
        this.addResizeEventListener();

        api.watch.getFiles({ path: '' })
            .then((res) => {
                const body = res.body;
                const data = body.files.map((file) => {
                    const { name, ...props } = file;

                    return {
                        id: path.join(body.path, name),
                        name: name,
                        props: {
                            ...props,
                            path: body.path || ''
                        },
                        loadOnDemand: props.type === 'd'
                    };
                });

                const tree = this.treeNode.tree;
                tree.loadData(data);

                this.fitHeaderColumns();
            })
            .catch((res) => {
                // Ignore error
            });
    }
    componentWillUnmount() {
        this.removeResizeEventListener();
    }
    shouldComponentUpdate(nextProps, nextState) {
        return shallowCompare(this, nextProps, nextState);
    }
    addResizeEventListener() {
        window.addEventListener('resize', this.fitHeaderColumns);
    }
    removeResizeEventListener() {
        window.removeEventListener('resize', this.fitHeaderColumns);
    }
    addColumnGroup() {
        this.treeNode.tree.scrollElement.style.height = '240px';
        const table = this.treeNode.tree.contentElement.parentNode;
        const colgroup = document.createElement('colgroup');
        table.appendChild(colgroup);

        for (let i = 0; i < 4; ++i) {
            const col = document.createElement('col');
            colgroup.appendChild(col);
        }
    }
    fitHeaderColumns() {
        const ready = this.tableNode && this.treeNode;
        if (!ready) {
            return;
        }

        const elTable = ReactDOM.findDOMNode(this.tableNode);
        const elTree = this.treeNode.tree.options.el;
        const tableHeaders = elTable.querySelectorAll('tr > th');
        const colgroup = elTree.querySelector('colgroup');
        const row = elTree.querySelector('tbody > tr');

        let i = 0;
        let child = row.firstChild;
        let col = colgroup.firstChild;
        while (child && col) {
            const width = Math.max(child.clientWidth, tableHeaders[i].clientWidth);
            col.style.minWidth = width + 'px';
            col.style.width = width + 'px';
            tableHeaders[i].style.width = width + 'px';
            ++i;

            child = child.nextSibling;
            col = col.nextSibling;
        }
    }
    render() {
        const { state, actions } = this.props;
        const { selectedNode = null } = state.modal.params;
        const canUpload = selectedNode && selectedNode.props.type === 'f';

        return (
            <Modal
                backdrop
                bsSize="md"
                onHide={actions.closeModal}
            >
                <Modal.Header>
                    <Modal.Title>{i18n._('Watch Directory')}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <table
                        ref={(node) => {
                            this.tableNode = node;
                        }}
                        style={{
                            width: '100%'
                        }}
                    >
                        <thead>
                            <tr>
                                <th>{i18n._('Name')}</th>
                                <th>{i18n._('Date modified')}</th>
                                <th>{i18n._('Type')}</th>
                                <th>{i18n._('Size')}</th>
                            </tr>
                        </thead>
                    </table>
                    <InfiniteTree
                        style={{ height: 240 }}
                        ref={(node) => {
                            if (node) {
                                this.treeNode = node;
                            }
                        }}
                        noDataClass={styles.noData}
                        togglerClass={styles.treeToggler}
                        autoOpen={true}
                        layout="table"
                        loadNodes={(parentNode, done) => {
                            api.watch.getFiles({ path: path.join(parentNode.props.path, parentNode.name) })
                                .then((res) => {
                                    const body = res.body;
                                    const nodes = body.files.map((file) => {
                                        const { name, ...props } = file;

                                        return {
                                            id: path.join(body.path, name),
                                            name: name,
                                            props: {
                                                ...props,
                                                path: body.path || ''
                                            },
                                            loadOnDemand: (props.type === 'd')
                                        };
                                    });

                                    done(null, nodes);
                                })
                                .catch((res) => {
                                    // Ignore error
                                });
                        }}
                        rowRenderer={renderer}
                        shouldSelectNode={(node) => {
                            const tree = this.treeNode.tree;
                            if (!node || (node === tree.getSelectedNode())) {
                                return false; // Prevent from desdelecting the current node
                            }
                            return true;
                        }}
                        onContentDidUpdate={() => {
                            this.fitHeaderColumns();
                        }}
                        onSelectNode={(node) => {
                            actions.updateModalParams({ selectedNode: node });
                        }}
                        onDoubleClick={(event) => {
                            event.stopPropagation();

                            // Call setTimeout(fn, 0) to make sure it returns the last selected node
                            setTimeout(() => {
                                const tree = this.treeNode.tree;
                                const node = tree.getSelectedNode();

                                if (node) {
                                    const file = path.join(node.props.path, node.name);
                                    actions.loadFile(file);
                                    actions.closeModal();
                                }
                            }, 0);
                        }}
                    />
                </Modal.Body>
                <Modal.Footer>
                    <button
                        type="button"
                        className="btn btn-default"
                        onClick={actions.closeModal}
                    >
                        {i18n._('Cancel')}
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => {
                            const tree = this.treeNode.tree;
                            const node = tree.getSelectedNode();

                            if (node) {
                                const file = path.join(node.props.path, node.name);
                                actions.loadFile(file);
                                actions.closeModal();
                            }
                        }}
                        disabled={!canUpload}
                    >
                        {i18n._('Load G-code')}
                    </button>
                </Modal.Footer>
            </Modal>
        );
    }
}

export default WatchDirectory;
