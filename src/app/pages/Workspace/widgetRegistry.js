import AutolevelWidget from '@app/widgets/Autolevel';
import AxesWidget from '@app/widgets/Axes';
import ConnectionWidget from '@app/widgets/Connection';
import ConsoleWidget from '@app/widgets/Console';
import CustomWidget from '@app/widgets/Custom';
import GCodeWidget from '@app/widgets/GCode';
import GrblWidget from '@app/widgets/Grbl';
import LaserWidget from '@app/widgets/Laser';
import MacroWidget from '@app/widgets/Macro';
import MarlinWidget from '@app/widgets/Marlin';
import ProbeWidget from '@app/widgets/Probe';
import SmoothieWidget from '@app/widgets/Smoothie';
import SpindleWidget from '@app/widgets/Spindle';
import TinyGWidget from '@app/widgets/TinyG';
import ToolWidget from '@app/widgets/Tool';
import VisualizerWidget from '@app/widgets/Visualizer';
import WebcamWidget from '@app/widgets/Webcam';
import {
  GRBL,
  MARLIN,
  SMOOTHIE,
  TINYG,
} from '@app/constants/controller';

export const WIDGET_REGISTRY = {
  autolevel: { Component: AutolevelWidget, hasFrame: true },
  axes: { Component: AxesWidget, hasFrame: true },
  connection: { Component: ConnectionWidget, hasFrame: true },
  console: { Component: ConsoleWidget, hasFrame: true },
  custom: { Component: CustomWidget, hasFrame: true },
  gcode: { Component: GCodeWidget, hasFrame: true },
  grbl: { Component: GrblWidget, hasFrame: true, controllerType: GRBL },
  laser: { Component: LaserWidget, hasFrame: true },
  macro: { Component: MacroWidget, hasFrame: true },
  marlin: { Component: MarlinWidget, hasFrame: true, controllerType: MARLIN },
  probe: { Component: ProbeWidget, hasFrame: true },
  smoothie: { Component: SmoothieWidget, hasFrame: true, controllerType: SMOOTHIE },
  spindle: { Component: SpindleWidget, hasFrame: true },
  tinyg: { Component: TinyGWidget, hasFrame: true, controllerType: TINYG },
  tool: { Component: ToolWidget, hasFrame: true },
  visualizer: { Component: VisualizerWidget, hasFrame: false },
  webcam: { Component: WebcamWidget, hasFrame: true },
};
