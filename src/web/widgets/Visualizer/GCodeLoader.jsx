import React, { PropTypes } from 'react';
import i18n from '../../lib/i18n';
import styles from './index.styl';

const Loading = () => (
    <div className={styles.loader}>
        <div className={styles.loaderIcon}>
            <i className="fa fa-spinner rotating" />
        </div>
        <div className={styles.loaderText}>
            {i18n._('Loading...')}
        </div>
    </div>
);

const Rendering = () => (
    <div className={styles.loader}>
        <div className={styles.loaderIcon}>
            <i className="fa fa-cube rotating" />
        </div>
        <div className={styles.loaderText}>
            {i18n._('Rendering...')}
        </div>
    </div>
);

const GCodeLoader = (props) => {
    const { state } = props;
    const { gcode } = state;

    if (gcode.loading) {
        return <Loading />;
    }

    if (gcode.rendering) {
        return <Rendering />;
    }

    return null;
};

GCodeLoader.propTypes = {
    state: PropTypes.object
};

export default GCodeLoader;
