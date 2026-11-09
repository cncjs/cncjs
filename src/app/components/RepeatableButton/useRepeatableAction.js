import { useCallback, useEffect, useRef } from 'react';

// CNC hold semantics: repeat while pressed, then one final action on normal release.
export default function useRepeatableAction(onAction, disabled) {
  const latest = useRef({ onAction, disabled });
  latest.current = { onAction, disabled };
  const active = useRef(null);
  const suppressClick = useRef(false);

  const invoke = useCallback(event => {
    if (!latest.current.disabled) {
      latest.current.onAction?.(event);
    }
  }, []);
  const finish = useCallback((release = false, event) => {
    const press = active.current;
    if (!press) {
      return;
    }
    active.current = null;
    clearTimeout(press.delay);
    clearInterval(press.interval);
    press.removeListeners();
    suppressClick.current = press.kind !== 'key';
    if (release) {
      invoke(event);
    }
  }, [invoke]);
  const start = (kind, event) => {
    if (latest.current.disabled || active.current) {
      return;
    }
    if (kind !== 'touch' && kind !== 'key' && event.button > 0) {
      return;
    }
    if (kind === 'pointer' && event.isPrimary === false) {
      return;
    }
    suppressClick.current = false;
    const press = { kind, key: event.key, pointerId: event.pointerId };
    const release = releaseEvent => {
      if (kind === 'key' && releaseEvent.key !== press.key) {
        return;
      }
      if (kind === 'pointer' && releaseEvent.pointerId !== press.pointerId) {
        return;
      }
      finish(true, releaseEvent);
    };
    const cancel = cancelEvent => {
      if (cancelEvent.type === 'pointercancel' && cancelEvent.pointerId !== press.pointerId) {
        return;
      }
      finish();
    };
    const releaseName = { pointer: 'pointerup', mouse: 'mouseup', touch: 'touchend', key: 'keyup' }[kind];
    const cancelName = { pointer: 'pointercancel', touch: 'touchcancel' }[kind];
    document.documentElement.addEventListener(releaseName, release);
    if (cancelName) {
      document.documentElement.addEventListener(cancelName, cancel);
    }
    window.addEventListener('blur', cancel);
    press.removeListeners = () => {
      document.documentElement.removeEventListener(releaseName, release);
      if (cancelName) {
        document.documentElement.removeEventListener(cancelName, cancel);
      }
      window.removeEventListener('blur', cancel);
    };
    active.current = press;
    // Synthetic events must survive until the delayed action.
    event.persist?.();
    press.delay = setTimeout(() => {
      invoke(event);
      if (active.current === press) {
        press.interval = setInterval(() => invoke(event), Math.floor(1000 / 15));
      }
    }, 500);
  };

  useEffect(() => {
    if (disabled) {
      finish();
    }
  }, [disabled, finish]);
  useEffect(() => () => finish(), [finish]);

  return {
    onPointerDown: event => start('pointer', event),
    onMouseDown: event => start('mouse', event),
    onTouchStart: event => start('touch', event),
    onKeyDown: event => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      if (!event.repeat) {
        start('key', event);
      }
    },
    onKeyUp: event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
      }
    },
    onBlur: () => finish(),
    onClick: event => {
      if (suppressClick.current) {
        suppressClick.current = false;
        if (event.detail !== 0) {
          return;
        }
      }
      if (!active.current) {
        invoke(event);
      }
    },
  };
}
