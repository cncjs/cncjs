# 07 — Visualizer 架構 Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans`，一次執行一個 task，以 checkbox 記錄。使用者若另行授權平行 agent，可使用 `superpowers:subagent-driven-development`。先讀 README、設計與 inventory；不要自動開始下一份計畫。

**Goal:** 移除 Visualizer React instance API，保存 3D、G-code、檔案與 workflow 行為。

**Architecture:** owner hook 管理非 React renderer engine；視圖只接 props/DOM ref，toolbar action 在相同 owner 呼叫 engine。

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


**Prerequisite:** 01–03、A3 的 probe event 契約。

## 每個 widget task 的固定步驟

以下是每個 task 必須執行的動作；task 表格補上各自的檔案、測試與行為，不跨 widget 一次改完。

- [ ] 讀 inventory 該 widget 全部 source（含已是 function 的內容、modals、settings、Stylus），找舊 component imports 與跨元件 refs。建立「state owner / events / cleanup / public instance calls」小表於執行紀錄。
- [ ] 在表列 test file 寫指定行為案例，先跑原版取得基線。將新介面／cleanup 的回歸案例先跑成失敗，確定測試不是空殼。
- [ ] Visualizer 保留無 chrome 的特殊結構；domain state 用 useState/useReducer，callback 不呼叫 React component instance。
- [ ] 所有 inventory 列出的舊 UI imports 逐個改 Tonic，包含原已是 function 的檔案；form 改 controlled values，ref 只對 DOM/第三方資源使用。
- [ ] lifecycle 拆成對應資源 effect：controller/pubsub/keyboard/timer/resize setup 與 cleanup 同處。依賴最新 props 的 handler 使用既有 useEventCallback 或明確 deps，不關掉 hooks lint。
- [ ] HTTP 按 03 的分工改 useQuery/useMutation；preserve response/payload，server query data 與未提交 form draft 分開。
- [ ] 執行 `yarn test:frontend --runInBand --runTestsByPath <表列測試路徑>`、`yarn eslint`、`yarn build`；表列 browser/simulator cases逐一記錄。
- [ ] `rg -n 'extends .*Component|findDOMNode|this\.' src/app/widgets/<Widget>` 檢查殘留；非 React domain class 可保留並註明。檢查 relative imports，不只 @app alias。
- [ ] 只有最後一個 consumer 移除時才刪 legacy component 家族；列出仍存在的 consumers 與後續 task。交付單一 widget 的 diff、測試和紀錄。

**Frontend測試位置**為新建目標，若該檔已有測試則擴充原測試。Browser case 不用 screenshot 代替 interaction assertion；server command 用 mock controller 或 simulator 比對精確序列。

## Task V1：工具列、檔案與列表

**Modify:** `PrimaryToolbar.jsx`, `SecondaryToolbar.jsx`, `Dashboard.jsx`, `WorkflowControl.jsx`, `WatchDirectory.jsx`（均在 `src/app/widgets/Visualizer/`）。
**Create:** `src/app/widgets/Visualizer/queries.js`, `src/app/widgets/Visualizer/__tests__/Toolbars.test.jsx`, `WatchDirectory.test.jsx`。

- [ ] Toolbar/WorkflowControl 改純 props/actions，Menu/Tooltip/Modal/Progress 直接 Tonic；run/pause/stop 不放任何 mount effect。
- [ ] machine profile fetch 改 Administration/Machines 既有 Query hooks；updateMachineProfiles event invalidate 同一 prefix。使用者選擇的 profile id 在 config，server list 在 query，不能互相覆盖。
- [ ] watch directory 依 path 分 key、lazy fetch；展開使用子 function node 的 useQuery，或 event handler 呼叫 queryClient.fetchQuery 同一 query options。pending/error/retry 與目錄切換 race 都測。
- [ ] Tonic Tree 是否可滿足 lazy loading、選擇、focus、原 infinite-tree 行為，terra 在本 task 先做有範圍的 API 對照。若可則替換；缺少大目錄 virtualization 時保留必要 data/virtualization adapter，UI 用 Tonic，不聲稱 Tonic Tree 自帶未核對能力。
- [ ] Dashboard/WatchDirectory 的 findDOMNode 改自己擁有的 DOM wrapper ref；virtual list scroll API 若是第三方 imperative resource，可以封在該元件內，不讓父層依賴 React instance。
- [ ] 測 huge list scroll、selection/load、空目錄/錯誤、cancel modal、檔案下載 metadata/token、control disabled 與 exact commands。

## Task V2/V3：engine extraction 與 owner integration

依 [07a — Visualizer engine](details/07a-visualizer-engine.md) 的 E1–E4 執行；本細化取代初稿的 callback load API。

- [ ] E1：原版 characterization，重現並修正 load 參數不一致。
- [ ] E2：非 React engine；`load({name,content})` 同步回 `{bbox}`，viewState 限定欄位。
- [ ] E3：renderer/canvas/geometry/material/texture、兩條 RAF、late assets、controls 完整 ownership/cleanup。
- [ ] E4：owner hook + 純 DOM view，config/PubSub 橋接與 controller bbox side effect 不放 engine。

Visualizer 不增加 minimized/fullscreen chrome；它原本沒有這組外框。Workspace 隱藏區域、camera visibility、viewport resize 仍依原有行為。

**Gate:** [R3/R4/R5/R6](09-regression-gates.md) 全部所屬項目過；真 parser/Three.js 數值測試與真 browser WebGL 都要有證據。先用 [geometry-baseline.json](geometry-baseline.json) 的原版結果固定幾何 oracle，禁止只 mock load 回 bbox 就宣稱 regression 已確保。
