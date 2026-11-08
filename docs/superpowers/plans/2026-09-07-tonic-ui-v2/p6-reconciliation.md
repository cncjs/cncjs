# P6 reconciliation — 2026-10-01

Start HEAD `3a4853cb`. Final AST inspection parsed **360 production JS/JSX files**, including class declarations and expressions: **0 React classes, 0 createClass factories, 18 named domain classes**. Import inspection found zero styled-components/create-react-class imports. No files are exempted from React-class inspection. Every class below was manually checked for its superclass/imports and domain ownership.

The AST snapshot is [class-inventory.json](artifacts/p6/class-inventory.json). The P6 inspection used installed `@babel/parser` (unambiguous source, JSX) and `@babel/traverse` on every `.js/.jsx` under `src/app`, excluding `__tests__`; imported React Component/PureComponent aliases and React namespace bases identify React classes. Every discovered class, including anonymous/class expressions, is reviewed; no class is ignored by a regex exception. Current source has no CommonJS React base or indirect React superclass. Supplemental source/import scans include tests and reject legacy factories, findDOMNode/getWrappedInstance, styled-components and deleted adapters. The robust executable gate and fixture tests are still assigned to **B3**; this report does not claim that CLI exists.

## Named non-React class allowlist

| File / class | Retention reason |
| --- | --- |
| `src/app/lib/CNCJSController.js` — `CNCJSController` | Controller-report normalization/data model, with no React rendering or component inheritance. |
| `src/app/lib/combokeys.js` — `Combokeys` | Keyboard binding EventEmitter used by app shortcuts; owns keyboard resources, not React UI. |
| `src/app/lib/immutable-store.js` — `ImmutableStore` | Immutable data and change EventEmitter for configuration; not a component. |
| `src/app/lib/three/CombinedCamera.js` — `CombinedCamera` | Three.js Camera subclass owned by the visualizer engine; rendering geometry, not React. |
| `src/app/store/config/EventEmitterStore.js` — `EventEmitterStore` | Configuration EventEmitter store; not a React component. |
| `src/app/widgets/Axes/ShuttleControl.js` — `ShuttleControl` | Axes shuttle/hardware-key EventEmitter owner; not a React component. |
| `src/app/widgets/Console/History.js` — `History` | Console command history/cursor data model used by useTerminal. |
| `src/app/widgets/Visualizer/CoordinateAxes.js` — `CoordinateAxes` | Three.js axis geometry factory owned by the engine. |
| `src/app/widgets/Visualizer/Cuboid.js` — `Cuboid` | Visualizer bounding-box data/geometry operations. |
| `src/app/widgets/Visualizer/CuttingPointer.jsx` — `CuttingPointer` | Three.js cutting-tool pointer geometry; JSX filename contains a domain class, not a component. |
| `src/app/widgets/Visualizer/GCodeVisualizer.js` — `GCodeVisualizer` | Parsed G-code Three.js scene geometry/resource owner. |
| `src/app/widgets/Visualizer/GridLine.js` — `GridLine` | Three.js grid geometry factory. |
| `src/app/widgets/Visualizer/PivotPoint3.js` — `PivotPoint3` | Visualizer pivot-coordinate domain value; class expression included in AST reconciliation. |
| `src/app/widgets/Visualizer/ProbeVisualization.js` — `ProbeVisualization` | Probe-point Three.js geometry/resource owner. |
| `src/app/widgets/Visualizer/TextSprite.js` — `TextSprite` | Three.js text sprite/texture resource factory. |
| `src/app/widgets/Visualizer/Viewport.js` — `Viewport` | Engine viewport/projection dimensions and camera model. |
| `src/app/widgets/Visualizer/VisualizerEngine.js` — `VisualizerEngine` | Non-React renderer/camera/control resource engine owned by useVisualizer. |
| `src/app/widgets/shared/WidgetConfig.js` — `WidgetConfig` | Widget configuration access/persistence domain model. |

Console useTerminal/connection tests and Visualizer engine/resource/geometry/pivot tests cover the corresponding owners. Existing Axes state/jog/command tests cover its shuttle integration. This allowlist permits these domain classes only; it cannot permit inheritance from React Component/PureComponent.

## Final shared component family manifest

