import React from 'react';
import AxesWidget from './axes';
import ConnectionWidget from './connection';
import ConsoleWidget from './console';
import GCodeWidget from './gcode';
import GrblWidget from './grbl';
import MacroWidget from './macro';
import ProbeWidget from './probe';
import SpindleWidget from './spindle';
import TinyG2Widget from './tinyg2';
import VisualizerWidget from './visualizer';
import WebcamWidget from './webcam';

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
