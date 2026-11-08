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

- [x] 對每一家族先跑 import graph。確認無 runtime consumer 的 Blink、Breadcrumbs、ColorModeProvider、Ellipsis、Form、Input、Loader、OverflowTooltip、RefHolder、RowsHelper、SectionGroup、SectionTitle、Toggle、ToastNotification 直接刪除，不把 class 改成 function 後再保存。Graph plus literal alias/relative/barrel scan found zero resolved consumers for all 14 P0 paths; `Notifications/ToastNotification` is a separate P1 family and was not touched.
- [x] 如果掃到 consumer，依 inventory 的 replacement 改 Tonic `Box/Flex/Text/Input/Spinner/Tooltip` 或原生 expression；有 observable behavior 才補 colocated test。No P0 consumer was found, so no replacement was required.
- [x] 刪除失去入口的 index.js、Stylus、圖片與 context；確認 `src/app/styles` 沒有再 import其 Stylus。

**Gate:** P0 family names不再出現在 resolved imports；刪除不改任何使用者流程；frontend tests、eslint、build 過。

## Task P1：actions、menu、modal、tooltip、notification

**Files:** manifest P1 家族；remaining consumers 位於 `src/app/containers/app/**`、`src/app/pages/Workspace/**` 與 inventory 指定 widgets。
**Create/Modify Tests:** 各 consumer 既有 tests；若尚無，建立 `src/app/components/__tests__/overlays.test.jsx` 只測共用 modal/menu contract，並在 domain consumer 測 action。

- [x] Anchor/Buttons/Clickable/IconButton 改 Tonic `Button`、`ButtonBase`、`Link`；保留 `type="submit"`、disabled、keyboard activation、aria-label。Widget Button uses Tonic `LinkButton`/`ButtonLink` and `sx`; Axes Keypad uses direct Tonic `Button size="sm"` without Bootstrap adapter props. Toolbar spacing uses Tonic layout primitives. `22d06ba1`, `d248069a`.
- [x] Dropdown/RootCloseWrapper 改 Tonic Menu。每個 MenuItem 自己處理 onClick；測 disabled item、Esc、outside interaction、focus return 與一次 callback。Widget adapter regression covers disabled/Escape/outside/focus-return/single callback; DisplayPanel regression covers the exact work-zero CNC command; deprecated TopNav now uses Tonic Menu. `3f2866c1` deletes both complete families after a zero-import audit and 62-suite/379-test frontend run.
- [x] Modal/ModalTemplate consumers use Tonic modal primitives; the final legacy Modal family, including ModalRoot/useModal, had no remaining runtime consumers and was deleted. Existing dialog interaction tests and the full frontend suite pass.
- [x] Tooltip/Infotip consumers use Tonic Tooltip; the final TopNav tooltip was replaced and the zero-consumer legacy families and `rc-trigger` direct dependency were removed. Browser interaction evidence remains deferred to R6.
- [x] Notifications/InlineToasts consumers use shared Tonic toast behavior. The ten Administration drawers retain persistent i18next error notifications after unmount; their cross-consumer regression passes. Both legacy families were deleted.

**Gate (2026-09-23):** P1 family source imports and family files are zero. Menu/modal interaction regressions and the full frontend suite pass (62 suites / 379 tests); changed-file ESLint and diff checks pass. Direct `react-bootstrap-buttons` and `rc-trigger` dependencies are removed. Browser evidence remains deferred to R6.

**Ruling (2026-09-23):** The user identified the active `src/app/components/TablePagination/TablePagination.js` as the Tonic pagination example. The zero-consumer legacy `Paginations` family and deprecated Administration `TablePagination.jsx` were deleted in the P1 finishing slice. This is an early P4 cleanup; the active pagination component remains for P4 behavior work.

## Task P2：controlled forms

**Files:** manifest P2 家族；Login、Administration drawers、Axes/Autolevel/Connection/Custom/Laser/Macro/Probe/Spindle/Webcam consumers。

