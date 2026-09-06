# 08a — `src/app/components` 分批淘汰計畫

**Goal:** 將原 W2 拆成可獨立 review、可驗證的批次，清空可由 Tonic UI v2 取代的共用元件，並完成 widgets 之外的 React class 遷移。

**Prerequisite:** U1–U3 已建立 Widget/Tonic 基本合約；04–07 的 consumer 應隨所屬 widget 先改。P0 可提早執行，P1–P5 在相依 consumer task 完成後執行，P6 最後執行。

## 共通執行規則

每個 family 都依同一個順序：

1. 用 inventory 的 consumer 清單起步，再以 import graph 找 alias、relative、barrel 與動態 import。
2. 先改 consumer 直接 import Tonic；只有下表標成 domain composition 的邏輯可以留下。
3. 執行 consumer tests、frontend suite、eslint、build。
4. 確認 external consumers 為零後刪 family 目錄、專屬 Stylus/assets/barrel exports。
5. 再跑 import graph；不能留下永久 compatibility re-export，也不能用同名新 wrapper 藏住舊 API。

純視覺替換不寫只驗證 markup 的鏡像 unit test；使用最近的 consumer interaction test 與 build。Modal focus、form validation、table sorting、repeatable input、iframe/media lifecycle 等行為才新增測試。

執行記錄每個 family 必須填：`decision`、`last consumers`、`replacement export`、`domain logic retained`、`tests`、`deleted files/styles/assets`。若決定保留，必須同時寫出非視覺 contract 與對應 test；「方便」不算理由。

## Family manifest

| 批次 | Families |
| --- | --- |
| P0 | Blink, Breadcrumbs, ColorModeProvider, Ellipsis, Form, Input, Loader, OverflowTooltip, RefHolder, RowsHelper, SectionGroup, SectionTitle, Toggle, ToastNotification |
| P1 | Anchor, Buttons, Clickable, Dropdown, IconButton, Infotip, Modal, ModalTemplate, Notifications, InlineToasts, RootCloseWrapper, Tooltip |
| P2 | Checkbox, FormControl, FormGroup, HorizontalForm, InputGroup, InlineError, Radio, ToggleSwitch, Validation |
| P3 | Badge, Card, Center, CollapsibleCard, GridSystem, Hoverable, Image, ImageIcon, Navs, Panel, Progress, ProgressBar, shared |
| P4 | BaseTable, Paginations, Table, TablePagination |
| P5 | CodePreview, I18n, Iframe, RenderBlock, RepeatableButton, Webcam, Widget, withRouter |

`components/shared` 是 Card/Progress 的 implementation helper，跟 P3 一起處理。上表是 inventory 中所有 component families 的唯一分配；執行 P6 時以 `find src/app/components -mindepth 1 -maxdepth 1` 對帳新增家族。

## Task P0：無 consumer 與純 wrapper 清理

**Files:** manifest P0 的 `src/app/components/<Family>/**`；只修改 import graph 證實仍存在的 consumer。

- [ ] 對每一家族先跑 import graph。確認無 runtime consumer 的 Blink、Breadcrumbs、ColorModeProvider、Ellipsis、Form、Input、Loader、OverflowTooltip、RefHolder、RowsHelper、SectionGroup、SectionTitle、Toggle、ToastNotification 直接刪除，不把 class 改成 function 後再保存。
- [ ] 如果掃到 consumer，依 inventory 的 replacement 改 Tonic `Box/Flex/Text/Input/Spinner/Tooltip` 或原生 expression；有 observable behavior 才補 colocated test。
- [ ] 刪除失去入口的 index.js、Stylus、圖片與 context；確認 `src/app/styles` 沒有再 import其 Stylus。

**Gate:** P0 family names不再出現在 resolved imports；刪除不改任何使用者流程；frontend tests、eslint、build 過。

## Task P1：actions、menu、modal、tooltip、notification

**Files:** manifest P1 家族；remaining consumers 位於 `src/app/containers/app/**`、`src/app/pages/Workspace/**` 與 inventory 指定 widgets。
**Create/Modify Tests:** 各 consumer 既有 tests；若尚無，建立 `src/app/components/__tests__/overlays.test.jsx` 只測共用 modal/menu contract，並在 domain consumer 測 action。

