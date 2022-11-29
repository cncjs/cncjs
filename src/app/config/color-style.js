import {
  colorStyle,
} from '@tonic-ui/react';

export default {
  ...colorStyle,
  dark: {
    ...colorStyle.dark,
    component: {
      alert: {
        solid: {
          success: 'green:40',
          info: 'blue:40',
          warning: 'yellow:50',
          error: 'red:40',
        },
        outline: {
          success: 'green:40',
          info: 'blue:40',
          warning: 'yellow:50',
          error: 'red:40',
        },
      },
      header: {
        backgroundColor: 'gray:90',
        borderColor: 'gray:90',
        boxShadow: 'none',
      },
      footer: {
        backgroundColor: 'gray:90',
        borderColor: 'gray:90',
        boxShadow: 'none',
      },
    },
  },
  light: {
    ...colorStyle.light,
    component: {
      alert: {
        solid: {
          success: 'green:30',
          info: 'blue:30',
          warning: 'yellow:50',
          error: 'red:30',
        },
        outline: {
          success: 'green:50',
          info: 'blue:50',
          warning: 'yellow:50',
          error: 'red:40',
        },
      },
      header: {
        backgroundColor: '#eb5757',
        borderColor: '#eb5757',
        boxShadow: 'none',
      },
      footer: {
        backgroundColor: '#eb5757',
        borderColor: '#eb5757',
        boxShadow: 'none',
      },
    },
  },
};