**Form contract (2026-09-23):** Use `react-final-form` to own form values, validation, and submit state. Render fields and feedback with the installed Tonic UI v2 `FormControl`, `FormLabel`, `FormInput`, `FormErrorMessage`, and related controls where applicable. Existing Tool and Webcam forms demonstrate this composition. The current locked `react-final-form` is 6.5.9 with `final-form` 4.20.10; P2 does not require an upgrade. The user scheduled any v7 upgrade after P2 form migration. If an upgrade is then needed, assess the official v6→v7 guide and verify form submission, validation, field state, and mocks as a separate slice.

- [x] Checkbox/Radio/ToggleSwitch 改 Tonic controlled `checked/value` + `onChange`。不能從 React child instance 讀 `.checked`；真 input ref只用於 focus。The nine legacy families were deleted; the last native `<label><input type="radio">` and native `<select>` (Webcam settings) became Tonic `Radio`/`Select`, and the Autolevel/Axes/Administration checkboxes already used Tonic controlled values.
- [x] FormControl/FormGroup/InputGroup/InlineError 改 Tonic form primitives。每欄保留 label/help/error 關聯、required、disabled、numeric zero、empty string 和 Enter submit。The audit added the missing accessible names for the Spindle speed input and the Connection socket Host/Port fields; every P2 form now has keyboard-only submit and invalid-submit suppression evidence.
- [x] HorizontalForm 的 responsive columns 改 Tonic Grid/Flex；刪 context HOC。The legacy module and its `withContextConsumer` HOC were deleted with the other unused families; its consumers use Tonic `Flex`/`Box`.
- [x] Validation 的 `createForm/createFormControl` class HOC 改既有 react-final-form props/hooks；不能同時保留兩份 draft state。MDI 的完整介面依 06a。The class HOC modules were deleted; Axes MDI uses `react-final-form`-free controlled `{ value, onChange }` drafts per 06a.
- [x] 依 00-design 的 API 相容性規則處理 react-select：先保存搜尋、自訂 options 與 keyboard 行為，再決定 native Select 或以 Tonic `MenuButton/MenuList/MenuItem` 組成的 domain selector；未等價的 caller 明列例外。若評估 Menu，先測 keyboard、focus return、選取值、disabled、ARIA/i18n 與 change/commit 時機。rc-slider 保留，Tonic 沒有公開 Slider，先測 min/max/step、keyboard 與 change/commit 時機。Connection's two non-searchable selectors became Tonic Menu with keyboard/selection/empty/disabled/focus-return regressions; the dependency was removed and no equivalent-incompatible caller remains. rc-slider is retained in five files, each now covered for range and keyboard commit.

**Gate (2026-09-24):** P2 family imports and files are zero; `react-select` has no remaining caller and is removed from dependencies; rc-slider is retained by design in five audited consumers; every P2 form completes by keyboard alone; invalid submit never reaches HTTP or a controller mutation. Fresh full frontend 64 suites / 421 tests, ESLint 0 errors, and `git diff --check` pass. Browser evidence remains deferred to R6.

## Task P3：layout 與 display

**Files:** manifest P3 家族、`src/app/context.jsx`、各 consumer Stylus。

- [x] GridSystem 改 Tonic Grid/Flex，逐一保存 Workspace、Widget、modal 的寬窄 breakpoint 行為；最後 consumer 清空後刪 `GridSystemProvider` 與 context/Resolver。
- [x] Navs 改 Tonic Tabs；selected index/value 是 controlled state。測切 tab 是否原本 preserve 或 unmount panel，避免 mount effect 重送 controller command。
- [x] Card/CollapsibleCard/Panel 以 Box/Accordion 組合。只有 CNC spacing、collapse policy 等具 test 的 domain contract可留下；Context/Resolver 若只為視覺 variants 就刪除。
- [x] Badge/Center/Hoverable/Image/ImageIcon/Progress/ProgressBar 改 Tonic primitive。SVG/圖片資產只有無 consumer 才刪。
- [x] `components/shared` utilities 只保留仍被 domain composition 使用的純函式，移到該 domain 旁；不能留一個孤立 shared UI compatibility layer。

