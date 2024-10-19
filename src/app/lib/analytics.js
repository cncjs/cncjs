import GoogleAnalytics from 'react-ga4';
import settings from '@app/config/settings';

export const initialize = () => {
  if (GoogleAnalytics.isInitialized) {
    return;
  }
  GoogleAnalytics.initialize([
    {
      trackingId: settings.analytics.trackingId,
      gaOptions: {
        cookieDomain: 'none'
      }
    },
  ]);
};

export const pageview = ({ page }) => {
  if (!GoogleAnalytics.isInitialized) {
    return;
  }
  GoogleAnalytics.send({ hitType: 'pageview', page: page });
};

export const event = (args) => {
  if (!GoogleAnalytics.isInitialized) {
    return;
  }
  const { category, action, label, value, nonInteraction, transport } = { ...args };
  GoogleAnalytics.event({ category, action, label, value, nonInteraction, transport });
};
