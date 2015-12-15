import React from 'react';
import Visualizer from './visualizer';
import { Widget, WidgetHeader, WidgetContent } from '../../widget';
import './index.css';

class VisualizerWidget extends React.Component {
    render() {
        return (
            <div data-component="Widgets/VisualizerWidget">
                <Widget borderless={true}>
                    <WidgetContent>
                        <Visualizer />
                    </WidgetContent>
                </Widget>
            </div>
        );
    }
}

export default VisualizerWidget;