**Implementation checkpoint (2026-10-01):** all 13 families, their contexts/resolvers/barrels/styles, and zero-consumer TopNav.old are deleted. TopNav.old removal is the planned P6 cleanup performed early to release the last deprecated GridSystem/Badge/Hoverable/Image consumers. Active Workspace/widget/modal layouts already use Tonic; their layout props/styles were preserved. Axes Tabs retain conditional inactive-child unmount and owner drafts; Spindle retains fan SVGs, 16px size and coolant-driven 2s rotation. No P3 domain helper remains; Axes `widgets/Axes/components/Panel` is a separate domain component. Full frontend 65 suites / 423 tests, lint, development webpack, and diff checks pass.

**Gate (passed during R6, 2026-10-01):** P3 family imports remain zero and GridSystemProvider is absent. `artifacts/browser/r6-20261001-luna/workspace-gates.json` and theme screenshots prove light/dark/device at1440×900/768×900, DPR1, bounded page/canvas, readable text and actual mouse/keyboard reachability. Initial narrow overflow, pale dark panels and intrinsic500px camera images were fixed before the final pass. Broader R6 performance/resource/workflow gates remain pending.

## Task P4：Administration/table vertical slice

**Files:** manifest P4；`src/app/pages/Administration/{Commands,Events,Machines,Macros,Users}/**`、`src/app/pages/Administration/components/TablePagination.jsx`、Axes MDI TableRecords。
**Create/Modify Tests:** 每個 Administration resource 的 list interaction test；`src/app/widgets/Axes/__tests__/MDI.test.jsx`。

- [x] 保留既有 TanStack Table/data sorting/selection/page calculations為純 hooks或 helpers；render 改 Tonic Table/Pagination。
- [x] 每個 resource 測 loading、empty、error、既有排序（本 checkout 無 sort controls/state/query，保留 server order）、row select、bulk select、page/page-size、create/update/delete 後 cache result。
- [x] TablePagination 的 page index base、total pages、disabled first/last 與 page-size reset 不變；不從 table child instance 讀狀態。
- [x] BaseTable overlay/loading 成為 consumer composition；Table/Pagination DOM、icons 和 Stylus重複層刪除。

**Contract review (2026-10-01):** None of the five baseline lists exposes sorting or supplies TanStack sorting state / a server sort parameter. The generic sort asc/desc case is therefore not an existing consumer contract; regressions preserve the server's Zulu-before-Alpha order. No page-local sorting feature was introduced. Consumers now own direct Tonic Table/Pagination markup; `table/columnSizing.js` and `table/pagination.js` are pure calculations, and `table/useResourceTable.js` owns TanStack model/sizing with no UI import or rendering.

**Gate passed (2026-10-01):** all P4 directories and alias/relative references are absent (`Paginations` was already removed in P1). Five real resource list tests cover loading/empty/error/retry, single/bulk selection, page 1/next/last bounds and page-size reset, CRUD-triggered visible cache refresh, four expandable lists, and separate Users/Commands caches. MDI tests preserve row order, movement bounds, create/update/remove arguments, command truncation and non-data states. Users requests now target the existing Users routes/cache; creation uses name/password and update retains existing password through the server's defaults. Machine update fields match its create form. Full frontend 68 suites / 455 tests; lint 0 errors / 5 existing warnings; development webpack compiles; diff check clean. Browser/server end-to-end evidence remains deferred to R6.

**Gate:** P4 family imports 為零；五個 Administration resources 和 MDI 的資料/selection/paging regression 過；保留的 table helper不 import React UI。

