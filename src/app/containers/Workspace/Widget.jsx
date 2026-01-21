import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import AutoLevelWidget from 'app/widgets/AutoLevel';
import AxesWidget from 'app/widgets/Axes';
import ConnectionWidget from 'app/widgets/Connection';
import ConsoleWidget from 'app/widgets/Console';
import GCodeWidget from 'app/widgets/GCode';
import GrblWidget from 'app/widgets/Grbl';
import LaserWidget from 'app/widgets/Laser';
import MacroWidget from 'app/widgets/Macro';
import MarlinWidget from 'app/widgets/Marlin';
import ProbeWidget from 'app/widgets/Probe';
import SmoothieWidget from 'app/widgets/Smoothie';
import SpindleWidget from 'app/widgets/Spindle';
import CustomWidget from 'app/widgets/Custom';
import TinyGWidget from 'app/widgets/TinyG';
import ToolWidget from 'app/widgets/Tool';
import VisualizerWidget from 'app/widgets/Visualizer';
import WebcamWidget from 'app/widgets/Webcam';

const getWidgetByName = (name) => {
  return {
    'autolevel': AutoLevelWidget,
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
    'tool': ToolWidget,
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
