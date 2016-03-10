import React from 'react';

import {
    AxesWidget,
    ConnectionWidget,
    ConsoleWidget,
    GCodeWidget,
    GrblWidget,
    ProbeWidget,
    SpindleWidget,
    VisualizerWidget,
    WebcamWidget
} from '../widgets';

const Widget = (props) => {
    const widgetId = props['data-widgetid'];
    const widget = {
        'axes': () => <AxesWidget {...props} />,
        'connection': () => <ConnectionWidget {...props} />,
        'console': () => <ConsoleWidget {...props} />,
        'gcode': () => <GCodeWidget {...props} />,
        'grbl': () => <GrblWidget {...props} />,
        'probe': () => <ProbeWidget {...props} />,
        'spindle': () => <SpindleWidget {...props} />,
        'visualizer': () => <VisualizerWidget {...props} />,
        'webcam': () => <WebcamWidget {...props} />
    }[widgetId];

    return widget ? widget() : null;
};

export default Widget;
