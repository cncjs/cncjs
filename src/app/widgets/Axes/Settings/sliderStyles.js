// Keep rc-slider's range and keyboard behavior; theme only its visual parts.
const sliderStyles = {
  px: '2x',
  py: '2x',
  '& .rc-slider': { height: '24px', padding: '10px 0' },
  '& .rc-slider-rail': { height: '4px', backgroundColor: 'border.primary' },
  '& .rc-slider-track': { height: '4px', backgroundColor: 'info.icon' },
  '& .rc-slider-handle': {
    width: '16px',
    height: '16px',
    marginTop: '-6px',
    border: '2px solid',
    borderColor: 'info.icon',
    backgroundColor: 'background.high',
    opacity: 1,
  },
  '& .rc-slider-handle:hover, & .rc-slider-handle:active': {
    borderColor: 'info.icon',
    boxShadow: 'none',
  },
  '& .rc-slider-handle:focus-visible': {
    outline: '2px solid',
    outlineColor: 'info.icon',
    outlineOffset: '3px',
    boxShadow: 'none',
  },
  '& .rc-slider-dot': {
    width: '6px',
    height: '6px',
    bottom: '-1px',
    borderColor: 'border.primary',
    backgroundColor: 'background.high',
  },
};

export default sliderStyles;
