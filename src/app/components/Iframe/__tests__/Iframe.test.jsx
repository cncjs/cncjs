import React from 'react';
import { fireEvent } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';
import Iframe from '..';

test('URL and callbacks update without stale handlers; error keeps its native event shape', () => {
  const first = jest.fn();
  const latest = jest.fn();
  const onError = jest.fn();
  const view = renderAppUI(<Iframe src="/first" onLoad={first} />);
  const iframe = view.container.querySelector('iframe');
  expect(iframe.getAttribute('sandbox')).toBe('allow-forms allow-modals allow-popups allow-same-origin allow-scripts');
  expect(iframe.title).toBe('Custom widget');
  fireEvent.load(iframe);
  expect(first).toHaveBeenCalledTimes(1);
  view.rerender(<Iframe
    src="/second" sandbox={false} onLoad={latest}
    onError={onError}
  />);
  expect(iframe.getAttribute('src')).toBe('/second');
  expect(iframe.hasAttribute('sandbox')).toBe(false);
  fireEvent.load(iframe);
  fireEvent.error(iframe);
  expect(first).toHaveBeenCalledTimes(1);
  expect(latest).toHaveBeenCalledWith(expect.objectContaining({ iframe, event: expect.any(Event) }));
  expect(onError).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  view.unmount();
  fireEvent.load(iframe);
  expect(latest).toHaveBeenCalledTimes(1);
});

test('StrictMode owns one native listener set and releases it on unmount', () => {
  const onLoad = jest.fn();
  const onBeforeUnload = jest.fn();
  const onUnload = jest.fn();
  const view = renderAppUI(
    <React.StrictMode>
      <Iframe
        sandbox={{ allowScripts: true }}
        onLoad={onLoad} onBeforeUnload={onBeforeUnload} onUnload={onUnload}
      />
    </React.StrictMode>
  );
  const iframe = view.container.querySelector('iframe');
  expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
  fireEvent.load(iframe);
  fireEvent(iframe, new Event('beforeunload'));
  fireEvent(iframe, new Event('unload'));
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(onBeforeUnload).toHaveBeenCalledWith(expect.objectContaining({ iframe }));
  expect(onUnload).toHaveBeenCalledWith({ event: expect.any(Event) });
  view.unmount();
  fireEvent.load(iframe);
  fireEvent(iframe, new Event('beforeunload'));
  fireEvent(iframe, new Event('unload'));
  expect(onLoad).toHaveBeenCalledTimes(1);
  expect(onBeforeUnload).toHaveBeenCalledTimes(1);
  expect(onUnload).toHaveBeenCalledTimes(1);
});
