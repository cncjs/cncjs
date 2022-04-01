import {
  colorStyle,
} from '@tonic-ui/react';

export default {
  ...colorStyle,
  dark: {
    ...colorStyle.dark,
    component: {
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
