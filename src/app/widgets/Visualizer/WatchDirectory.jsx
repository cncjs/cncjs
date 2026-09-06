import path from 'path';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import ReactDOM from 'react-dom';
import InfiniteTree from 'react-infinite-tree';
import api from 'app/api';
import Modal from 'app/components/Modal';
import Space from 'app/components/Space';
import controller from 'app/lib/controller';
import i18n from 'app/lib/i18n';
import log from 'app/lib/log';
import renderer from './renderer';
import styles from './renderer.styl';
import watchDirectoryStyles from './watch-directory.styl';

class WatchDirectory extends PureComponent {
    static propTypes = {
      state: PropTypes.object,
      actions: PropTypes.object
    };

    tableNode = null;

    treeNode = null;

    uploadInputEl = null;

    dropzoneNode = null;

    state = {
      dragging: false,
      uploading: false,
      uploadProgress: 0,
      refreshing: false
    };

    componentDidMount() {
      this.addResizeEventListener();
      this.addDropZoneEventListeners();
      this.loadFiles();
      controller.addListener('watchdir:change', this.handleWatchDirChange);
    }

    componentWillUnmount() {
      this.removeResizeEventListener();
      this.removeDropZoneEventListeners();
      controller.removeListener('watchdir:change', this.handleWatchDirChange);
    }

    addDropZoneEventListeners() {
      this.dropzoneNode.addEventListener('dragover', this.handleDragOver);
      this.dropzoneNode.addEventListener('dragleave', this.handleDragLeave);
      this.dropzoneNode.addEventListener('drop', this.handleDrop);
    }

    removeDropZoneEventListeners() {
      this.dropzoneNode.removeEventListener('dragover', this.handleDragOver);
      this.dropzoneNode.removeEventListener('dragleave', this.handleDragLeave);
      this.dropzoneNode.removeEventListener('drop', this.handleDrop);
    }
    addResizeEventListener() {
      window.addEventListener('resize', this.fitHeaderColumns);
    }

    removeResizeEventListener() {
      window.removeEventListener('resize', this.fitHeaderColumns);
    }

    addClickEventListener() {
      this.modalNode = this.dropzoneNode.closest('.modal');
      if (this.modalNode) {
        this.modalNode.addEventListener('click', this.handleClickDropzone);
      }
    }

    removeClickEventListener() {
      if (this.modalNode) {
        this.modalNode.removeEventListener('click', this.handleClickDropzone);
        this.modalNode = null;
      }
    }

