import GoogleAnalytics from 'react-ga';
import settings from '@app/config/settings';

// https://github.com/ReactTraining/react-router/issues/4278#issuecomment-299692502
GoogleAnalytics.initialize(settings.analytics.trackingId, {
  gaOptions: {
    cookieDomain: 'none'
  }
});

// https://github.com/react-ga/react-ga#api

export default Object.freeze({
  pageview: (page) => {
    GoogleAnalytics.pageview(page);
  },
  modalview: (modalName) => {
    GoogleAnalytics.modalview(modalName);
  },
  event: (args) => {
    const { category, action, label, value, nonInteraction, transport } = { ...args };
    GoogleAnalytics.event({ category, action, label, value, nonInteraction, transport });
  },
  timing: (args) => {
    const { category, action, label, value } = { ...args };
    GoogleAnalytics.timing({ category, action, label, value });
  },
  outboundLink: (args, hitCallback) => {
    const { label } = { ...args };
    GoogleAnalytics.outboundLink({ label }, hitCallback);
  },
  exception: (args) => {
    const { description, fatal } = { ...args };
    GoogleAnalytics.exception({ description, fatal });
  },
});
