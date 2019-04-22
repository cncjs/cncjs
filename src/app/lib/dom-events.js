export const preventDefault = (e) => {
    if (typeof e.preventDefault !== 'undefined') {
        e.preventDefault();
    } else {
        e.returnValue = false;
    }
};

export const stopPropagation = (e) => {
    if (typeof e.stopPropagation !== 'undefined') {
        e.stopPropagation();
    } else {
        e.cancelBubble = true;
    }
};

// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Compatibility
export const addEventListener = (target, type, listener) => {
    if (target.addEventListener) { // Standard
        target.addEventListener(type, listener, false);
    } else if (target.attachEvent) { // IE8
        // In Internet Explorer versions before IE 9, you have to use attachEvent rather than the standard addEventListener.
        target.attachEvent('on' + type, listener);
    }
};

// https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
export const removeEventListener = (target, type, listener) => {
    if (target.removeEventListener) { // Standard
        target.removeEventListener(type, listener, false);
    } else if (target.detachEvent) { // IE8
        // In Internet Explorer versions before IE 9, you have to use detachEvent rather than the standard removeEventListener.
        target.detachEvent('on' + type, listener);
    }
};
