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

const Widget = ({ widgetid, ...props }) => {
    const widget = {
        'axes': () => (
            <div data-widgetid={widgetid}>
                <AxesWidget {...props} />
            </div>
        ),
        'connection': () => (
            <div data-widgetid={widgetid}>
                <ConnectionWidget {...props} />
            </div>
        ),
        'console': () => (
            <div data-widgetid={widgetid}>
                <ConsoleWidget {...props} />
            </div>
        ),
        'gcode': () => (
            <div data-widgetid={widgetid}>
                <GCodeWidget {...props} />
            </div>
        ),
        'grbl': () => (
            <div data-widgetid={widgetid}>
                <GrblWidget {...props} />
            </div>
        ),
        'laser': () => (
            <div data-widgetid={widgetid}>
                <LaserWidget {...props} />
            </div>
        ),
        'macro': () => (
            <div data-widgetid={widgetid}>
                <MacroWidget {...props} />
            </div>
        ),
        'probe': () => (
            <div data-widgetid={widgetid}>
                <ProbeWidget {...props} />
            </div>
        ),
        'smoothie': () => (
            <div data-widgetid={widgetid}>
                <SmoothieWidget {...props} />
            </div>
        ),
        'spindle': () => (
            <div data-widgetid={widgetid}>
                <SpindleWidget {...props} />
            </div>
        ),
        'tinyg': () => (
            <div data-widgetid={widgetid}>
                <TinyGWidget {...props} />
            </div>
        ),
        'visualizer': () => (
            <div data-widgetid={widgetid}>
                <VisualizerWidget {...props} />
            </div>
        ),
        'webcam': () => (
            <div data-widgetid={widgetid}>
                <WebcamWidget {...props} />
            </div>
        )
    }[widgetid];

    return widget ? widget() : null;
};

export default Widget;
