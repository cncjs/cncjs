import omit from 'lodash/omit';
import React, { Component, PropTypes } from 'react';

class Interpolate extends Component {
    static propTypes = {
        format: PropTypes.string,
        parent: PropTypes.string,
        prefix: PropTypes.string,
        suffix: PropTypes.string,
        replacement: PropTypes.oneOfType([
            PropTypes.array,
            PropTypes.object
        ])
    };
    static defaultProps = {
        parent: 'span',
        prefix: '{{',
        suffix: '}}'
    };

    render() {
        const { parent, prefix, suffix, replacement } = this.props;
        const REGEXP = new RegExp(prefix + '(.+?)' + suffix);
        const format = this.props.format || this.props.children;

        if (!format || typeof format !== 'string') {
            return React.createElement('noscript', null);
        }

        let props = omit(this.props, ['parent', 'prefix', 'suffix', 'replacement']);
        let matches = [];
        let children = [];

        // "AAA {{foo}} BBB {{bar}}".split(REGEXP)
        // ["AAA ", "foo", " BBB ", "bar", ""]
        format.split(REGEXP).reduce((memo, match, index) => {
            let child = null;

            if (index % 2 === 0) {
                if (match.length === 0) {
                    return memo;
                }
                child = match;
            } else if (replacement) {
                child = replacement[match];
            } else {
                child = this.props[match];
                matches.push(match);
            }

            memo.push(child);

            return memo;
        }, children);

        props = omit(props, matches);

        return React.createElement.apply(this, [parent, props].concat(children));
    }
}

export default Interpolate;
