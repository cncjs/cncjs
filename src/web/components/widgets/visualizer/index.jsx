import React from 'react';
import Visualizer from './Visualizer';
import Widget from '../../widget';
import './index.styl';

const VisualizerWidget = (props) => {
    return (
        <div {...props} data-ns="widgets/visualizer">
            <Widget borderless={true}>
                <Widget.Content>
                    <Visualizer />
                </Widget.Content>
            </Widget>
        </div>
    );
};

export default VisualizerWidget;