## Task P5：domain compositions 與 resource owners

**Files:** manifest P5；各自的實際 consumers。

- [x] CodePreview 保留 G-code 與現有 Administration JSON syntax highlighting/line presentation，容器改 Tonic；以固定 G-code fixture 測 escaping、line count、empty。
- [x] I18n 沒有 consumers，整個 family 已刪除；純文字 consumers 繼續直接用既有 i18next。RenderBlock 改 inline render或純函式。
- [x] Iframe/Webcam 改 function resource owner，DOM/media ref只留在 owner hook；測 load/error、URL change、event cleanup、unmount。
- [x] RepeatableButton 保留 CNC 長按 hook，底層 Tonic Button；移除 `react-repeatable`。以 fake timers 測 500ms delay、`floor(1000/15)` interval、pointer/key release、blur、disabled、unmount。
- [x] Widget 依 02a 保留 domain composition，所有檔案為 function，且沒有 collapse/expand/settings instance method；frame widget 使用 `view` contract。DropdownButton 使用 Tonic Menu。
- [x] class-only `withRouter` consumers改 Router hooks後刪 HOC；`withMemo` 改 `React.memo` 或刪除。不能以新 HOC 包裝 hooks來模擬 class API。

**Gate:** P5 中只有 CodePreview/I18n/Iframe/RepeatableButton/Webcam/Widget 可按上述非視覺 contract 保留；其內部 UI 直接用 Tonic且全為 function。RenderBlock、withRouter、withMemo 與 `react-repeatable` 為零。

## Task P6：非 widget classes 與全量對帳

**Files:** inventory「非 widget React classes」中尚未被 P0–P5/W1 修改的檔案、`src/app/__deprecated/TopNav.old/**`、新出現的 `src/app` files。

- [x] 確認 TopNav.old 無 runtime/import consumer後刪除；不要為保存 deprecated code 而轉 function。
- [x] 逐一對帳 inventory 的 54 個 component class files、7 個 Workspace/page class files、2 個 deprecated classes及 `src/app/hocs/withMemo.js`。任何 source drift 新增的 React class也納入。
- [x] AST gate 只辨識 React class；WidgetConfig、History、ShuttleControl、Three.js/domain classes留在 allowlist並寫理由。
- [x] 對 `src/app/components` 最終目錄建立保留 manifest。每個剩餘 family 都需指向本文件允許的 domain contract、consumer與 test；其他刪除。

```bash
rg -n 'extends .*Component|createReactClass|React.createClass|findDOMNode|getWrappedInstance' src/app
rg -n 'styled-components' src/app package.json
find src/app/components -mindepth 1 -maxdepth 1 -type d | sort
yarn test:frontend --runInBand
yarn lint
yarn test --runInBand --testPathIgnorePatterns='/node_modules/|SocketConnection' --detectOpenHandles --forceExit
yarn exec cross-env NODE_ENV=development webpack-cli --config webpack.config.development.js
```

**Gate:** `src/app` React class 為零，`styled-components` 為零，所有「直接替換」family 為零。合法非 React classes 和保留 domain compositions 都出現在具名 allowlist；不能靠 regex exception 隱藏 React class。

P6 先以 AST/import inspection 人工對帳；可執行的 check:ui-migration script 在後續 B3 建立並測試，W3 再執行。不要要求 P6 依賴尚未建立的 script。


P6 completed 2026-10-01: [full reconciliation and named allowlists](../p6-reconciliation.md), [AST snapshot](../artifacts/p6/class-inventory.json). The standing user instruction forbids local production builds, so the development compile above replaces `yarn build` here; production verification remains CI/final validation. Node assertions pass, but existing simulator planner intervals retain handles; the diagnostic run requires `--forceExit` and does not claim clean resource shutdown. SocketConnection remains excluded per prior user direction. Browser evidence remains R6; B3 creates the executable AST/import CLI later.
