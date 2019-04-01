import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import AxesWidget from 'web/widgets/Axes';
import ConnectionWidget from 'web/widgets/Connection';
import ConsoleWidget from 'web/widgets/Console';
import GCodeWidget from 'web/widgets/GCode';
import GrblWidget from 'web/widgets/Grbl';
import LaserWidget from 'web/widgets/Laser';
import MacroWidget from 'web/widgets/Macro';
import MarlinWidget from 'web/widgets/Marlin';
import ProbeWidget from 'web/widgets/Probe';
import SmoothieWidget from 'web/widgets/Smoothie';
import SpindleWidget from 'web/widgets/Spindle';
import CustomWidget from 'web/widgets/Custom';
import TinyGWidget from 'web/widgets/TinyG';
import VisualizerWidget from 'web/widgets/Visualizer';
import WebcamWidget from 'web/widgets/Webcam';

const getWidgetByName = (name) => {
    return {
        'axes': AxesWidget,
        'connection': ConnectionWidget,
        'console': ConsoleWidget,
        'gcode': GCodeWidget,
        'grbl': GrblWidget,
        'laser': LaserWidget,
        'macro': MacroWidget,
        'marlin': MarlinWidget,
        'probe': ProbeWidget,
        'smoothie': SmoothieWidget,
        'spindle': SpindleWidget,
        'custom': CustomWidget,
        'tinyg': TinyGWidget,
        'visualizer': VisualizerWidget,
        'webcam': WebcamWidget
    }[name] || null;
};

class WidgetWrapper extends PureComponent {
    widget = null;

    render() {
        const { widgetId } = this.props;

        if (typeof widgetId !== 'string') {
            return null;
        }

        // e.g. "webcam" or "webcam:d8e6352f-80a9-475f-a4f5-3e9197a48a23"
        const name = widgetId.split(':')[0];
        const Widget = getWidgetByName(name);

        if (!Widget) {
            return null;
        }

        return (
            <Widget
                {...this.props}
                ref={node => {
                    this.widget = node;
                }}
            />
        );
    }
}

WidgetWrapper.propTypes = {
    widgetId: PropTypes.string.isRequired
};

export default WidgetWrapper;
