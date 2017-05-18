import PropTypes from 'prop-types';
import React from 'react';
import AxesWidget from '../../widgets/Axes';
import ConnectionWidget from '../../widgets/Connection';
import ConsoleWidget from '../../widgets/Console';
import GCodeWidget from '../../widgets/GCode';
import GrblWidget from '../../widgets/Grbl';
import LaserWidget from '../../widgets/Laser';
import MacroWidget from '../../widgets/Macro';
import ProbeWidget from '../../widgets/Probe';
import SmoothieWidget from '../../widgets/Smoothie';
import SpindleWidget from '../../widgets/Spindle';
import TinyGWidget from '../../widgets/TinyG';
import VisualizerWidget from '../../widgets/Visualizer';
import WebcamWidget from '../../widgets/Webcam';

const getWidgetByName = (name) => {
    return {
        'axes': AxesWidget,
        'connection': ConnectionWidget,
        'console': ConsoleWidget,
        'gcode': GCodeWidget,
        'grbl': GrblWidget,
        'laser': LaserWidget,
        'macro': MacroWidget,
        'probe': ProbeWidget,
        'smoothie': SmoothieWidget,
        'spindle': SpindleWidget,
        'tinyg': TinyGWidget,
        'visualizer': VisualizerWidget,
        'webcam': WebcamWidget
    }[name] || null;
};

const Widget = (props) => {
    const { widgetId } = { ...props };

    if (typeof widgetId !== 'string') {
        return null;
    }

    // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
    const name = widgetId.split(':')[0];
    const Component = getWidgetByName(name);

    return (
        <Component {...props} />
    );
};

Widget.propTypes = {
    widgetId: PropTypes.string.isRequired
};

export default Widget;
