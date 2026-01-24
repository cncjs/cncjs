import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Button } from '@app/components/Buttons';
import controller from '@app/lib/controller';

const gapSize = 5;

class MDI extends Component {
  static propTypes = {
    canClick: PropTypes.bool,
    mdi: PropTypes.shape({
      disabled: PropTypes.bool,
      commands: PropTypes.array
    })
  };

  renderMDIButtons() {
    const { canClick, mdi } = this.props;

    return mdi.commands.map(c => {
      // Calculate flex-basis from grid configuration (default to 4 = 3 columns per row)
      const grid = c.grid || {};
      const gridSize = grid.xs || grid.sm || grid.md || grid.lg || grid.xl || 4;
      const itemsPerRow = 12 / gridSize;
      const gapsPerRow = itemsPerRow - 1;

      // Calculate flex-basis accounting for gaps: (100% - total gap space) / items per row
      const flexBasis = `calc((100% - ${gapsPerRow * gapSize}px) / ${itemsPerRow})`;

      return (
        <div
          key={c.id}
          style={{
            flexBasis: flexBasis,
            maxWidth: flexBasis,
            boxSizing: 'border-box'
          }}
        >
          <Button
            btnSize="sm"
            btnStyle="flat"
            style={{
              minWidth: 'auto',
              width: '100%',
            }}
            disabled={!canClick}
            onClick={() => {
              controller.command('gcode', c.command);
            }}
          >
            {c.name}
          </Button>
        </div>
      );
    });
  }

  render() {
    const { mdi } = this.props;

    if (mdi.disabled || mdi.commands.length === 0) {
      return null;
    }

    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          marginTop: gapSize,
          gap: gapSize,
        }}
      >
        {this.renderMDIButtons()}
      </div>
    );
  }
}

export default MDI;
