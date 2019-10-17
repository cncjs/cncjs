import React from 'react';
import setDisplayName from 'recompose/setDisplayName';
import wrapDisplayName from 'recompose/wrapDisplayName';

const withContextConsumer = ({ context: Context }) => BaseComponent => {
    const factory = React.createFactory(BaseComponent);

    class WithContextConsumer extends React.Component {
        render() {
            return (
                <Context.Consumer>
                    {(contextProps) => factory({
                        ...contextProps,
                        ...this.props
                    })}
                </Context.Consumer>
            );
        }
    }

    if (process.env.NODE_ENV === 'development') {
        return setDisplayName(wrapDisplayName(BaseComponent, 'withContextConsumer'))(WithContextConsumer);
    }

    return WithContextConsumer;
};

export default withContextConsumer;
