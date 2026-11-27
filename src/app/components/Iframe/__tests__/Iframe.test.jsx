import React from 'react';
import { fireEvent } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';
import Iframe from '..';

test('caller style props override the base border and retain vertical alignment', () => {
  const view = renderAppUI(<Iframe border="3px solid red" verticalAlign="top" />);
  expect(view.container.querySelector('iframe')).toHaveStyle({
    borderWidth: '3px',
    verticalAlign: 'top',
  });
});

test.each([
  ['object', { verticalAlign: 'top', border: '3px solid red' }],
  ['function', () => ({ verticalAlign: 'top', border: '3px solid red' })],
  ['array', [{ verticalAlign: 'top' }, () => ({ border: '3px solid red' })]],
])('preserves %s sx and lets caller styles override the default border', (name, sx) => {
  const view = renderAppUI(<Iframe sx={sx} />);
  expect(view.container.querySelector('iframe')).toHaveStyle({
    verticalAlign: 'top',
    borderWidth: '3px',
  });
});

test('exposes the mounted iframe before load and clears the ref on unmount', () => {
  const ref = React.createRef();
  const onLoad = jest.fn();
  const view = renderAppUI(<Iframe ref={ref} onLoad={onLoad} />);
  const iframe = view.container.querySelector('iframe');
  expect(ref.current).toBe(iframe);
  expect(ref.current.contentWindow).not.toBeNull();
  expect(onLoad).not.toHaveBeenCalled();
  view.unmount();
  expect(ref.current).toBeNull();
});

test('callback refs follow mount, replacement and unmount without losing native listeners', () => {
  const first = jest.fn();
  const next = jest.fn();
  const onLoad = jest.fn();
  const view = renderAppUI(<Iframe ref={first} onLoad={onLoad} />);
  const iframe = view.container.querySelector('iframe');
  expect(first).toHaveBeenLastCalledWith(iframe);
  view.rerender(<Iframe ref={next} onLoad={onLoad} />);
  expect(first).toHaveBeenLastCalledWith(null);
  expect(next).toHaveBeenLastCalledWith(iframe);
  fireEvent.load(iframe);
  expect(onLoad).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(next).toHaveBeenLastCalledWith(null);
  fireEvent.load(iframe);
  expect(onLoad).toHaveBeenCalledTimes(1);
});

test('URL and callbacks update without stale handlers; error keeps its native event shape', () => {
  const first = jest.fn();
  const latest = jest.fn();
  const onError = jest.fn();
  const view = renderAppUI(<Iframe src="/first" onLoad={first} />);
  const iframe = view.container.querySelector('iframe');
  expect(iframe.getAttribute('sandbox')).toBe('allow-forms allow-modals allow-popups allow-same-origin allow-scripts');
  expect(iframe).not.toHaveAttribute('title');
  expect(iframe).toHaveStyle({ borderWidth: '0px' });
  fireEvent.load(iframe);
  expect(first).toHaveBeenCalledTimes(1);
  view.rerender(<Iframe
    src="/second" sandbox={false} onLoad={latest}
    title="Machine preview" data-testid="preview"
    style={{ height: '240px', borderWidth: 3 }}
    onError={onError}
  />);
  expect(iframe.getAttribute('src')).toBe('/second');
  expect(iframe.hasAttribute('sandbox')).toBe(false);
  expect(iframe).toHaveAccessibleName('Machine preview');
  expect(iframe).toHaveAttribute('data-testid', 'preview');
  expect(iframe).toHaveStyle({ height: '240px', borderWidth: '3px' });
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
