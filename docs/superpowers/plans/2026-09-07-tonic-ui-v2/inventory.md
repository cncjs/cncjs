# 遷移盤點（2026-09-07）

本檔由目前 source 掃描產生，供 terra 細化 task；數量是 regex 靜態基線，最終需 AST/import graph 複核。所有路徑相對 repo root。

17 widgets；直接繼承 Component/PureComponent 的檔案共 109，其中 widgets 45。沒有直接 @trendmicro UI import；有本地 legacy families。

## 全部 widgets 與精確 source 範圍

### Autolevel

共 10 個 JS/JSX，2632 行；本地 component families：Buttons, Checkbox, FormControl, FormGroup, GridSystem, Infotip, InputGroup, Modal, ModalTemplate, Notifications, ProgressBar, Widget。

- `src/app/widgets/Autolevel/ApplyView.jsx` — React class
- `src/app/widgets/Autolevel/LandingView.jsx`
- `src/app/widgets/Autolevel/ProbeAreaDiagram.jsx`
- `src/app/widgets/Autolevel/SetupProbeView.jsx`
- `src/app/widgets/Autolevel/StartProbeModal.jsx` — React class
- `src/app/widgets/Autolevel/StopProbeModal.jsx` — React class
- `src/app/widgets/Autolevel/TestProbeModal.jsx` — React class
- `src/app/widgets/Autolevel/ZProbeDiagram.jsx`
- `src/app/widgets/Autolevel/constants.js`
- `src/app/widgets/Autolevel/index.jsx` — React class

### Axes

共 25 個 JS/JSX，4959 行；本地 component families：Buttons, Checkbox, Dropdown, FormGroup, GridSystem, Image, Infotip, Modal, Navs, Notifications, RepeatableButton, Table, Tooltip, Validation, Widget。

- `src/app/widgets/Axes/Axes.jsx`
- `src/app/widgets/Axes/DisplayPanel.jsx` — React class
- `src/app/widgets/Axes/Keypad.jsx` — React class
- `src/app/widgets/Axes/KeypadOverlay.jsx`
- `src/app/widgets/Axes/MDI.jsx` — React class
- `src/app/widgets/Axes/Settings/General.jsx` — React class
- `src/app/widgets/Axes/Settings/MDI/CreateRecord.jsx` — React class
- `src/app/widgets/Axes/Settings/MDI/MDI.jsx` — React class
- `src/app/widgets/Axes/Settings/MDI/TableRecords.jsx` — React class
- `src/app/widgets/Axes/Settings/MDI/UpdateRecord.jsx` — React class
- `src/app/widgets/Axes/Settings/MDI/constants.js`
- `src/app/widgets/Axes/Settings/MDI/index.js`
- `src/app/widgets/Axes/Settings/ShuttleXpress.jsx` — React class
- `src/app/widgets/Axes/Settings/index.jsx` — React class
- `src/app/widgets/Axes/ShuttleControl.js`
- `src/app/widgets/Axes/components/AxisLabel.jsx`
- `src/app/widgets/Axes/components/AxisSubscript.jsx`
- `src/app/widgets/Axes/components/Fraction.jsx`
- `src/app/widgets/Axes/components/Panel.jsx`
- `src/app/widgets/Axes/components/PositionInput.jsx` — React class
- `src/app/widgets/Axes/components/PositionLabel.jsx`
- `src/app/widgets/Axes/components/Taskbar.jsx`
- `src/app/widgets/Axes/components/TaskbarButton.jsx`
- `src/app/widgets/Axes/constants.js`
- `src/app/widgets/Axes/index.jsx` — React class

### Connection

共 2 個 JS/JSX，1336 行；本地 component families：Checkbox, Clickable, FormControl, FormGroup, GridSystem, InlineError, ModalTemplate, Widget。

- `src/app/widgets/Connection/Connection.jsx`
- `src/app/widgets/Connection/index.jsx` — React class

### Console

共 4 個 JS/JSX，999 行；本地 component families：Widget。

- `src/app/widgets/Console/Console.jsx`
- `src/app/widgets/Console/History.js`
- `src/app/widgets/Console/Terminal.jsx` — React class
- `src/app/widgets/Console/index.jsx` — React class

### Custom

共 3 個 JS/JSX，539 行；本地 component families：Buttons, FormControl, FormGroup, Iframe, InlineError, Modal, Widget。

- `src/app/widgets/Custom/Custom.jsx`
- `src/app/widgets/Custom/index.jsx` — React class
- `src/app/widgets/Custom/modals/SettingsModal.jsx`

### GCode

共 2 個 JS/JSX，363 行；本地 component families：FormGroup, GridSystem, HorizontalForm, Widget。

- `src/app/widgets/GCode/GCodeStats.jsx`
- `src/app/widgets/GCode/index.jsx` — React class

### Grbl

共 12 個 JS/JSX，1180 行；本地 component families：Buttons, Card, Center, Clickable, CollapsibleCard, FormGroup, GridSystem, HorizontalForm, Modal, Navs, Progress, RepeatableButton, Widget。

- `src/app/widgets/Grbl/FeedOverride.jsx`
- `src/app/widgets/Grbl/ModalGroups.jsx`
- `src/app/widgets/Grbl/QueueReports.jsx`
- `src/app/widgets/Grbl/RapidOverride.jsx`
- `src/app/widgets/Grbl/SpindleOverride.jsx`
- `src/app/widgets/Grbl/StatusReports.jsx`
- `src/app/widgets/Grbl/components/OverflowEllipsis.jsx`
- `src/app/widgets/Grbl/components/OverrideReadout.jsx`
- `src/app/widgets/Grbl/components/Readout.jsx`
- `src/app/widgets/Grbl/index.jsx` — React class
- `src/app/widgets/Grbl/modals/ControllerModal.jsx`
- `src/app/widgets/Grbl/modals/PreviewCode.jsx`

