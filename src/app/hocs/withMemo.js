import React from 'react';
import setDisplayName from 'recompose/setDisplayName';
import wrapDisplayName from 'recompose/wrapDisplayName';

const withMemo = (areEqual) => BaseComponent => {
    const MemoizedComponent = React.memo(BaseComponent, areEqual);

    class WithMemo extends React.Component {
        render() {
            return (
                <MemoizedComponent {...this.props} />
            );
        }
    }

    if (process.env.NODE_ENV === 'development') {
        return setDisplayName(wrapDisplayName(BaseComponent, 'withMemo'))(WithMemo);
    }

    return WithMemo;
};

export default withMemo;