    loadFiles() {
      this.setState({ refreshing: true });

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
          this.props.actions.updateModalParams({ selectedNode: null });
          this.fitHeaderColumns();
        })
        .catch((res) => {
          // Ignore error
        })
        .then(() => {
          this.setState({ refreshing: false });
        });
    }

    handleClickUpload = () => {
      this.uploadInputEl.value = null;
      this.uploadInputEl.click();
    };

    handleChangeUploadFiles = (event) => {
      const files = Array.from(event.target.files || []);
      this.uploadFiles(files);
    };

    handleDragOver = (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      if (!this.state.dragging) {
        this.setState({ dragging: true });
      }
    };

    handleDragLeave = (event) => {
      event.preventDefault();
      if (!this.dropzoneNode || !this.dropzoneNode.contains(event.relatedTarget)) {
        this.setState({ dragging: false });
      }
    };

    handleDrop = (event) => {
      event.preventDefault();
      this.setState({ dragging: false });
      const files = Array.from(event.dataTransfer.files || []);
      this.uploadFiles(files);
    };

    handleClickDropzone = (event) => {
      const tree = this.treeNode && this.treeNode.tree;
      if (!tree) {
        return;
      }
      const row = event.target.closest('[data-id]');
      if (!row) {
        // Clicked outside the table: deselect the current file
        tree.selectNode(null);
        return;
      }
      const node = tree.getNodeById(row.getAttribute('data-id'));
      if (node && node.props.type === 'd' && event.detail <= 1 && !event.target.closest('[class*="toggler"]')) {
        // Single click on a folder toggles expansion (the chevron is handled by the tree)
        if (node.state.open) {
          tree.closeNode(node);
        } else {
          tree.openNode(node);
        }
      }
    };

    handleWatchDirChange = () => {
      // Coalesce bursts of file system events before refreshing
      clearTimeout(this.watchDirChangeTimer);
      this.watchDirChangeTimer = setTimeout(() => {
        this.loadFiles();
      }, 200);
    };

    uploadFiles = (files) => {
      if (files.length === 0 || this.state.uploading) {
        return;
      }
      this.setState({ uploading: true, uploadProgress: 0 });

      const readers = files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve({ file, data: reader.result });
        };
        reader.onerror = reject;
        reader.readAsText(file);
      }));

      Promise.all(readers)
        .then((results) => {
          // Aggregate upload progress across files, weighted by file size
          const progressOf = new Map(results.map(({ file }) => [file, 0]));
          const totalBytes = results.reduce((sum, { file }) => sum + file.size, 0);
          const updateProgress = () => {
            const uploaded = [...progressOf.values()].reduce((sum, value) => sum + value, 0);
            const percent = totalBytes > 0 ? (uploaded / totalBytes) * 100 : 100;
            this.setState({ uploadProgress: Math.min(100, Math.round(percent)) });
          };
          const onProgress = (file) => (event) => {
            const { direction, loaded = 0 } = { ...event };
            if (direction !== 'upload') {
              return;
            }
            progressOf.set(file, Math.min(loaded, file.size));
            updateProgress();
          };

          return Promise.all(results.map(({ file, data }) => {
            return api.watch.uploadFile({ file: file.name, data: data, onProgress: onProgress(file) });
          }));
        })
        .catch((err) => {
          log.error('Failed to upload files to the watch directory:', err);
        })
        .then(() => {
          this.setState({ uploading: false, uploadProgress: 0 });
        });
    };

    addColumnGroup() {
      if (!this.treeNode) {
        return;
      }

      this.treeNode.tree.scrollElement.style.height = '240px';
      // Keep a constant vertical scrollbar gutter so it never covers the table
      this.treeNode.tree.scrollElement.style.overflowY = 'scroll';
      this.treeNode.tree.scrollElement.style.overflowX = 'hidden';
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

      // Measure the natural width of each column
      const widths = [];
      let i = 0;
      let child = row.firstChild;
      let col = colgroup.firstChild;
      while (child && col) {
        widths.push(Math.max(child.clientWidth, tableHeaders[i].clientWidth));
        ++i;

        child = child.nextSibling;
        col = col.nextSibling;
      }

      // Reserve 8px on the right edge for the vertical scrollbar
      const available = elTree.clientWidth - 8;

      // Keep compact columns bounded so the name column gets the remaining space.
      const maxColumnRatios = [0, 0.24, 0.14, 0.1];
      for (let column = 1; column < widths.length; ++column) {
        widths[column] = Math.min(
          widths[column],
          Math.round(available * maxColumnRatios[column])
        );
      }

      const othersTotal = widths.slice(1).reduce((sum, width) => sum + width, 0);
      widths[0] = Math.max(Math.round(available * 0.4), available - othersTotal);

      i = 0;
      child = row.firstChild;
      col = colgroup.firstChild;
      while (child && col) {
        col.style.minWidth = widths[i] + 'px';
        col.style.width = widths[i] + 'px';
        tableHeaders[i].style.width = widths[i] + 'px';
        ++i;

        child = child.nextSibling;
        col = col.nextSibling;
      }
    }

    render() {
      const { state, actions } = this.props;
      const { selectedNode = null } = state.modal.params;
      const { dragging, uploading, uploadProgress, refreshing } = this.state;
      const canUpload = selectedNode && selectedNode.props.type === 'f';

      return (
        <Modal disableOverlay size="md" style={{ width: '80vw' }} onClose={actions.closeModal}>
          <Modal.Header>
            <Modal.Title>{i18n._('Watch Directory')}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className={watchDirectoryStyles.toolbar}>
              <input
                ref={(node) => {
                  this.uploadInputEl = node;
                }}
                type="file"
                multiple={true}
                style={{ display: 'none' }}
                onChange={this.handleChangeUploadFiles}
              />
              <button
                type="button"
                className="btn btn-default"
                onClick={this.handleClickUpload}
                disabled={uploading}
              >
                <i aria-hidden="true" className="fa fa-plus" />
                <Space width="4" />
                {i18n._('Add')}
              </button>
              {uploading && (
                <i aria-hidden="true" className="fa fa-circle-o-notch fa-spin" style={{ marginLeft: 8 }} />
              )}
              <button
                type="button"
                className="btn btn-default"
                style={{ marginLeft: 'auto' }}
                title={i18n._('Refresh')}
                aria-label={i18n._('Refresh')}
                onClick={() => this.loadFiles()}
              >
                <i aria-hidden="true" className={classNames('fa fa-refresh', { 'fa-spin': refreshing })} />
              </button>
            </div>
            <div
              ref={(node) => {
                this.dropzoneNode = node;
              }}
              className={classNames(watchDirectoryStyles.dropzone, {
                [watchDirectoryStyles.dropzoneOver]: dragging
              })}
            >
              <table
                ref={node => {
                  this.tableNode = node;
                }}
                style={{
                  width: '100%'
                }}
              >
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 20 }}>{i18n._('Name')}</th>
                    <th>{i18n._('Date modified')}</th>
                    <th>{i18n._('Type')}</th>
                    <th>{i18n._('Size')}</th>
                  </tr>
                </thead>
              </table>
              <InfiniteTree
                style={{ height: 240 }}
                ref={node => {
                  if (!this.treeNode) {
                    this.treeNode = node;
                    this.addColumnGroup();
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
                  if (node && (node === tree.getSelectedNode())) {
                    return false; // Prevent from deselecting the current node
                  }
                  return true;
                }}
                onContentDidUpdate={() => {
                  this.fitHeaderColumns();
                }}
                onKeyDown={(event) => {
                  // Prevent the default scroll
                  event.preventDefault();

                  const tree = this.treeNode.tree;
                  const node = tree.getSelectedNode();
                  const nodeIndex = tree.getSelectedIndex();

                  if (event.keyCode === 13) { // Enter
                    if (!node) {
                      return;
                    }
                    if (node.props.type === 'd') {
                      // Toggle expansion for directories
                      if (node.state.open) {
                        tree.closeNode(node);
                      } else {
                        tree.openNode(node);
                      }
                      return;
                    }
                    const file = path.join(node.props.path, node.name);
                    actions.loadFile(file);
                    actions.closeModal();
                  } else if (event.keyCode === 37) { // Left
                    tree.closeNode(node);
                  } else if (event.keyCode === 38) { // Up
                    const prevNode = tree.nodes[nodeIndex - 1] || node;
                    tree.selectNode(prevNode);
                  } else if (event.keyCode === 39) { // Right
                    tree.openNode(node);
                  } else if (event.keyCode === 40) { // Down
                    const nextNode = tree.nodes[nodeIndex + 1] || node;
                    tree.selectNode(nextNode);
                  }
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
                      if (node.props.type === 'd') {
                        // Toggle expansion for directories
                        if (node.state.open) {
                          tree.closeNode(node);
                        } else {
                          tree.openNode(node);
                        }
                        return;
                      }
                      const file = path.join(node.props.path, node.name);
                      actions.loadFile(file);
                      actions.closeModal();
                    }
                  }, 0);
                }}
              />
              {dragging && (
                <div className={watchDirectoryStyles.dropzoneHint}>
                  <i aria-hidden="true" className="fa fa-upload" />
                  <Space width="8" />
                  {i18n._('Drop files to upload')}
                </div>
              )}
              {uploading && (
                <div className={watchDirectoryStyles.dropzoneHint}>
                  <div className={watchDirectoryStyles.progressLabel}>
                    <i aria-hidden="true" className="fa fa-circle-o-notch fa-spin" />
                    <Space width="8" />
                    {i18n._('Uploading...')} {uploadProgress}%
                  </div>
                  <div className="progress" style={{ marginBottom: 0 }}>
                    <div
                      className="progress-bar"
                      role="progressbar"
                      aria-label={i18n._('Uploading...')}
                      aria-valuenow={uploadProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      style={{ width: uploadProgress + '%' }}
                    />
                  </div>
                </div>
              )}
            </div>
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
