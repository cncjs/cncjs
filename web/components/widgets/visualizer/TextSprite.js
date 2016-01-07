import THREE from 'three';

// TextSprite
class TextSprite {
    // @param {object} options The options object
    // @param {number} [options.x] The point on the x-axis
    // @param {number} [options.y] The point on the y-axis
    // @param {number} [options.z] The point on the z-axis
    // @param {string} [options.text] The text string
    // @param {number} [options.textHeight] The text height
    // @param {string} [options.color] The color
    constructor(options) {
        let textObject = new THREE.Object3D();
        let textHeight = options.textHeight || 100;
        let textWidth = 0;
        let actualFontSize = options.size || 10;

        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        context.font = 'normal ' + textHeight + 'px Arial';
        let metrics = context.measureText(options.text);
        textWidth = metrics.width;

        canvas.width = textWidth;
        canvas.height = textHeight;

        context.font = 'normal ' + textHeight + 'px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillStyle = options.color;
        context.fillText(options.text, textWidth / 2, textHeight / 2);

        let texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;
        texture.minFilter = THREE.LinearFilter;

        let material = new THREE.SpriteMaterial({
            map: texture,
            useScreenCoordinates: false,
            transparent: true,
            opacity: 0.6
        });

        textObject.position.x = options.x || 0;
        textObject.position.y = options.y || 0;
        textObject.position.z = options.z || 0;
        textObject.textHeight = actualFontSize;
        textObject.textWidth = (textWidth / textHeight) * textObject.textHeight;

        let sprite = new THREE.Sprite(material);
        sprite.scale.set(textWidth / textHeight * actualFontSize, actualFontSize, 1);

        textObject.add(sprite);

        return textObject;
    }
}

export default TextSprite;