Only these five directories remain in `src/app/components`; all other historical families are absent. Contracts are those allowed in [P5](details/08a-component-families.md#task-p5domain-compositions-與-resource-owners). All rendered UI uses direct Tonic composition and functions.

| Family | Allowed domain contract | Current production consumers | Tests |
| --- | --- | --- | --- |
| CodePreview | Syntax highlighting/line presentation | Administration Commands, Events, Machines, Macros, WorkspaceSettings/import modal; Probe preview | components/CodePreview/__tests__/CodePreview.test.jsx: real G-code escaping/lines/empty and JSON |
| Iframe | Native frame event/URL resource owner | widgets/Custom/Custom.jsx | components/Iframe/__tests__/Iframe.test.jsx; widgets/Custom/__tests__/Custom.test.jsx |
| RepeatableButton | CNC press/hold timing and cancellation | Axes/Keypad; Grbl feed/rapid/spindle; Marlin/Smoothie/TinyG overrides | components/RepeatableButton/__tests__/RepeatableButton.test.jsx; real controller payload suites |
| Webcam | Local camera stream lifecycle | widgets/Webcam/Webcam.jsx | widgets/Webcam/__tests__/Webcam.test.jsx |
| Widget | CNC controlled frame composition and menu/actions | 16 frame shells; Visualizer frame/Header/Content/Footer composition | Workspace WidgetLayoutContract/WidgetGroups/WidgetLifecycle/WidgetHost; Widget DropdownButton tests |

## Original non-widget class inventory: every entry reconciled

The historical inventory lists **64 paths**: 54 component files, 7 page files, 2 deprecated files and withMemo. Missing files were deleted in prior migration tasks; retained files now contain functions. ConsoleWidget was outside that non-widget list and is migrated in P6. TopNav.old is already absent after P3; no runtime/source import resolves to it.

| Original path | Current result |
| --- | --- |
| `src/app/__deprecated/TopNav.old/QuickAccessToolbar.jsx` | Deleted; no source consumer |
| `src/app/__deprecated/TopNav.old/TopNav.jsx` | Deleted; no source consumer |
| `src/app/components/Anchor/Anchor.jsx` | Deleted; no source consumer |
| `src/app/components/Blink/Blink.jsx` | Deleted; no source consumer |
| `src/app/components/Breadcrumbs/Breadcrumbs.jsx` | Deleted; no source consumer |
| `src/app/components/Breadcrumbs/BreadcrumbsItem.jsx` | Deleted; no source consumer |
| `src/app/components/Checkbox/Checkbox.jsx` | Deleted; no source consumer |
| `src/app/components/Checkbox/CheckboxGroup.jsx` | Deleted; no source consumer |
| `src/app/components/Dropdown/Dropdown.jsx` | Deleted; no source consumer |
| `src/app/components/Dropdown/DropdownMenu.jsx` | Deleted; no source consumer |
| `src/app/components/Dropdown/DropdownMenuWrapper.jsx` | Deleted; no source consumer |
| `src/app/components/Dropdown/DropdownToggle.jsx` | Deleted; no source consumer |
| `src/app/components/Dropdown/MenuItem.jsx` | Deleted; no source consumer |
| `src/app/components/Form/Form.jsx` | Deleted; no source consumer |
| `src/app/components/GridSystem/Col.jsx` | Deleted; no source consumer |
| `src/app/components/GridSystem/Container.jsx` | Deleted; no source consumer |
| `src/app/components/GridSystem/Provider.jsx` | Deleted; no source consumer |
| `src/app/components/GridSystem/Resolver.jsx` | Deleted; no source consumer |
| `src/app/components/GridSystem/Row.jsx` | Deleted; no source consumer |
| `src/app/components/HorizontalForm/withContextConsumer.jsx` | Deleted; no source consumer |
| `src/app/components/Hoverable/Hoverable.jsx` | Deleted; no source consumer |
| `src/app/components/Iframe/Iframe.jsx` | Function implementation; no React class |
| `src/app/components/Infotip/Infotip.jsx` | Deleted; no source consumer |
| `src/app/components/Input/Input.jsx` | Deleted; no source consumer |
| `src/app/components/Loader/Loader.jsx` | Deleted; no source consumer |
| `src/app/components/Modal/Modal.jsx` | Deleted; no source consumer |
| `src/app/components/Modal/ModalBody.jsx` | Deleted; no source consumer |
| `src/app/components/Modal/ModalContext.js` | Deleted; no source consumer |
| `src/app/components/Modal/ModalFooter.jsx` | Deleted; no source consumer |
| `src/app/components/Modal/ModalHeader.jsx` | Deleted; no source consumer |
| `src/app/components/Modal/ModalOverlay.jsx` | Deleted; no source consumer |
| `src/app/components/Modal/Portal.jsx` | Deleted; no source consumer |
| `src/app/components/Navs/Nav.jsx` | Deleted; no source consumer |
| `src/app/components/Navs/NavItem.jsx` | Deleted; no source consumer |
| `src/app/components/Navs/TabContent.jsx` | Deleted; no source consumer |
| `src/app/components/Notifications/Notification.jsx` | Deleted; no source consumer |
| `src/app/components/Paginations/AutosizeInput.jsx` | Deleted; no source consumer |
| `src/app/components/Paginations/TablePagination.jsx` | Deleted; no source consumer |
| `src/app/components/Radio/RadioGroup.jsx` | Deleted; no source consumer |
| `src/app/components/RefHolder/RefHolder.jsx` | Deleted; no source consumer |
| `src/app/components/RootCloseWrapper/RootCloseWrapper.jsx` | Deleted; no source consumer |
| `src/app/components/RowsHelper/RowsHelper.jsx` | Deleted; no source consumer |
| `src/app/components/Table/Table.jsx` | Deleted; no source consumer |
| `src/app/components/Table/TableBody.jsx` | Deleted; no source consumer |
| `src/app/components/Table/TableHeader.jsx` | Deleted; no source consumer |
| `src/app/components/Table/TableRow.jsx` | Deleted; no source consumer |
| `src/app/components/Table/TableTemplate.jsx` | Deleted; no source consumer |
| `src/app/components/Toggle/Toggle.jsx` | Deleted; no source consumer |
| `src/app/components/ToggleSwitch/ToggleSwitch.jsx` | Deleted; no source consumer |
| `src/app/components/Tooltip/Tooltip.jsx` | Deleted; no source consumer |
| `src/app/components/Validation/createForm.js` | Deleted; no source consumer |
| `src/app/components/Validation/createFormControl.js` | Deleted; no source consumer |
| `src/app/components/Webcam/Webcam.jsx` | Function implementation; no React class |
| `src/app/components/Widget/Button.jsx` | Function implementation; no React class |
| `src/app/components/Widget/DropdownButton.jsx` | Function implementation; no React class |
| `src/app/components/Widget/Widget.jsx` | Function implementation; no React class |
| `src/app/hocs/withMemo.js` | Deleted; no source consumer |
| `src/app/pages/Workspace/DefaultWidgets.jsx` | Function implementation; no React class |
| `src/app/pages/Workspace/PrimaryWidgets.jsx` | Function implementation; no React class |
| `src/app/pages/Workspace/SecondaryWidgets.jsx` | Function implementation; no React class |
| `src/app/pages/Workspace/Widget.jsx` | Function implementation; no React class |
| `src/app/pages/Workspace/Workspace.jsx` | Function implementation; no React class |
| `src/app/pages/Workspace/widget-manager/WidgetListItem.jsx` | Function implementation; no React class |
| `src/app/pages/Workspace/widget-manager/WidgetManager.jsx` | Function implementation; no React class |

## P6 source drift / cleanup

- ConsoleWidget: final remaining React class becomes a function. Its Clear button previously referenced missing `this.clearAll`; it now emits `terminal:clear`, handled and unsubscribed by the existing terminal owner. Regression proves one clear and no controller write.
- Axes styled labels/Panel/TaskbarButton/Keypad text use direct Box/Button and sx. Numeric dimensions and margins remain explicit pixel values; disabled states and action payloads are covered by existing Axes tests. Tonic Button retains its accessible focus behavior. Unused Taskbar.Button alias and Laser OverflowEllipsis are deleted.
- styled-components dependency and orphaned transitive dependencies are removed. Workspace obsolete library mocks are removed. Production source and manifest/lock scans are zero.
- User-requested Console test formatting fixes pass targeted ESLint. Browser visual/theme/viewport evidence remains deferred to R6; this source/AST report does not claim visual equivalence. Production build stays assigned to CI per the standing instruction.


## Final verification

- `yarn test:frontend --runInBand`: exit 0, 71 suites / 478 tests. Focused Console/Axes/Workspace: 15 suites / 125 tests. Console Clear regression failed first on zero clear calls, then passed with the owner event.
- `yarn lint`: exit 0, zero errors / four existing warnings. The user-reported Console test formatting issues are corrected; targeted ESLint has zero errors/warnings.
- Development webpack compile: exit 0, one existing Workspace useState warning. Immutable Yarn install: exit 0, existing peer warnings. `git diff --check`: clean.
- Node suite (SocketConnection excluded): sandbox run failed only on three loopback listen EPERM cases. Approved retry passed all 19 suites / 571 tests but did not exit. Diagnostic `--detectOpenHandles --forceExit` run exited 0 and identified existing `grbl-simulator/grbl-simulator.js:346` planner setInterval handles. No simulator/server source was changed to conceal this inherited limitation; resource shutdown remains an outstanding final-validation item.
- No browser tooling/screenshots or simulator browser procedure, local production build, or push. Server/controller/Redux/store/simulator boundaries have zero source diff. P3 browser evidence remains deferred to R6.
