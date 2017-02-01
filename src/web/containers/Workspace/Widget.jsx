import React from 'react';
import AxesWidget from '../../widgets/Axes';
import ConnectionWidget from '../../widgets/Connection';
import ConsoleWidget from '../../widgets/Console';
import GCodeWidget from '../../widgets/GCode';
import GrblWidget from '../../widgets/Grbl';
import MacroWidget from '../../widgets/Macro';
import ProbeWidget from '../../widgets/Probe';
import SmoothieWidget from '../../widgets/Smoothie';
import SpindleWidget from '../../widgets/Spindle';
import TinyG2Widget from '../../widgets/TinyG2';
import VisualizerWidget from '../../widgets/Visualizer';
import WebcamWidget from '../../widgets/Webcam';

const Widget = ({ widgetid, key, ...props }) => {
    const widget = {
        'axes': () => (
            <div data-widgetid={widgetid} key={key}>
                <AxesWidget {...props} />
            </div>
        ),
        'connection': () => (
            <div data-widgetid={widgetid} key={key}>
                <ConnectionWidget {...props} />
            </div>
        ),
        'console': () => (
            <div data-widgetid={widgetid} key={key}>
                <ConsoleWidget {...props} />
            </div>
        ),
        'gcode': () => (
            <div data-widgetid={widgetid} key={key}>
                <GCodeWidget {...props} />
            </div>
        ),
        'grbl': () => (
            <div data-widgetid={widgetid} key={key}>
                <GrblWidget {...props} />
            </div>
        ),
        'macro': () => (
            <div data-widgetid={widgetid} key={key}>
                <MacroWidget {...props} />
            </div>
        ),
        'probe': () => (
            <div data-widgetid={widgetid} key={key}>
                <ProbeWidget {...props} />
            </div>
        ),
        'smoothie': () => (
            <div data-widgetid={widgetid} key={key}>
                <SmoothieWidget {...props} />
            </div>
        ),
        'spindle': () => (
            <div data-widgetid={widgetid} key={key}>
                <SpindleWidget {...props} />
            </div>
        ),
        'tinyg2': () => (
            <div data-widgetid={widgetid} key={key}>
                <TinyG2Widget {...props} />
            </div>
        ),
        'visualizer': () => (
            <div data-widgetid={widgetid} key={key}>
                <VisualizerWidget {...props} />
            </div>
        ),
        'webcam': () => (
            <div data-widgetid={widgetid} key={key}>
                <WebcamWidget {...props} />
            </div>
        )
    }[widgetid];

    return widget ? widget() : null;
};

export default Widget;
