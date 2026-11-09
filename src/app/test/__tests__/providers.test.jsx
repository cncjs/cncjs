import React, { useState } from 'react';
import { screen } from '@testing-library/react';
import { useTheme } from '@emotion/react';
import { useQueryClient } from '@tanstack/react-query';
import { Button, TonicProvider, createTheme } from '@tonic-ui/react';
import userEvent from '@testing-library/user-event';
import { renderAppUI } from '../render';

test('Tonic Button invokes its action once', async () => {
  const onClick = jest.fn();
  const view = renderAppUI(<Button onClick={onClick}>Apply</Button>);
  try {
    await userEvent.setup().click(screen.getByRole('button', { name: 'Apply' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  } finally {
    view.dispose();
  }
});

const ThemeMarker = () => {
  const theme = useTheme();
  return <span data-testid="theme-marker">{theme.marker}</span>;
};

const ThemeSwitcher = () => {
  const [marker, setMarker] = useState('light');
  return (
    <TonicProvider theme={createTheme({ marker })}>
      <Button onClick={() => setMarker('dark')}>Switch theme</Button>
      <ThemeMarker />
      <span>Persistent text</span>
    </TonicProvider>
  );
};

test('Tonic theme switches while preserving rendered text', async () => {
  const view = renderAppUI(<ThemeSwitcher />);
  try {
    expect(screen.getByTestId('theme-marker')).toHaveTextContent('light');
    expect(screen.getByText('Persistent text')).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Switch theme' }));

    expect(screen.getByTestId('theme-marker')).toHaveTextContent('dark');
    expect(screen.getByText('Persistent text')).toBeInTheDocument();
  } finally {
    view.dispose();
  }
});

test('Query consumers receive the render helper QueryClient', () => {
  const clients = [];
  const QueryConsumer = () => {
    clients.push(useQueryClient());
    return null;
  };
  const view = renderAppUI(<><QueryConsumer /><QueryConsumer /></>);
  try {
    expect(clients).toEqual([view.queryClient, view.queryClient]);
  } finally {
    view.dispose();
  }
});

test('dispose unmounts and clears cached query data', () => {
  const view = renderAppUI(<span>Disposable content</span>);
  view.queryClient.setQueryData(['disposable'], 'cached value');

  view.dispose();

  expect(view.container).toBeEmptyDOMElement();
  expect(view.queryClient.getQueryData(['disposable'])).toBeUndefined();
});
