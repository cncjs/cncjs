import memoize from 'memoize-one';

/**
 * @author alteredq / http://alteredqualia.com/
 * @author mr.doob / http://mrdoob.com/
 */

// Memoize the result to mitigate the issue of WebGL context lost and restored
export const isWebGLAvailable = memoize(() => {
    try {
        let canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch (e) {
        return false;
    }
});

// Memoize the result to mitigate the issue of WebGL context lost and restored
export const isWebGL2Available = memoize(() => {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'));
    } catch (e) {
        return false;
    }
});

export const getWebGLErrorMessage = () => {
    return getErrorMessage(1);
};

export const getWebGL2ErrorMessage = () => {
    return getErrorMessage(2);
};

export const getErrorMessage = (version) => {
    const names = {
        1: 'WebGL',
        2: 'WebGL 2'
    };

    const contexts = {
        1: window.WebGLRenderingContext,
        2: window.WebGL2RenderingContext
    };

    let message = 'Your $0 does not seem to support <a href="http://khronos.org/webgl/wiki/Getting_a_WebGL_Implementation" style="color:#000">$1</a>';

    const element = document.createElement('div');
    element.id = 'webglmessage';
    element.style.fontFamily = 'monospace';
    element.style.fontSize = '14px';
    element.style.fontWeight = 'normal';
    element.style.textAlign = 'center';
    element.style.background = '#fff';
    element.style.color = '#000';
    element.style.padding = '1.5em';
    element.style.width = '400px';
    element.style.margin = '5em auto 0';

    if (contexts[version]) {
        message = message.replace('$0', 'graphics card');
    } else {
        message = message.replace('$0', 'browser');
    }

    message = message.replace('$1', names[version]);
    element.innerHTML = message;

    return element;
};
