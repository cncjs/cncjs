import {
  Space,
  Spinner,
} from '@tonic-ui/react';
import { ChevronDownIcon, ChevronRightIcon, FileOIcon, FolderOIcon, FolderOpenOIcon } from '@tonic-ui/react-icons';
import path from 'path';
import cx from 'classnames';
import { format } from 'date-fns';
import includes from 'lodash/includes';
import PropTypes from 'prop-types';
import React from 'react';
import i18n from '@app/lib/i18n';
import { formatBytes } from '@app/lib/numeral';
import styles from './renderer.styl';

function TreeNode(props) {
  const { componentClass, id, selected, disabled, className, children, ...others } = props;
  const Component = componentClass || 'tr';

  return (
    <Component
      {...others}
      className={cx(
        className,
        styles.treeNode,
        { [styles.selected]: selected }
      )}
      data-id={id}
      disabled={disabled}
    >
      {children}
    </Component>
  );
}
TreeNode.propTypes = {
  componentClass: PropTypes.node,
  id: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]),
  selected: PropTypes.bool,
  disabled: PropTypes.bool
};

function TreeNodeColumn(props) {
  const { className, children, padding = true, componentClass, ...others } = props;
  const Component = componentClass || 'td';

  return (
    <Component
      {...others}
      className={cx(
        className,
        styles.treeNodeColumn,
        { [styles.noPadding]: !padding }
      )}
    >
      {children}
    </Component>
  );
}
TreeNodeColumn.propTypes = {
  padding: PropTypes.bool,
  componentClass: PropTypes.node
};

function TreeNodeToggler({ show, expanded }) {
  if (!show) {
    return null;
  }

  return (
    <span
      className={cx(
        styles.treeToggler
      )}
    >
      {expanded ? (
        <ChevronDownIcon aria-hidden="true" size="1em" style={{ opacity: 1 }} />
      ) : (
        <ChevronRightIcon aria-hidden="true" size="1em" style={{ opacity: 0.5 }} />
      )}
    </span>
  );
}
TreeNodeToggler.propTypes = {
  show: PropTypes.bool,
  expanded: PropTypes.bool
};

/** @param {{ show?: boolean }} props */
function TreeNodeLoader({ show = false }) {
  return show ? <Spinner size="xs" ml={5} aria-label={i18n._('Loading...')} /> : null;
}

const renderer = (node, treeOptions) => {
  const { id, loadOnDemand = false } = node;
  const { depth, open, loading = false, selected = false, filtered } = node.state;
  const more = node.hasChildren();
  const paddingLeft = (more || loadOnDemand) ? depth * 18 : (depth + 1) * 18;

  if (filtered === false) {
    return '';
  }

  node.props = { ...node.props };

  const disabled = (function(node) {
    let { disabled = false } = node.props;

    while (node && node.parent) {
      if (node.props && node.props.disabled) {
        disabled = true;
        break;
      }
      node = node.parent;
    }
    return disabled;
  }(node));
  const dateModified = format(node.props.mtime, 'PPpp');
  const size = includes(['f', 'l'], node.props.type) ? formatBytes(node.props.size, 0) : '';
  const type = (function(node) {
    if (node.props.type === 'd') {
      return i18n._('File folder');
    }

    if (node.props.type === 'f') {
      // path.extname('index.html')
      // -> '.html'
      // path.extname('index.')
      // -> '.'
      // path.extname('index')
      // -> ''
      const extname = path.extname(node.name || '').slice(1);
      return (extname.length > 0)
        ? i18n._('{{extname}} File', { extname: extname.toUpperCase() }) // e.g. NC File
        : i18n._('File');
    }

    return '';
  }(node));

  return (
    <TreeNode
      id={id}
      selected={selected}
      disabled={disabled}
    >
      <TreeNodeColumn>
        <div style={{ paddingLeft: paddingLeft }}>
          <TreeNodeToggler
            show={more || loadOnDemand}
            expanded={more && open}
          />
          {more && open && <FolderOpenOIcon aria-hidden="true" size="1em" />}
          {more && !open && <FolderOIcon aria-hidden="true" size="1em" />}
          {!more && <FileOIcon aria-hidden="true" size="1em" />}
          <Space width="2x" />
          {node.name}
          <TreeNodeLoader show={loading} />
        </div>
      </TreeNodeColumn>
      <TreeNodeColumn className="text-nowrap">
        {dateModified}
      </TreeNodeColumn>
      <TreeNodeColumn className="text-nowrap">
        {type}
      </TreeNodeColumn>
      <TreeNodeColumn className="text-nowrap text-right">
        {size}
      </TreeNodeColumn>
    </TreeNode>
  );
};

export default renderer;