- [ ] Anchor/Buttons/Clickable/IconButton 改 Tonic `Button`、`ButtonBase`、`Link`；保留 `type="submit"`、disabled、keyboard activation、aria-label。toolbar spacing 用 `Flex/Stack`，不留 Bootstrap size/bsStyle props。
- [ ] Dropdown/RootCloseWrapper 改 Tonic Menu。每個 MenuItem 自己處理 onClick；測 disabled item、Esc、outside interaction、focus return 與一次 callback。
- [ ] Modal/ModalTemplate 改 Tonic modal primitives。每個 dialog 明確設定 `autoFocus`、`ensureFocus`、`closeOnEsc`、`closeOnInteractOutside`；danger/cancel/submit 的 close 順序由 domain test 決定。最後 consumer 清空才移除 `ModalProvider/ModalRoot/useModal`。
- [ ] Tooltip/Infotip 改 Tonic Tooltip；含互動內容的 Infotip 改 Popover。確認 hover、focus、aria-describedby 與 portal layering，再移除 `rc-trigger`。
- [ ] Notifications/InlineToasts 以 Tonic Toast/Alert 呈現；只保留 notification timeout、OS notification 與 queue policy 為純 domain helper。錯誤訊息需 i18next 且不被 modal unmount 提前清掉。

**Gate:** P1 family imports 為零；menu/modal keyboard regression 過；`react-bootstrap-buttons`、`rc-trigger` 只有在 package-wide 最後 consumer 消失時移除。

## Task P2：controlled forms

**Files:** manifest P2 家族；Login、Administration drawers、Axes/Autolevel/Connection/Custom/Laser/Macro/Probe/Spindle/Webcam consumers。

- [ ] Checkbox/Radio/ToggleSwitch 改 Tonic controlled `checked/value` + `onChange`。不能從 React child instance 讀 `.checked`；真 input ref只用於 focus。
- [ ] FormControl/FormGroup/InputGroup/InlineError 改 Tonic form primitives。每欄保留 label/help/error 關聯、required、disabled、numeric zero、empty string 和 Enter submit。
- [ ] HorizontalForm 的 responsive columns 改 Tonic Grid/Flex；刪 context HOC。
- [ ] Validation 的 `createForm/createFormControl` class HOC 改既有 react-final-form props/hooks；不能同時保留兩份 draft state。MDI 的完整介面依 06a。
- [ ] `react-select` consumers 改 Tonic Select；`rc-slider` consumers改 Tonic Slider；先以 tests固定 option identity、clear、min/max/step、keyboard 與 onChange/onCommit 時機。

**Gate:** P2 family imports、`react-select`、`rc-slider` 為零；所有 form 可由 keyboard 完成；invalid submit 不送 HTTP/controller mutation。

## Task P3：layout 與 display

**Files:** manifest P3 家族、`src/app/context.jsx`、各 consumer Stylus。

- [ ] GridSystem 改 Tonic Grid/Flex，逐一保存 Workspace、Widget、modal 的寬窄 breakpoint 行為；最後 consumer 清空後刪 `GridSystemProvider` 與 context/Resolver。
- [ ] Navs 改 Tonic Tabs；selected index/value 是 controlled state。測切 tab 是否原本 preserve 或 unmount panel，避免 mount effect 重送 controller command。
- [ ] Card/CollapsibleCard/Panel 以 Box/Accordion 組合。只有 CNC spacing、collapse policy 等具 test 的 domain contract可留下；Context/Resolver 若只為視覺 variants 就刪除。
- [ ] Badge/Center/Hoverable/Image/ImageIcon/Progress/ProgressBar 改 Tonic primitive。SVG/圖片資產只有無 consumer 才刪。
- [ ] `components/shared` utilities 只保留仍被 domain composition 使用的純函式，移到該 domain 旁；不能留一個孤立 shared UI compatibility layer。

**Gate:** P3 family imports 為零，除非 execution log 有具名 domain composition + test；`context.jsx` 不再掛 GridSystemProvider；light/dark、1440×900、768×900 browser checks 過。