### Laser

共 5 個 JS/JSX，573 行；本地 component families：Buttons, Card, Center, Clickable, CollapsibleCard, FormControl, FormGroup, GridSystem, HorizontalForm, InputGroup, RepeatableButton, Widget。

- `src/app/widgets/Laser/LaserIntensityOverride.jsx`
- `src/app/widgets/Laser/LaserTest.jsx`
- `src/app/widgets/Laser/components/OverflowEllipsis.jsx`
- `src/app/widgets/Laser/components/OverrideReadout.jsx`
- `src/app/widgets/Laser/index.jsx` — React class

### Macro

共 9 個 JS/JSX，1330 行；本地 component families：Buttons, FormGroup, InlineError, Modal, RenderBlock, Widget。

- `src/app/widgets/Macro/Macro.jsx`
- `src/app/widgets/Macro/context.js`
- `src/app/widgets/Macro/index.jsx` — React class
- `src/app/widgets/Macro/modals/ConfirmDeleteMacro.jsx`
- `src/app/widgets/Macro/modals/EditMacro.jsx`
- `src/app/widgets/Macro/modals/LoadMacro.jsx`
- `src/app/widgets/Macro/modals/NewMacro.jsx`
- `src/app/widgets/Macro/modals/RunMacro.jsx`
- `src/app/widgets/Macro/shared/variables.js`

### Marlin

共 9 個 JS/JSX，1315 行；本地 component families：Buttons, Clickable, GridSystem, Modal, Navs, Panel, ProgressBar, RepeatableButton, Widget。

- `src/app/widgets/Marlin/Controller.jsx`
- `src/app/widgets/Marlin/DigitalReadout.jsx`
- `src/app/widgets/Marlin/FadeInOut.jsx`
- `src/app/widgets/Marlin/Marlin.jsx` — React class
- `src/app/widgets/Marlin/Overrides.jsx`
- `src/app/widgets/Marlin/constants.js`
- `src/app/widgets/Marlin/icons/extruder.jsx`
- `src/app/widgets/Marlin/icons/heated-bed.jsx`
- `src/app/widgets/Marlin/index.jsx` — React class

### Probe

共 4 個 JS/JSX，886 行；本地 component families：Buttons, CodePreview, FormControl, FormGroup, GridSystem, Hoverable, Infotip, InlineError, InputGroup, Modal, Widget。

- `src/app/widgets/Probe/Probe.jsx`
- `src/app/widgets/Probe/index.jsx` — React class
- `src/app/widgets/Probe/modals/ProbeModal.jsx`
- `src/app/widgets/Probe/modals/utils.js`

### Smoothie

共 6 個 JS/JSX，925 行；本地 component families：Buttons, Clickable, GridSystem, Modal, Navs, Panel, RepeatableButton, Widget。

- `src/app/widgets/Smoothie/Controller.jsx`
- `src/app/widgets/Smoothie/DigitalReadout.jsx`
- `src/app/widgets/Smoothie/Overrides.jsx`
- `src/app/widgets/Smoothie/Smoothie.jsx` — React class
- `src/app/widgets/Smoothie/constants.js`
- `src/app/widgets/Smoothie/index.jsx` — React class

### Spindle

共 2 個 JS/JSX，417 行；本地 component families：Buttons, FormControl, FormGroup, GridSystem, ImageIcon, InputGroup, Widget。

- `src/app/widgets/Spindle/Spindle.jsx`
- `src/app/widgets/Spindle/index.jsx` — React class

### TinyG

共 6 個 JS/JSX，1163 行；本地 component families：Buttons, Clickable, GridSystem, Modal, Navs, Panel, ProgressBar, RepeatableButton, Widget。

- `src/app/widgets/TinyG/Controller.jsx`
- `src/app/widgets/TinyG/DigitalReadout.jsx`
- `src/app/widgets/TinyG/Overrides.jsx`
- `src/app/widgets/TinyG/TinyG.jsx` — React class
- `src/app/widgets/TinyG/constants.js`
- `src/app/widgets/TinyG/index.jsx` — React class

### Tool

共 5 個 JS/JSX，1515 行；本地 component families：Buttons, Dropdown, Image, Tooltip, Widget。

- `src/app/widgets/Tool/Tool.jsx` — React class
- `src/app/widgets/Tool/constants.js`
- `src/app/widgets/Tool/index.jsx` — React class
- `src/app/widgets/Tool/insertAtCaret.js`
- `src/app/widgets/Tool/variables.js`

### Visualizer

共 22 個 JS/JSX，6360 行；本地 component families：Anchor, Buttons, Dropdown, GridSystem, I18n, Image, Modal, ModalTemplate, Notifications, Panel, ProgressBar, RepeatableButton, Tooltip, Widget。

- `src/app/widgets/Visualizer/CoordinateAxes.js`
- `src/app/widgets/Visualizer/Cuboid.js`
- `src/app/widgets/Visualizer/CuttingPointer.jsx`
- `src/app/widgets/Visualizer/Dashboard.jsx` — React class
- `src/app/widgets/Visualizer/GCodeVisualizer.js`
- `src/app/widgets/Visualizer/GridLine.js`
- `src/app/widgets/Visualizer/Loading.jsx`
- `src/app/widgets/Visualizer/Notifications.js`
- `src/app/widgets/Visualizer/PivotPoint3.js`
- `src/app/widgets/Visualizer/PrimaryToolbar.jsx` — React class
- `src/app/widgets/Visualizer/ProbeVisualization.js`
- `src/app/widgets/Visualizer/Rendering.jsx`
- `src/app/widgets/Visualizer/SecondaryToolbar.jsx` — React class
- `src/app/widgets/Visualizer/TextSprite.js`
- `src/app/widgets/Visualizer/Viewport.js`
- `src/app/widgets/Visualizer/Visualizer.jsx` — React class
- `src/app/widgets/Visualizer/WatchDirectory.jsx` — React class
- `src/app/widgets/Visualizer/WorkflowControl.jsx` — React class
- `src/app/widgets/Visualizer/constants.js`
- `src/app/widgets/Visualizer/helpers.js`
- `src/app/widgets/Visualizer/index.jsx` — React class
- `src/app/widgets/Visualizer/renderer.jsx`

