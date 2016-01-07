import THREE from 'three';

// TextSprite
class TextSprite {
    // Creates a text sprite.
    constructor(options) {
        let textObject = new THREE.Object3D();
        let textHeight = 100;
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

        textObject.position.x = options.x;
        textObject.position.y = options.y;
        textObject.position.z = options.z;
        textObject.textHeight = actualFontSize;
        textObject.textWidth = (textWidth / textHeight) * textObject.textHeight;

        let sprite = new THREE.Sprite(material);
        sprite.scale.set(textWidth / textHeight * actualFontSize, actualFontSize, 1);

        textObject.add(sprite);

        return textObject;
    }
}

export default TextSprite;
