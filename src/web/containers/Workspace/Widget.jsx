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

const sortableHandleClassName = 'sortable-handle';

const Widget = (props) => {
    const {
        widgetid,
        onDelete,
        ...others
    } = props;
    const widget = {
        'axes': () => (
            <div {...others} data-widgetid={widgetid}>
                <AxesWidget
                    onDelete={onDelete}
                    sortableHandleClassName={sortableHandleClassName}
                />
            </div>
        ),
        'connection': () => (
            <div {...others} data-widgetid={widgetid}>
                <ConnectionWidget
                    onDelete={onDelete}
                    sortableHandleClassName={sortableHandleClassName}
                />
            </div>
        ),
        'console': () => (
            <div {...others} data-widgetid={widgetid}>
                <ConsoleWidget
                    onDelete={onDelete}
                    sortableHandleClassName={sortableHandleClassName}
                />
            </div>
        ),
        'gcode': () => (
            <div {...others} data-widgetid={widgetid}>
                <GCodeWidget
                    onDelete={onDelete}
                    sortableHandleClassName={sortableHandleClassName}
                />
            </div>
        ),
        'grbl': () => (
            <div {...others} data-widgetid={widgetid}>
                <GrblWidget
                    onDelete={onDelete}
                    sortableHandleClassName={sortableHandleClassName}
                />
            </div>
        ),
        'macro': () => (
            <div {...others} data-widgetid={widgetid}>
                <MacroWidget
                    onDelete={onDelete}
                    sortableHandleClassName={sortableHandleClassName}
                />
            </div>
        ),
        'probe': () => (
            <div {...others} data-widgetid={widgetid}>
                <ProbeWidget
                    onDelete={onDelete}
                    sortableHandleClassName={sortableHandleClassName}
                />
            </div>
        ),
        'spindle': () => (
            <div {...others} data-widgetid={widgetid}>
                <SpindleWidget
                    onDelete={onDelete}
                    sortableHandleClassName={sortableHandleClassName}
                />
            </div>
        ),
        'tinyg2': () => (
            <div {...others} data-widgetid={widgetid}>
                <TinyG2Widget
                    onDelete={onDelete}
                    sortableHandleClassName={sortableHandleClassName}
                />
            </div>
        ),
        'visualizer': () => (
            <div {...others} data-widgetid={widgetid}>
                <VisualizerWidget />
            </div>
        ),
        'webcam': () => (
            <div {...others} data-widgetid={widgetid}>
                <WebcamWidget
                    onDelete={onDelete}
                    sortableHandleClassName={sortableHandleClassName}
                />
            </div>
        )
    }[widgetid];

    return widget ? widget() : null;
};

export default Widget;