### Webcam

共 7 個 JS/JSX，910 行；本地 component families：Anchor, Buttons, FormControl, FormGroup, GridSystem, Image, Modal, Radio, Tooltip, Webcam, Widget。

- `src/app/widgets/Webcam/Webcam.jsx`
- `src/app/widgets/Webcam/components/Circle.jsx` — React class
- `src/app/widgets/Webcam/components/Line.jsx` — React class
- `src/app/widgets/Webcam/components/MutedText.jsx`
- `src/app/widgets/Webcam/constants.js`
- `src/app/widgets/Webcam/index.jsx` — React class
- `src/app/widgets/Webcam/modals/SettingsModal.jsx`

## src/app/components 全家族處置

「直接替換」最終刪除本地家族；「按責任拆分」不是永久保留許可，terra 必須逐個證明 domain contract。每個家族所有檔案由下列命令列出：

```bash
rg --files src/app/components
```

| 家族 | 決策 | 目標／保留條件 | consumers（家族外，含相對 imports） |
| --- | --- | --- | --- |
| Anchor | 直接替換 | Link / ButtonLink；動作改 Button | `src/app/__deprecated/TopNav.old/TopNav.jsx`<br>`src/app/components/Navs/NavItem.jsx`<br>`src/app/components/Notifications/Notification.jsx`<br>`src/app/components/Paginations/TablePagination.jsx`<br>`src/app/components/ToggleSwitch/ToggleSwitch.jsx`<br>`src/app/components/Widget/Button.jsx`<br>`src/app/components/Widget/Sortable.jsx`<br>`src/app/containers/app/modals/CorruptedWorkspaceSettingsModal.jsx`<br>`src/app/widgets/Visualizer/Dashboard.jsx`<br>`src/app/widgets/Visualizer/Notifications.js`<br>`src/app/widgets/Visualizer/index.jsx`<br>`src/app/widgets/Webcam/Webcam.jsx` |
| Badge | 直接替換 | Badge | `src/app/__deprecated/TopNav.old/TopNav.jsx` |
| BaseTable | 按責任拆分 | 只保留 TanStack Table 資料/排序/選取邏輯；UI 用 Tonic Table | `src/app/pages/Administration/Commands/Commands.jsx`<br>`src/app/pages/Administration/Events/Events.js`<br>`src/app/pages/Administration/Machines/Machines.jsx`<br>`src/app/pages/Administration/Macros/Macros.jsx`<br>`src/app/pages/Administration/Users/Users.jsx` |
| Blink | 按責任拆分 | 動畫語義以 Stylus + Tonic Box 保留；若只顏色閃爍直接 inline | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| Breadcrumbs | 按責任拆分 | Tonic Link/Flex/Text 組合；只有 route/domain 導覽才留組合 | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| Buttons | 直接替換 | Button / ButtonGroup / Flex（toolbar） | `src/app/__deprecated/TopNav.old/QuickAccessToolbar.jsx`<br>`src/app/__deprecated/TopNav.old/TopNav.jsx`<br>`src/app/components/Dropdown/Dropdown.jsx`<br>`src/app/components/Dropdown/DropdownToggle.jsx`<br>`src/app/components/RepeatableButton/RepeatableButton.jsx`<br>`src/app/components/Widget/DropdownButton.jsx`<br>`src/app/containers/app/modals/CorruptedWorkspaceSettingsModal.jsx`<br>`src/app/pages/Workspace/PrimaryWidgets.jsx`<br>`src/app/pages/Workspace/SecondaryWidgets.jsx`<br>`src/app/pages/Workspace/Workspace.jsx`<br>`src/app/pages/Workspace/modals/FeederPaused.jsx`<br>`src/app/pages/Workspace/modals/FeederWait.jsx`<br>`src/app/pages/Workspace/modals/ServerDisconnected.jsx`<br>`src/app/pages/Workspace/widget-manager/WidgetManager.jsx`<br>`src/app/widgets/Autolevel/ApplyView.jsx`<br>`src/app/widgets/Autolevel/LandingView.jsx`<br>`src/app/widgets/Autolevel/SetupProbeView.jsx`<br>`src/app/widgets/Autolevel/StartProbeModal.jsx`<br>`src/app/widgets/Autolevel/StopProbeModal.jsx`<br>`src/app/widgets/Autolevel/TestProbeModal.jsx`<br>`src/app/widgets/Axes/Keypad.jsx`<br>`src/app/widgets/Axes/MDI.jsx`<br>`src/app/widgets/Axes/Settings/General.jsx`<br>`src/app/widgets/Axes/Settings/MDI/CreateRecord.jsx`<br>`src/app/widgets/Axes/Settings/MDI/TableRecords.jsx`<br>`src/app/widgets/Axes/Settings/MDI/UpdateRecord.jsx`<br>`src/app/widgets/Axes/Settings/index.jsx`<br>`src/app/widgets/Custom/modals/SettingsModal.jsx`<br>`src/app/widgets/Grbl/FeedOverride.jsx`<br>`src/app/widgets/Grbl/RapidOverride.jsx`<br>`src/app/widgets/Grbl/SpindleOverride.jsx`<br>`src/app/widgets/Grbl/modals/ControllerModal.jsx`<br>`src/app/widgets/Laser/LaserIntensityOverride.jsx`<br>`src/app/widgets/Laser/LaserTest.jsx`<br>`src/app/widgets/Macro/modals/LoadMacro.jsx`<br>`src/app/widgets/Marlin/Controller.jsx`<br>`src/app/widgets/Marlin/Marlin.jsx`<br>`src/app/widgets/Probe/Probe.jsx`<br>`src/app/widgets/Probe/modals/ProbeModal.jsx`<br>`src/app/widgets/Smoothie/Controller.jsx`<br>`src/app/widgets/Spindle/Spindle.jsx`<br>`src/app/widgets/TinyG/Controller.jsx`<br>`src/app/widgets/TinyG/TinyG.jsx`<br>`src/app/widgets/Tool/Tool.jsx`<br>`src/app/widgets/Visualizer/PrimaryToolbar.jsx`<br>`src/app/widgets/Visualizer/SecondaryToolbar.jsx`<br>`src/app/widgets/Visualizer/WorkflowControl.jsx`<br>`src/app/widgets/Visualizer/index.jsx`<br>`src/app/widgets/Webcam/modals/SettingsModal.jsx` |
| Card | 按責任拆分 | Tonic 無同名公開 Card；有全域 CNC spacing/context 才保留 composition，Box/Flex 作 UI | `src/app/components/CollapsibleCard/Body.jsx`<br>`src/app/components/CollapsibleCard/CollapsibleCard.jsx`<br>`src/app/components/CollapsibleCard/Header.jsx`<br>`src/app/context.jsx`<br>`src/app/widgets/Grbl/components/OverrideReadout.jsx`<br>`src/app/widgets/Grbl/components/Readout.jsx`<br>`src/app/widgets/Laser/components/OverrideReadout.jsx` |
| Center | 直接替換 | Flex | `src/app/widgets/Grbl/FeedOverride.jsx`<br>`src/app/widgets/Grbl/RapidOverride.jsx`<br>`src/app/widgets/Grbl/SpindleOverride.jsx`<br>`src/app/widgets/Laser/LaserIntensityOverride.jsx` |
| Checkbox | 直接替換 | Checkbox / CheckboxGroup | `src/app/widgets/Autolevel/StartProbeModal.jsx`<br>`src/app/widgets/Autolevel/TestProbeModal.jsx`<br>`src/app/widgets/Axes/Settings/General.jsx`<br>`src/app/widgets/Connection/Connection.jsx` |
| Clickable | 直接替換 | ButtonBase / Link | `src/app/components/CollapsibleCard/Header.jsx`<br>`src/app/widgets/Connection/Connection.jsx`<br>`src/app/widgets/Grbl/FeedOverride.jsx`<br>`src/app/widgets/Grbl/RapidOverride.jsx`<br>`src/app/widgets/Grbl/SpindleOverride.jsx`<br>`src/app/widgets/Laser/LaserIntensityOverride.jsx`<br>`src/app/widgets/Marlin/Marlin.jsx`<br>`src/app/widgets/Smoothie/Smoothie.jsx`<br>`src/app/widgets/TinyG/TinyG.jsx` |
| CodePreview | 按責任拆分 | 保留 G-code syntax highlighting，容器用 Tonic | `src/app/pages/Administration/Commands/Commands.jsx`<br>`src/app/pages/Administration/Events/Events.js`<br>`src/app/pages/Administration/Machines/Machines.jsx`<br>`src/app/pages/Administration/Macros/Macros.jsx`<br>`src/app/pages/Administration/WorkspaceSettings/WorkspaceSettings.jsx`<br>`src/app/pages/Administration/WorkspaceSettings/modals/ConfirmImportWorkspaceSettingsModal.jsx`<br>`src/app/widgets/Probe/modals/ProbeModal.jsx` |
| CollapsibleCard | 按責任拆分 | Tonic Accordion；額外 domain card 行為才留 | `src/app/widgets/Grbl/ModalGroups.jsx`<br>`src/app/widgets/Grbl/QueueReports.jsx`<br>`src/app/widgets/Grbl/StatusReports.jsx`<br>`src/app/widgets/Laser/LaserTest.jsx` |
| ColorModeProvider | 直接替換 | 現有 TonicProvider / useColorMode | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| Dropdown | 直接替換 | Menu primitives | `src/app/__deprecated/TopNav.old/TopNav.jsx`<br>`src/app/components/Widget/DropdownButton.jsx`<br>`src/app/components/Widget/index.js`<br>`src/app/widgets/Axes/DisplayPanel.jsx`<br>`src/app/widgets/Axes/Keypad.jsx`<br>`src/app/widgets/Tool/Tool.jsx`<br>`src/app/widgets/Visualizer/PrimaryToolbar.jsx`<br>`src/app/widgets/Visualizer/SecondaryToolbar.jsx`<br>`src/app/widgets/Visualizer/WorkflowControl.jsx` |
| Ellipsis | 直接替換 | Truncate | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| Form | 直接替換 | 原生 form + Tonic FormControl | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| FormControl | 直接替換 | FormControl / Input / Select / Textarea（按實際 props） | `src/app/components/InputGroup/InputGroup.jsx`<br>`src/app/widgets/Autolevel/SetupProbeView.jsx`<br>`src/app/widgets/Connection/Connection.jsx`<br>`src/app/widgets/Custom/modals/SettingsModal.jsx`<br>`src/app/widgets/Laser/LaserTest.jsx`<br>`src/app/widgets/Probe/Probe.jsx`<br>`src/app/widgets/Spindle/Spindle.jsx`<br>`src/app/widgets/Webcam/modals/SettingsModal.jsx` |
| FormGroup | 直接替換 | FormControl / Box | `src/app/containers/app/LoginPage.jsx`<br>`src/app/pages/Administration/Commands/drawers/CreateCommandDrawer.jsx`<br>`src/app/pages/Administration/Commands/drawers/UpdateCommandDrawer.jsx`<br>`src/app/pages/Administration/Events/drawers/CreateEventDrawer.jsx`<br>`src/app/pages/Administration/Events/drawers/UpdateEventDrawer.jsx`<br>`src/app/pages/Administration/Machines/drawers/CreateMachineDrawer.jsx`<br>`src/app/pages/Administration/Machines/drawers/UpdateMachineDrawer.jsx`<br>`src/app/pages/Administration/Macros/drawers/CreateMacroDrawer.jsx`<br>`src/app/pages/Administration/Macros/drawers/UpdateMacroDrawer.jsx`<br>`src/app/pages/Administration/Users/drawers/CreateUserDrawer.jsx`<br>`src/app/pages/Administration/Users/drawers/UpdateUserDrawer.jsx`<br>`src/app/widgets/Autolevel/SetupProbeView.jsx`<br>`src/app/widgets/Axes/Settings/General.jsx`<br>`src/app/widgets/Axes/Settings/MDI/CreateRecord.jsx`<br>`src/app/widgets/Axes/Settings/MDI/UpdateRecord.jsx`<br>`src/app/widgets/Axes/Settings/ShuttleXpress.jsx`<br>`src/app/widgets/Connection/Connection.jsx`<br>`src/app/widgets/Custom/modals/SettingsModal.jsx`<br>`src/app/widgets/GCode/GCodeStats.jsx`<br>`src/app/widgets/Grbl/index.jsx`<br>`src/app/widgets/Laser/LaserIntensityOverride.jsx`<br>`src/app/widgets/Laser/LaserTest.jsx`<br>`src/app/widgets/Macro/modals/EditMacro.jsx`<br>`src/app/widgets/Macro/modals/NewMacro.jsx`<br>`src/app/widgets/Probe/Probe.jsx`<br>`src/app/widgets/Probe/modals/ProbeModal.jsx`<br>`src/app/widgets/Spindle/Spindle.jsx`<br>`src/app/widgets/Webcam/modals/SettingsModal.jsx` |
| GridSystem | 直接替換 | Grid / Flex | `src/app/__deprecated/TopNav.old/TopNav.jsx`<br>`src/app/components/ModalTemplate/ModalTemplate.jsx`<br>`src/app/context.jsx`<br>`src/app/pages/Workspace/Workspace.jsx`<br>`src/app/pages/Workspace/widget-manager/WidgetList.jsx`<br>`src/app/pages/Workspace/widget-manager/WidgetListItem.jsx`<br>`src/app/widgets/Autolevel/SetupProbeView.jsx`<br>`src/app/widgets/Axes/Settings/General.jsx`<br>`src/app/widgets/Connection/Connection.jsx`<br>`src/app/widgets/GCode/GCodeStats.jsx`<br>`src/app/widgets/GCode/index.jsx`<br>`src/app/widgets/Grbl/ModalGroups.jsx`<br>`src/app/widgets/Grbl/QueueReports.jsx`<br>`src/app/widgets/Grbl/StatusReports.jsx`<br>`src/app/widgets/Grbl/index.jsx`<br>`src/app/widgets/Laser/LaserTest.jsx`<br>`src/app/widgets/Laser/index.jsx`<br>`src/app/widgets/Marlin/Marlin.jsx`<br>`src/app/widgets/Probe/index.jsx`<br>`src/app/widgets/Smoothie/Smoothie.jsx`<br>`src/app/widgets/Spindle/Spindle.jsx`<br>`src/app/widgets/Spindle/index.jsx`<br>`src/app/widgets/TinyG/TinyG.jsx`<br>`src/app/widgets/Visualizer/SecondaryToolbar.jsx`<br>`src/app/widgets/Webcam/Webcam.jsx` |
| HorizontalForm | 直接替換 | Grid / Flex / TextLabel | `src/app/widgets/GCode/GCodeStats.jsx`<br>`src/app/widgets/Grbl/ModalGroups.jsx`<br>`src/app/widgets/Grbl/QueueReports.jsx`<br>`src/app/widgets/Grbl/StatusReports.jsx`<br>`src/app/widgets/Laser/LaserTest.jsx` |
| Hoverable | 直接替換 | CSS hover / Tonic style props | `src/app/__deprecated/TopNav.old/TopNav.jsx`<br>`src/app/components/Clickable/Clickable.jsx`<br>`src/app/pages/Administration/components/TablePagination.jsx`<br>`src/app/widgets/Probe/Probe.jsx` |
| I18n | 按責任拆分 | 保留 i18n 插值語義，若只透傳文字則用既有 i18next | `src/app/widgets/Visualizer/PrimaryToolbar.jsx` |
| IconButton | 直接替換 | Button / ButtonBase + Icon | `src/app/containers/app/Header.jsx`<br>`src/app/containers/app/SideNav.jsx`<br>`src/app/pages/Administration/Commands/Commands.jsx`<br>`src/app/pages/Administration/Events/Events.js`<br>`src/app/pages/Administration/Machines/Machines.jsx`<br>`src/app/pages/Administration/Macros/Macros.jsx`<br>`src/app/pages/Administration/Users/Users.jsx` |
| Iframe | 按責任拆分 | 保留 iframe load/postMessage 生命周期，改 function | `src/app/widgets/Custom/Custom.jsx` |
| Image | 直接替換 | Image | `src/app/__deprecated/TopNav.old/TopNav.jsx`<br>`src/app/components/ImageIcon/ImageIcon.jsx`<br>`src/app/widgets/Axes/DisplayPanel.jsx`<br>`src/app/widgets/Tool/Tool.jsx`<br>`src/app/widgets/Visualizer/SecondaryToolbar.jsx`<br>`src/app/widgets/Webcam/Webcam.jsx` |
| ImageIcon | 直接替換 | Image / Icon | `src/app/widgets/Spindle/Spindle.jsx` |
| Infotip | 直接替換 | Popover 或 Tooltip（互動內容用 Popover） | `src/app/widgets/Autolevel/SetupProbeView.jsx`<br>`src/app/widgets/Axes/KeypadOverlay.jsx`<br>`src/app/widgets/Probe/Probe.jsx` |
| InlineError | 直接替換 | FormHelperText / Text + aria 關聯（核對 form-control exports） | `src/app/containers/app/LoginPage.jsx`<br>`src/app/widgets/Connection/Connection.jsx`<br>`src/app/widgets/Custom/modals/SettingsModal.jsx`<br>`src/app/widgets/Macro/modals/EditMacro.jsx`<br>`src/app/widgets/Macro/modals/NewMacro.jsx`<br>`src/app/widgets/Probe/Probe.jsx` |
| InlineToasts | 直接替換 | Alert / Toast | `src/app/pages/Administration/Commands/drawers/CreateCommandDrawer.jsx`<br>`src/app/pages/Administration/Commands/drawers/UpdateCommandDrawer.jsx`<br>`src/app/pages/Administration/Events/drawers/CreateEventDrawer.jsx`<br>`src/app/pages/Administration/Events/drawers/UpdateEventDrawer.jsx`<br>`src/app/pages/Administration/Machines/drawers/CreateMachineDrawer.jsx`<br>`src/app/pages/Administration/Machines/drawers/UpdateMachineDrawer.jsx`<br>`src/app/pages/Administration/Macros/drawers/CreateMacroDrawer.jsx`<br>`src/app/pages/Administration/Macros/drawers/UpdateMacroDrawer.jsx`<br>`src/app/pages/Administration/Users/drawers/CreateUserDrawer.jsx`<br>`src/app/pages/Administration/Users/drawers/UpdateUserDrawer.jsx` |
| Input | 直接替換 | Input | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| InputGroup | 直接替換 | InputGroup 與公開 adornment primitives（核對 input exports） | `src/app/widgets/Autolevel/SetupProbeView.jsx`<br>`src/app/widgets/Laser/LaserTest.jsx`<br>`src/app/widgets/Probe/Probe.jsx`<br>`src/app/widgets/Spindle/Spindle.jsx` |
| Loader | 直接替換 | Spinner / Skeleton | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| Modal | 直接替換 | Modal primitives | `src/app/containers/app/modals/CorruptedWorkspaceSettingsModal.jsx`<br>`src/app/pages/Workspace/PrimaryWidgets.jsx`<br>`src/app/pages/Workspace/SecondaryWidgets.jsx`<br>`src/app/pages/Workspace/modals/FeederPaused.jsx`<br>`src/app/pages/Workspace/modals/FeederWait.jsx`<br>`src/app/pages/Workspace/modals/ServerDisconnected.jsx`<br>`src/app/pages/Workspace/widget-manager/WidgetManager.jsx`<br>`src/app/widgets/Autolevel/StartProbeModal.jsx`<br>`src/app/widgets/Autolevel/StopProbeModal.jsx`<br>`src/app/widgets/Autolevel/TestProbeModal.jsx`<br>`src/app/widgets/Axes/Settings/MDI/CreateRecord.jsx`<br>`src/app/widgets/Axes/Settings/MDI/UpdateRecord.jsx`<br>`src/app/widgets/Axes/Settings/index.jsx`<br>`src/app/widgets/Custom/index.jsx`<br>`src/app/widgets/Custom/modals/SettingsModal.jsx`<br>`src/app/widgets/Grbl/index.jsx`<br>`src/app/widgets/Grbl/modals/ControllerModal.jsx`<br>`src/app/widgets/Macro/index.jsx`<br>`src/app/widgets/Macro/modals/LoadMacro.jsx`<br>`src/app/widgets/Macro/modals/RunMacro.jsx`<br>`src/app/widgets/Marlin/Controller.jsx`<br>`src/app/widgets/Probe/index.jsx`<br>`src/app/widgets/Probe/modals/ProbeModal.jsx`<br>`src/app/widgets/Smoothie/Controller.jsx`<br>`src/app/widgets/TinyG/Controller.jsx`<br>`src/app/widgets/Visualizer/WatchDirectory.jsx`<br>`src/app/widgets/Visualizer/index.jsx`<br>`src/app/widgets/Webcam/modals/SettingsModal.jsx` |
| ModalTemplate | 按責任拆分 | Tonic Alert/Icon/Text 組合；若只是視覺模板 inline，刪 styled-components 重複部分 | `src/app/containers/app/modals/CorruptedWorkspaceSettingsModal.jsx`<br>`src/app/pages/Workspace/modals/FeederPaused.jsx`<br>`src/app/pages/Workspace/modals/FeederWait.jsx`<br>`src/app/pages/Workspace/modals/ServerDisconnected.jsx`<br>`src/app/widgets/Autolevel/StopProbeModal.jsx`<br>`src/app/widgets/Connection/Connection.jsx`<br>`src/app/widgets/Visualizer/index.jsx` |
| Navs | 直接替換 | Tabs 或 Link navigation（按用途） | `src/app/widgets/Axes/Settings/index.jsx`<br>`src/app/widgets/Grbl/modals/ControllerModal.jsx`<br>`src/app/widgets/Marlin/Controller.jsx`<br>`src/app/widgets/Smoothie/Controller.jsx`<br>`src/app/widgets/TinyG/Controller.jsx` |
| Notifications | 按責任拆分 | Tonic Toast/Alert UI；只保留通知時長／OS 通知 domain policy | `src/app/widgets/Autolevel/StartProbeModal.jsx`<br>`src/app/widgets/Autolevel/TestProbeModal.jsx`<br>`src/app/widgets/Axes/Settings/MDI/CreateRecord.jsx`<br>`src/app/widgets/Axes/Settings/MDI/UpdateRecord.jsx`<br>`src/app/widgets/Visualizer/Notifications.js` |
| OverflowTooltip | 直接替換 | Tooltip + Truncate；溢位測量若必須才保留極薄 domain glue | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| Paginations | 按責任拆分 | Tonic Pagination；保留必要 page-size/data adapter，AutosizeInput 改 function 或刪除 | `src/app/pages/Administration/components/TablePagination.jsx` |
| Panel | 直接替換 | Box / Accordion | `src/app/widgets/Marlin/Marlin.jsx`<br>`src/app/widgets/Smoothie/Smoothie.jsx`<br>`src/app/widgets/TinyG/TinyG.jsx`<br>`src/app/widgets/Visualizer/Dashboard.jsx` |
| Progress | 直接替換 | Progress | `src/app/widgets/Grbl/QueueReports.jsx` |
| ProgressBar | 直接替換 | Progress | `src/app/widgets/Autolevel/SetupProbeView.jsx`<br>`src/app/widgets/Marlin/Marlin.jsx`<br>`src/app/widgets/TinyG/TinyG.jsx`<br>`src/app/widgets/Visualizer/Dashboard.jsx` |
| Radio | 直接替換 | Radio / RadioGroup | `src/app/widgets/Webcam/modals/SettingsModal.jsx` |
| RefHolder | 按責任拆分 | 改 DOM refs/controlled props，無 consumer 刪 | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| RenderBlock | 按責任拆分 | inline render expression；有必要 scope 計算可保留純 helper | `src/app/widgets/Macro/Macro.jsx` |
| RepeatableButton | 按責任拆分 | 保留按住與 release 指令 domain 行為；底層 Tonic Button | `src/app/widgets/Axes/Keypad.jsx`<br>`src/app/widgets/Grbl/FeedOverride.jsx`<br>`src/app/widgets/Grbl/RapidOverride.jsx`<br>`src/app/widgets/Grbl/SpindleOverride.jsx`<br>`src/app/widgets/Laser/LaserIntensityOverride.jsx`<br>`src/app/widgets/Marlin/Overrides.jsx`<br>`src/app/widgets/Smoothie/Overrides.jsx`<br>`src/app/widgets/TinyG/Overrides.jsx`<br>`src/app/widgets/Visualizer/SecondaryToolbar.jsx` |
| RootCloseWrapper | 直接替換 | Tonic Menu/Popover 的 outside interaction | `src/app/components/Dropdown/DropdownMenu.jsx`<br>`src/app/components/Dropdown/DropdownMenuWrapper.jsx` |
| RowsHelper | 按責任拆分 | 改資料函式/children composition，移除 class/ref 操作 | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| SectionGroup | 按責任拆分 | Box/Stack；只保留 domain grouping semantics | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| SectionTitle | 按責任拆分 | Text；無額外 contract 刪 | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| Table | 按責任拆分 | Tonic Table；排序/paging callbacks 轉既有 data layer | `src/app/widgets/Axes/Settings/MDI/TableRecords.jsx` |
| TablePagination | 按責任拆分 | Tonic Pagination；保留必要 TanStack adapter | `src/app/pages/Administration/Commands/Commands.jsx`<br>`src/app/pages/Administration/Events/Events.js`<br>`src/app/pages/Administration/Machines/Machines.jsx`<br>`src/app/pages/Administration/Macros/Macros.jsx`<br>`src/app/pages/Administration/Users/Users.jsx` |
| ToastNotification | 按責任拆分 | Tonic Toast/Collapse；只保留通知生命週期 policy，不保留重複 UI | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| Toggle | 直接替換 | useState/useToggle，移除 render-prop wrapper | 掃描未找到外部 consumer；刪前複核 barrel/dynamic 引用 |
| ToggleSwitch | 直接替換 | Switch | `src/app/pages/Workspace/widget-manager/WidgetListItem.jsx` |
| Tooltip | 直接替換 | Tooltip | `src/app/__deprecated/TopNav.old/TopNav.jsx`<br>`src/app/widgets/Axes/DisplayPanel.jsx`<br>`src/app/widgets/Tool/Tool.jsx`<br>`src/app/widgets/Visualizer/SecondaryToolbar.jsx`<br>`src/app/widgets/Webcam/Webcam.jsx` |
| Validation | 按責任拆分 | 既有 react-final-form + Tonic fields，刪 class HOC | `src/app/widgets/Axes/Settings/MDI/CreateRecord.jsx`<br>`src/app/widgets/Axes/Settings/MDI/UpdateRecord.jsx` |
| Webcam | 按責任拆分 | 保留 media lifecycle，UI Tonic，React function | `src/app/widgets/Webcam/Webcam.jsx` |
| Widget | 按責任拆分 | 保留 CNC domain chrome composition；controlled props，無 instance API | `src/app/widgets/Autolevel/index.jsx`<br>`src/app/widgets/Axes/index.jsx`<br>`src/app/widgets/Connection/index.jsx`<br>`src/app/widgets/Console/index.jsx`<br>`src/app/widgets/Custom/index.jsx`<br>`src/app/widgets/GCode/index.jsx`<br>`src/app/widgets/Grbl/index.jsx`<br>`src/app/widgets/Laser/index.jsx`<br>`src/app/widgets/Macro/index.jsx`<br>`src/app/widgets/Marlin/index.jsx`<br>`src/app/widgets/Probe/index.jsx`<br>`src/app/widgets/Smoothie/index.jsx`<br>`src/app/widgets/Spindle/index.jsx`<br>`src/app/widgets/TinyG/index.jsx`<br>`src/app/widgets/Tool/index.jsx`<br>`src/app/widgets/Visualizer/index.jsx`<br>`src/app/widgets/Webcam/index.jsx` |
| shared | 按責任拆分 | 逐檔檢查，僅保留仍被 domain composition 使用的 utilities | `src/app/components/Card/Card.jsx`<br>`src/app/components/Card/CardBody.jsx`<br>`src/app/components/Card/CardDeck.jsx`<br>`src/app/components/Card/CardFooter.jsx`<br>`src/app/components/Card/CardHeader.jsx`<br>`src/app/components/Progress/Progress.jsx`<br>`src/app/components/Progress/ProgressBar.jsx` |
| withRouter | 按責任拆分 | 只為 class 注入 router 的 consumers 改 hooks 後刪除 | `src/app/__deprecated/TopNav.old/TopNav.jsx`<br>`src/app/pages/Workspace/Workspace.jsx` |

