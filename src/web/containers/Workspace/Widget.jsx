import React from 'react';
import AxesWidget from '../../widgets/Axes';
import ConnectionWidget from '../../widgets/Connection';
import ConsoleWidget from '../../widgets/Console';
import GCodeWidget from '../../widgets/GCode';
import GrblWidget from '../../widgets/Grbl';
import MacroWidget from '../../widgets/Macro';
import ProbeWidget from '../../widgets/Probe';
import SpindleWidget from '../../widgets/Spindle';
import TinyG2Widget from '../../widgets/TinyG2';
import VisualizerWidget from '../../widgets/Visualizer';
import WebcamWidget from '../../widgets/Webcam';

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
