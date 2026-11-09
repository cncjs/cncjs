import React from 'react';
import { fireEvent } from '@testing-library/react';
import { PortalManager, ToastManager } from '@tonic-ui/react';
import { MemoryRouter } from 'react-router-dom';
import { renderAppUI } from '@app/test/render';

const mockConfigGet = jest.fn((key) => ({
  'session.enabled': true,
  'session.name': 'user',
  'settings.appearance': 'light',
  'settings.language': 'en',
}[key]));

jest.mock('@app/lib/user', () => ({
  __esModule: true,
  isAuthenticated: jest.fn(() => true),
  getDisplayName: jest.fn(() => 'user'),
}));

jest.mock('@app/lib/analytics', () => ({
  initialize: jest.fn(),
  pageview: jest.fn(),
}));

jest.mock('@app/lib/i18n', () => ({
  __esModule: true,
  default: {
    _: value => value,
  },
}));

jest.mock('@app/lib/log', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

jest.mock('@app/lib/controller', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    disconnect: jest.fn(),
  },
}));

jest.mock('@app/api/axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: { records: [] } })),
  },
}));

jest.mock('@app/i18next', () => ({
  __esModule: true,
  default: {
    language: 'en',
    changeLanguage: jest.fn((value, callback) => callback?.(null, text => text)),
  },
}));

jest.mock('@app/store/config', () => ({
  __esModule: true,
  default: {
    get: mockConfigGet,
    set: jest.fn(),
  },
}));

jest.mock('@app/config/settings', () => ({
  __esModule: true,
  default: {
    productName: 'CNCjs',
    version: '2.0.0',
    url: {
      wiki: 'https://example.org/wiki',
      issues: 'https://example.org/issues',
      releases: 'https://example.org/releases',
    },
  },
}));

jest.mock('@app/queries/session', () => ({
  signoutAndClearSession: jest.fn(),
}));

jest.mock('@app/pages/About', () => ({
  __esModule: true,
  default: () => <div>About page</div>,
}));

jest.mock('@app/pages/Administration', () => ({
  __esModule: true,
}));

jest.mock('@app/pages/Workspace', () => ({
  __esModule: true,
  default: () => <div>Workspace page</div>,
}));

const MainPage = require('../MainPage').default;

// Emulate a viewport width: media queries resolve against the width,
// while preference queries (color scheme) never match.
const setViewportWidth = (width) => {
  window.matchMedia = jest.fn((query) => {
    const minWidth = Number(query.match(/min-width:\s*([\d.]+)px/)?.[1] ?? 0);

    return {
      matches: !query.includes('prefers-') && width >= minWidth,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });
};

const getNav = (container) => container.querySelector('nav');

const navShowsChildRoutes = (nav) => [...nav.querySelectorAll('*')].some(
  (el) => el.childElementCount === 0 && el.textContent === 'Commands'
);

const renderMain = () => renderAppUI(
  <ToastManager placement="bottom-right">
    <PortalManager>
      <MemoryRouter initialEntries={['/about']}>
        <MainPage />
      </MemoryRouter>
    </PortalManager>
  </ToastManager>
);

describe('MainPage responsive navigation layout', () => {
  afterEach(() => {
    // Restore the global matchMedia mock from the test setup.
    window.matchMedia = jest.fn(() => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  test('at lg (1440px) the rail expands and collapses with the toggle', () => {
    setViewportWidth(1440);
    const { container } = renderMain();
    const toggle = () => fireEvent.click(
      container.querySelector('[aria-label="Toggle navigation"]')
    );

    expect(getNav(container)).not.toBeNull();
    expect(navShowsChildRoutes(getNav(container))).toBe(false);

    toggle();
    expect(navShowsChildRoutes(getNav(container))).toBe(true);

    toggle();
    expect(navShowsChildRoutes(getNav(container))).toBe(false);
  });

  test('below lg (1439px) the rail stays collapsed and the toggle opens the drawer instead', () => {
    setViewportWidth(1439);
    const { container } = renderMain();
    const toggle = () => fireEvent.click(
      container.querySelector('[aria-label="Toggle navigation"]')
    );

    // The rail renders (at/above md) but must not expand below lg.
    expect(getNav(container)).not.toBeNull();
    expect(navShowsChildRoutes(getNav(container))).toBe(false);

    toggle();
    expect(navShowsChildRoutes(getNav(container))).toBe(false);
    expect(document.querySelector('[aria-label="Main navigation"]')).not.toBeNull();
  });
});