## 非 widget React classes（02 或 08 接手）

- `src/app/__deprecated/TopNav.old/QuickAccessToolbar.jsx`
- `src/app/__deprecated/TopNav.old/TopNav.jsx`
- `src/app/components/Anchor/Anchor.jsx`
- `src/app/components/Blink/Blink.jsx`
- `src/app/components/Breadcrumbs/Breadcrumbs.jsx`
- `src/app/components/Breadcrumbs/BreadcrumbsItem.jsx`
- `src/app/components/Checkbox/Checkbox.jsx`
- `src/app/components/Checkbox/CheckboxGroup.jsx`
- `src/app/components/Dropdown/Dropdown.jsx`
- `src/app/components/Dropdown/DropdownMenu.jsx`
- `src/app/components/Dropdown/DropdownMenuWrapper.jsx`
- `src/app/components/Dropdown/DropdownToggle.jsx`
- `src/app/components/Dropdown/MenuItem.jsx`
- `src/app/components/Form/Form.jsx`
- `src/app/components/GridSystem/Col.jsx`
- `src/app/components/GridSystem/Container.jsx`
- `src/app/components/GridSystem/Provider.jsx`
- `src/app/components/GridSystem/Resolver.jsx`
- `src/app/components/GridSystem/Row.jsx`
- `src/app/components/HorizontalForm/withContextConsumer.jsx`
- `src/app/components/Hoverable/Hoverable.jsx`
- `src/app/components/Iframe/Iframe.jsx`
- `src/app/components/Infotip/Infotip.jsx`
- `src/app/components/Input/Input.jsx`
- `src/app/components/Loader/Loader.jsx`
- `src/app/components/Modal/Modal.jsx`
- `src/app/components/Modal/ModalBody.jsx`
- `src/app/components/Modal/ModalContext.js`
- `src/app/components/Modal/ModalFooter.jsx`
- `src/app/components/Modal/ModalHeader.jsx`
- `src/app/components/Modal/ModalOverlay.jsx`
- `src/app/components/Modal/Portal.jsx`
- `src/app/components/Navs/Nav.jsx`
- `src/app/components/Navs/NavItem.jsx`
- `src/app/components/Navs/TabContent.jsx`
- `src/app/components/Notifications/Notification.jsx`
- `src/app/components/Paginations/AutosizeInput.jsx`
- `src/app/components/Paginations/TablePagination.jsx`
- `src/app/components/Radio/RadioGroup.jsx`
- `src/app/components/RefHolder/RefHolder.jsx`
- `src/app/components/RootCloseWrapper/RootCloseWrapper.jsx`
- `src/app/components/RowsHelper/RowsHelper.jsx`
- `src/app/components/Table/Table.jsx`
- `src/app/components/Table/TableBody.jsx`
- `src/app/components/Table/TableHeader.jsx`
- `src/app/components/Table/TableRow.jsx`
- `src/app/components/Table/TableTemplate.jsx`
- `src/app/components/Toggle/Toggle.jsx`
- `src/app/components/ToggleSwitch/ToggleSwitch.jsx`
- `src/app/components/Tooltip/Tooltip.jsx`
- `src/app/components/Validation/createForm.js`
- `src/app/components/Validation/createFormControl.js`
- `src/app/components/Webcam/Webcam.jsx`
- `src/app/components/Widget/Button.jsx`
- `src/app/components/Widget/DropdownButton.jsx`
- `src/app/components/Widget/Widget.jsx`
- `src/app/hocs/withMemo.js`
- `src/app/pages/Workspace/DefaultWidgets.jsx`
- `src/app/pages/Workspace/PrimaryWidgets.jsx`
- `src/app/pages/Workspace/SecondaryWidgets.jsx`
- `src/app/pages/Workspace/Widget.jsx`
- `src/app/pages/Workspace/Workspace.jsx`
- `src/app/pages/Workspace/widget-manager/WidgetListItem.jsx`
- `src/app/pages/Workspace/widget-manager/WidgetManager.jsx`

## 跨元件 instance 呼叫重点

| 原行為 | 最終介面 | Task |
| --- | --- | --- |
| Workspace → Primary/Secondary collapseAll → widgetMap → collapse/expand | WidgetUIProvider state/actions + controlled chrome props | U1a/U1b |
| Axes Settings 讀 node.mdi.state / node.general.value / shuttle value | parent draft + value/onChange + onSubmit | A1a |
| Visualizer index → this.visualizer.load/zoom/pan | owner hook → 非 React renderer engine | V2/V3 |
| Console → TerminalWrapper methods | 同 owner 的 useTerminal hook + DOM containerRef | G8 |
| findDOMNode、Checkbox.checked、Form refs | 真 DOM inputRef 或 controlled values | 各 task + W2 |

## 交接時重新查核命令

```bash
rg -n 'extends .*Component|findDOMNode|useImperativeHandle|this\.visualizer|widgetMap|\.node\.' src/app
rg -n 'createFetchMachine|fetchMacrosService|@trendmicro/react-|react-bootstrap-buttons' src package.json
rg -n 'api\.|axios\.|useFetch|useAsync' src/app/widgets src/app/pages/Workspace
```
