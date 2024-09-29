import {
  ButtonBase,
} from '@tonic-ui/react';
import {
  AngleRightIcon,
} from '@tonic-ui/react-icons';
import {
  createTransitionStyle,
  getEnterTransitionProps,
  getExitTransitionProps,
  transitionEasing,
} from '@tonic-ui/utils';
import React, { forwardRef } from 'react';

const TableRowToggleIcon = forwardRef((
  {
    isExpanded,
    ...rest
  },
  ref,
) => {
  const timeout = isExpanded
    ? Math.floor(133 * 0.7) // exit
    : 133; // enter
  const easing = transitionEasing.easeOut;
  const transitionProps = isExpanded
    ? getEnterTransitionProps({ timeout, easing })
    : getExitTransitionProps({ timeout, easing });
  const styleProps = {
    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
    transition: createTransitionStyle('transform', transitionProps),
  };

  return (
    <ButtonBase {...rest}>
      <AngleRightIcon size="4x" {...styleProps} />
    </ButtonBase>
  );
});

TableRowToggleIcon.displayName = 'TableRowToggleIcon';

export default TableRowToggleIcon;
