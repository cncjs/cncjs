import React from 'react';
import Visualizer from './Visualizer';
import Widget from '../../widget';
import './index.styl';

class VisualizerWidget extends React.Component {
    render() {
        return (
            <div {...this.props} data-ns="widgets/visualizer">
                <Widget borderless={true}>
                    <Widget.Content>
                        <Visualizer />
                    </Widget.Content>
                </Widget>
            </div>
        );
    }
}

export default VisualizerWidget;
