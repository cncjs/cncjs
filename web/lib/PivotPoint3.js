import _ from 'lodash';

export default class PivotPoint3 {
    pivotPoint = {
        x: 0,
        y: 0,
        z: 0
    }
    callback = () => {};

    // @param {object} options The options object
    // @param {number} [options.x] The pivot point on the x-axis
    // @param {number} [options.y] The pivot point on the y-axis
    // @param {number} [options.z] The pivot point on the z-axis
    // @param callback {function} The callback function
    constructor(options, callback) {
        options = _.defaults({}, options, { x: 0, y: 0, z: 0 });

        options.x = Number(options.x) || 0;
        options.y = Number(options.y) || 0;
        options.z = Number(options.z) || 0;

        this.callback = _.isFunction(callback) ? callback : this.callback;

        this.set(options.x, options.y, options.z);
    }
    // Sets a new pivot point to rotate objects
    // @param {number} x The pivot point on the x-axis
    // @param {number} y The pivot point on the y-axis
    // @param {number} z The pivot point on the z-axis
    set(x, y, z) {
        let { pivotPoint } = this;

        x = Number(x) || 0;
        y = Number(y) || 0;
        z = Number(z) || 0;

        // Pass relative position to the callback
        this.callback(-(x - pivotPoint.x), -(y - pivotPoint.y), -(z - pivotPoint.z));

        this.pivotPoint = { x: x, y: y, z: z };
    }
    // Sets the pivot point to the origin point (0, 0, 0)
    clear() {
        let { pivotPoint } = this;

        this.callback(pivotPoint.x, pivotPoint.y, pivotPoint.z);

        this.pivotPoint = { x: 0, y: 0, z: 0 };
    }
}
