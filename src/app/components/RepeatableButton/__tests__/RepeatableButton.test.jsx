import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderAppUI } from '@app/test/render';
import RepeatableButton from '..';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

function setup(props = {}) {
  const onClick = jest.fn();
  const view = renderAppUI(<RepeatableButton onClick={onClick} {...props}>Step</RepeatableButton>);
  return { ...view, onClick, button: screen.getByRole('button', { name: 'Step' }) };
}

test('short press and synthesized click issue exactly one action', () => {
  const { button, onClick } = setup();
  fireEvent.mouseDown(button);
  fireEvent.mouseUp(document.documentElement);
  fireEvent.click(button, { detail: 1 });
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('hold waits 500ms, repeats every 66ms and issues the final release action', () => {
  const { button, onClick } = setup();
  fireEvent.pointerDown(button);
  act(() => jest.advanceTimersByTime(499));
  expect(onClick).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(1));
  expect(onClick).toHaveBeenCalledTimes(1);
  act(() => jest.advanceTimersByTime(132));
  expect(onClick).toHaveBeenCalledTimes(3);
  fireEvent.pointerUp(document.documentElement);
  act(() => jest.advanceTimersByTime(1000));
  expect(onClick).toHaveBeenCalledTimes(4);
});

test.each(['Enter', ' '])('keyboard %s holds and releases once despite repeated keydown', key => {
  const { button, onClick } = setup();
  fireEvent.keyDown(button, { key });
  fireEvent.keyDown(button, { key, repeat: true });
  act(() => jest.advanceTimersByTime(500));
  expect(onClick).toHaveBeenCalledTimes(1);
  fireEvent.keyUp(document.documentElement, { key });
  act(() => jest.advanceTimersByTime(1000));
  expect(onClick).toHaveBeenCalledTimes(2);
});

test.each(['blur', 'window blur', 'pointer cancel', 'touch cancel'])('%s cancels without a release command', kind => {
  const { button, onClick } = setup();
  if (kind === 'touch cancel') {
    fireEvent.touchStart(button);
    fireEvent.touchCancel(document.documentElement);
  } else {
    fireEvent.pointerDown(button);
    if (kind === 'blur') {
      fireEvent.blur(button);
    }
    if (kind === 'window blur') {
      fireEvent(window, new Event('blur'));
    }
    if (kind === 'pointer cancel') {
      fireEvent.pointerCancel(document.documentElement);
    }
  }
  fireEvent.pointerUp(document.documentElement);
  act(() => jest.advanceTimersByTime(1000));
  expect(onClick).not.toHaveBeenCalled();
});

test('disabled and unmount clear an active hold', () => {
  const { button, onClick, rerender, unmount } = setup();
  fireEvent.mouseDown(button);
  rerender(<RepeatableButton disabled onClick={onClick}>Step</RepeatableButton>);
  act(() => jest.advanceTimersByTime(1000));
  fireEvent.mouseUp(button);
  expect(onClick).not.toHaveBeenCalled();
  rerender(<RepeatableButton onClick={onClick}>Step</RepeatableButton>);
  fireEvent.mouseDown(button);
  unmount();
  act(() => jest.advanceTimersByTime(1000));
  fireEvent.mouseUp(document.documentElement);
  expect(onClick).not.toHaveBeenCalled();
});

test('click activation uses the latest callback and disabled blocks it', () => {
  const { button, onClick, rerender } = setup();
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
  const latest = jest.fn();
  fireEvent.mouseDown(button);
  rerender(<RepeatableButton onClick={latest}>Step</RepeatableButton>);
  act(() => jest.advanceTimersByTime(500));
  fireEvent.mouseUp(button);
  expect(latest).toHaveBeenCalledTimes(2);
  rerender(<RepeatableButton disabled onClick={latest}>Step</RepeatableButton>);
  fireEvent.click(button);
  expect(latest).toHaveBeenCalledTimes(2);
});

test('compatibility mouse events do not duplicate a pointer press and release', () => {
  const { button, onClick } = setup();
  fireEvent.pointerDown(button);
  fireEvent.mouseDown(button);
  act(() => jest.advanceTimersByTime(500));
  fireEvent.pointerUp(button);
  fireEvent.mouseUp(button);
  fireEvent.click(button, { detail: 1 });
  expect(onClick).toHaveBeenCalledTimes(2);
  expect(jest.getTimerCount()).toBe(0);
});

test('touch release fires once and clears global hold listeners', () => {
  const { button, onClick, unmount } = setup();
  const add = jest.spyOn(document.documentElement, 'addEventListener');
  const remove = jest.spyOn(document.documentElement, 'removeEventListener');
  fireEvent.touchStart(button);
  const release = add.mock.calls.find(([name]) => name === 'touchend')[1];
  fireEvent.touchEnd(document.documentElement);
  expect(onClick).toHaveBeenCalledTimes(1);
  expect(remove).toHaveBeenCalledWith('touchend', release);
  expect(jest.getTimerCount()).toBe(0);
  fireEvent.touchStart(button);
  const lastRelease = add.mock.calls.filter(([name]) => name === 'touchend').pop()[1];
  unmount();
  expect(remove).toHaveBeenCalledWith('touchend', lastRelease);
  expect(jest.getTimerCount()).toBe(0);
  add.mockRestore();
  remove.mockRestore();
});

test('accessible click still works after releasing a mouse press outside the button', () => {
  const { button, onClick } = setup();
  fireEvent.mouseDown(button);
  fireEvent.mouseUp(document.documentElement);
  fireEvent.click(button, { detail: 0 });
  expect(onClick).toHaveBeenCalledTimes(2);
});
