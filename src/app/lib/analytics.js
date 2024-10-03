import GoogleAnalytics4 from 'react-ga4';

export const trackPage = (page) => {
  if (!GoogleAnalytics4.isInitialized) {
    return;
  }
  GoogleAnalytics4.send({ hitType: 'pageview', page: page });
};
