# 08 — Workspace 與最終清理 Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans`，一次執行一個 task，以 checkbox 記錄。使用者若另行授權平行 agent，可使用 `superpowers:subagent-driven-development`。先讀 README、設計與 inventory；不要自動開始下一份計畫。

**Goal:** 完成全 src/app 的 function 遷移、移除重複 UI 與舊套件。

**Architecture:** Workspace 的 widget chrome 狀態已由 02 集中；本階段完成其餘 domain lifecycle 與全域殘留，最終零 React instance 控制。

**Tech Stack:** JavaScript/JSX、React 18.3.1、Tonic UI 2.15.0、TanStack React Query 4.44.0、Redux、Stylus、Jest 29、Webpack 5。

**Spec:** [設計與約束](00-design.md)。檔案範圍見 [inventory](inventory.md)。

## Global Constraints

- JavaScript only；不新增 TypeScript、CSS modules 或 Sass。自訂樣式使用既有 Stylus；Tonic 本身的 props/token/theme 照其 API 使用。
- 保留 Node >=18、React 18 與 Query v4；本輪不升 React 19 / Query v5，不升控制器協定與 Three.js。
- 使用 i18next 處理所有新增／修改的使用者文字，含 aria-label。
- 有 Tonic 對應的通用元件直接 import `@tonic-ui/react`；不能以永久 re-export 或自製同功能 wrapper 當作完成。
- 只轉 React class components；非 React 類別（WidgetConfig、History、ShuttleControl、Three.js 邏輯）不因語法掃描而重寫。
- 所有 HTTP server state 的新遷移使用 useQuery/useMutation；Socket.IO/controller 指令仍由既有傳輸層處理。
- 每個 task 先建立行為測試／基準，再修改、跑指定檢查；只 stage 該 task 的檔案。若沒有提交授權，留下可 review 的 diff 與建議 commit message。

---


**Prerequisite:** 03–07 全部 task，以及 U1a/U1b 宣告式 chrome；[09 regression gates](09-regression-gates.md) 全程適用。

## Task W1：Workspace 與 widget manager

**Modify:** `src/app/pages/Workspace/Workspace.jsx`, `Widget.jsx`, `PrimaryWidgets.jsx`, `SecondaryWidgets.jsx`, `DefaultWidgets.jsx`, `widget-manager/WidgetManager.jsx`, `widget-manager/WidgetListItem.jsx`, `widget-manager/index.jsx`；檢查其餘 Workspace helpers/styles。
**Create Test:** `src/app/pages/Workspace/__tests__/Workspace.test.jsx`。

- [ ] D4 已完成 Primary/Secondary/Default 的 function 接線；只複核其 regression，不重寫已完成內容。將 Workspace 剩餘 class domain state/lifecycle 改 function。沿 U1a `useWorkspaceWidgetUI()` 的 actions 控制 primary/secondary，而非 refs；Widget registry 保留名字與 unknown→null 行為。
- [ ] 保留 Sortable drag handle/filter/data-widget-id、availableControllers filter、排序持久化與 fork/remove callback；控制器不支援而隱藏的 widgets 不被批次收合操作意外改設定。
- [ ] fork 複製原 config 的 existing semantics，chrome entry 以新 widgetId 初始化；remove 移除 chrome entry 但只依原行為處理持久化 config，不能擅自多刪使用者資料。
- [ ] Workspace `api.loadGCode(meta)` 改共享 `useLoadGCodeMutation`；保持失敗 notification、drag/drop file metadata/context；與 Autolevel 共用 transport，不共用 in-flight mutation state。
- [ ] manager 的選取項目是 controlled state，不能用 child.state/list item refs 讀值。Grid/Modal/Buttons/Checkbox/Menu 直接用 Tonic。
- [ ] 測新增/移除/fork/排序、reload persistence、不同 container collapse all、單個 expand、fullscreen 收合策略、hidden controller widgets、兩個 forked widget 狀態獨立、route 離開/re-enter 清理。

## Task W2：剩餘元件與非 widget consumers

原本把 61 個家族塞進一個 task，無法安全執行。改依 [08a — component families](details/08a-component-families.md) 的 P0–P6 分批；每批各自有 files、consumer gate、tests 與刪除條件。W2 只有在 P0–P6 全部完成後才可勾選。

## Task W3：依賴／樣式／全域驗收

**Modify:** `package.json`, `yarn.lock`, `src/app/styles/vendor.styl`、失去 consumers 的各 component styles。僅在 packaging 顯示需要時更動 `src/package.json`；不能盲目把前端套件塞進 server runtime manifest。

- [ ] 確認全部 Buttons consumers 清空後 `yarn remove react-bootstrap-buttons`，刪其 CSS import 和 override.styl。若 Q2 尚未移除無 consumers 的 XState，在本 task 移除。
- [ ] 用 `yarn why <package>` 與全 src imports 判斷 `rc-trigger`、`uncontrollable`、`react-facebook-loading`、`react-animate-height`、`react-datepicker`、`react-select`、`react-infinite-tree` 等是否因本輪失去最後使用者；只刪這些確定被替代的 direct dependencies。第三方仍需的 transitive package 不強行 resolutions 到零。
- [ ] 保留 @trendmicro/babel-config / eslint-config-trendmicro；目標是 UI packages，不是 npm scope 名稱清洗。
- [ ] 以下命令作首輪負向掃描，另外以 AST／import resolution 檢查 alias inheritance、relative re-exports；rg 不能證明全部。

```bash
rg -n '@trendmicro/react-|react-bootstrap-buttons|createFetchMachine|fetchMacrosService' src package.json
rg -n 'extends .*Component|createReactClass|React.createClass|findDOMNode|getWrappedInstance|useImperativeHandle' src/app
rg -n 'widgetMap|this.primaryWidgets|this.secondaryWidgets|this.visualizer|node.mdi.state|node.general.value' src/app
rg -n "(app/components/|components/)(Buttons|Dropdown|Modal|GridSystem|Navs|Checkbox|Radio|Tooltip)(/|['\"])" src/app
rg -n 'styled-components|react-select|react-infinite-tree|rc-slider|react-repeatable|rc-trigger|react-foreach' src/app package.json
```

- [ ] 目標模式無輸出，但依 00-design 明確保留的 `react-datepicker` 與 `@fortawesome/*` 不在負向掃描。合法 DOM ref/第三方 resource refs 不算違規。useImperativeHandle 若仍有必要的非 widget DOM adapter，逐一說明；不能保留 collapse/expand/settings instance API。
- [ ] 建立防回歸檢查 `scripts/check-ui-migration.js`：用 AST/import graph 掃 React class inheritance、legacy UI imports、禁止的 component instance patterns，`yarn check:ui-migration` 納入現有 CI 合適 gate。測試 fixture 包含 aliased Component 與 relative barrel 以免只比字串。
- [ ] 執行完整驗證：

```bash
yarn install --immutable
yarn check:ui-migration
yarn test:frontend --runInBand
yarn lint
yarn test --runInBand
yarn build
```

- [ ] Browser：依 [09a — browser procedure](details/09a-browser-procedure.md) 跑所有 17 widgets、Workspace 排序/管理、Administration CRUD、登入/登出切換、light/dark/auto、窄/寬視窗、modal focus/keyboard、browser fullscreen、WebGL、console 長時輸出。
- [ ] 以 mock transport/simulator 驗證 CNC 指令未重送；frontend tests、backend tests、browser、simulator 分別列實際結果和未覆蓋項。
- [ ] inventory 每個 family/task 勾清，execution log 記錄最終保留 domain components 與 API 證據；不以 compile 成功代替完成。
