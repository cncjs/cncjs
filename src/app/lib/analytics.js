import GoogleAnalytics from 'react-ga';
import settings from 'app/config/settings';

// https://github.com/ReactTraining/react-router/issues/4278#issuecomment-299692502
GoogleAnalytics.initialize(settings.analytics.trackingId, {
  gaOptions: {
    cookieDomain: 'none'
  }
});

export const trackPage = (page) => {
  GoogleAnalytics.set({ page });
  GoogleAnalytics.pageview(page);
};
