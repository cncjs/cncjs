import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Provider from './Provider';
import { ConfigurationContext, ScreenClassContext } from './context';

class Resolver extends Component {
    static propTypes = {
        children: PropTypes.func.isRequired,
    };

    render() {
        const { children } = this.props;

        return (
            <ConfigurationContext.Consumer>
                {config => (
                    <ScreenClassContext.Consumer>
                        {screenClass => {
                            if (!screenClass) {
                                return (
                                    <Provider>
                                        <ConfigurationContext.Consumer>
                                            {config => (
                                                <ScreenClassContext.Consumer>
                                                    {screenClass => children({ config, screenClass })}
                                                </ScreenClassContext.Consumer>
                                            )}
                                        </ConfigurationContext.Consumer>
                                    </Provider>
                                );
                            }

                            return children({ config, screenClass });
                        }}
                    </ScreenClassContext.Consumer>
                )}
            </ConfigurationContext.Consumer>
        );
    }
}

export default Resolver;
