import React from 'react';
import AxesWidget from '../../widgets/axes';
import ConnectionWidget from '../../widgets/connection';
import ConsoleWidget from '../../widgets/console';
import GCodeWidget from '../../widgets/gcode';
import GrblWidget from '../../widgets/grbl';
import MacroWidget from '../../widgets/macro';
import ProbeWidget from '../../widgets/probe';
import SpindleWidget from '../../widgets/spindle';
import TinyG2Widget from '../../widgets/tinyg2';
import VisualizerWidget from '../../widgets/visualizer';
import WebcamWidget from '../../widgets/webcam';

const Widget = (props) => {
    const { widgetid, ...others } = props;
    const widget = {
        'axes': () => <AxesWidget data-widgetid={widgetid} {...others} />,
        'connection': () => <ConnectionWidget data-widgetid={widgetid} {...others} />,
        'console': () => <ConsoleWidget data-widgetid={widgetid} {...others} />,
        'gcode': () => <GCodeWidget data-widgetid={widgetid} {...others} />,
        'grbl': () => <GrblWidget data-widgetid={widgetid} {...others} />,
        'macro': () => <MacroWidget data-widgetid={widgetid} {...others} />,
        'probe': () => <ProbeWidget data-widgetid={widgetid} {...others} />,
        'spindle': () => <SpindleWidget data-widgetid={widgetid} {...others} />,
        'tinyg2': () => <TinyG2Widget data-widgetid={widgetid} {...others} />,
        'visualizer': () => <VisualizerWidget data-widgetid={widgetid} {...others} />,
        'webcam': () => <WebcamWidget data-widgetid={widgetid} {...others} />
    }[widgetid];

    return widget ? widget() : null;
};

export default Widget;