## Task P4：Administration/table vertical slice

**Files:** manifest P4；`src/app/pages/Administration/{Commands,Events,Machines,Macros,Users}/**`、`src/app/pages/Administration/components/TablePagination.jsx`、Axes MDI TableRecords。
**Create/Modify Tests:** 每個 Administration resource 的 list interaction test；`src/app/widgets/Axes/__tests__/MDI.test.jsx`。

- [ ] 保留既有 TanStack Table/data sorting/selection/page calculations為純 hooks或 helpers；render 改 Tonic Table/Pagination。
- [ ] 每個 resource 測 loading、empty、error、sort asc/desc、row select、bulk select、page/page-size、create/update/delete 後 cache result。
- [ ] TablePagination 的 page index base、total pages、disabled first/last 與 page-size reset 不變；不從 table child instance 讀狀態。
- [ ] BaseTable overlay/loading 成為 consumer composition；Table/Pagination DOM、icons 和 Stylus重複層刪除。

**Gate:** P4 family imports 為零；五個 Administration resources 和 MDI 的資料/selection/paging regression 過；保留的 table helper不 import React UI。

## Task P5：domain compositions 與 resource owners

**Files:** manifest P5；各自的實際 consumers。

- [ ] CodePreview 只保留 G-code syntax highlighting/line presentation，容器改 Tonic；以固定 G-code fixture 測 escaping、line count、empty。
- [ ] I18n 保留必要的 rich interpolation；純文字 consumers 直接用既有 i18next。RenderBlock 改 inline render或純函式。
- [ ] Iframe/Webcam 改 function resource owner，DOM/media ref只留在 owner hook；測 load/error、URL change、event cleanup、unmount。
- [ ] RepeatableButton 保留 CNC 長按 hook，底層 Tonic Button；移除 `react-repeatable`。以 fake timers 測 500ms delay、`floor(1000/15)` interval、pointer/key release、blur、disabled、unmount。
- [ ] Widget 依 02a 保留 domain chrome composition，所有檔案為 function，且沒有 collapse/expand/settings instance method。DropdownButton 使用 Tonic Menu。
- [ ] class-only `withRouter` consumers改 Router hooks後刪 HOC；`withMemo` 改 `React.memo` 或刪除。不能以新 HOC 包裝 hooks來模擬 class API。

**Gate:** P5 中只有 CodePreview/I18n/Iframe/RepeatableButton/Webcam/Widget 可按上述非視覺 contract 保留；其內部 UI 直接用 Tonic且全為 function。RenderBlock、withRouter、withMemo 與 `react-repeatable` 為零。

## Task P6：非 widget classes 與全量對帳

**Files:** inventory「非 widget React classes」中尚未被 P0–P5/W1 修改的檔案、`src/app/__deprecated/TopNav.old/**`、新出現的 `src/app` files。

- [ ] 確認 TopNav.old 無 runtime/import consumer後刪除；不要為保存 deprecated code 而轉 function。
- [ ] 逐一對帳 inventory 的 54 個 component class files、7 個 Workspace/page class files、2 個 deprecated classes及 `src/app/hocs/withMemo.js`。任何 source drift 新增的 React class也納入。
- [ ] AST gate 只辨識 React class；WidgetConfig、History、ShuttleControl、Three.js/domain classes留在 allowlist並寫理由。
- [ ] 對 `src/app/components` 最終目錄建立保留 manifest。每個剩餘 family 都需指向本文件允許的 domain contract、consumer與 test；其他刪除。

```bash
rg -n 'extends .*Component|createReactClass|React.createClass|findDOMNode|getWrappedInstance' src/app
rg -n 'styled-components' src/app package.json
find src/app/components -mindepth 1 -maxdepth 1 -type d | sort
yarn check:ui-migration
yarn test:frontend --runInBand
yarn lint
yarn test --runInBand
yarn build
```

**Gate:** `src/app` React class 為零，`styled-components` 為零，所有「直接替換」family 為零。合法非 React classes 和保留 domain compositions 都出現在具名 allowlist；不能靠 regex exception 隱藏 React class。
