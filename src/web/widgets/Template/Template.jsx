import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import Iframe from '../../components/Iframe';

class Template extends PureComponent {
    static propTypes = {
        state: PropTypes.object,
        actions: PropTypes.object
    };

    render() {
        return (
            <Iframe
                width="100%"
                height="300"
                src=""
            />
        );
    }
}

export default Template;
