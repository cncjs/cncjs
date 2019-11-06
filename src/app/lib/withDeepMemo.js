import _isEqual from 'lodash/isEqual';
import React from 'react';
import setDisplayName from 'recompose/setDisplayName';
import wrapDisplayName from 'recompose/wrapDisplayName';

const withDeepMemo = (options) => BaseComponent => {
    const { areEqual = _isEqual } = { ...options };
    const factory = React.createFactory(React.memo(BaseComponent, areEqual));

    class WithDeepMemo extends React.Component {
        render() {
            return factory({
                ...this.props,
            });
        }
    }

    if (process.env.NODE_ENV === 'development') {
        return setDisplayName(wrapDisplayName(BaseComponent, 'withDeepMemo'))(WithDeepMemo);
    }

    return WithDeepMemo;
};

export default withDeepMemo;
