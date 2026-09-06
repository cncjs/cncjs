# 06 — Axes、Tool、Autolevel Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans`，一次執行一個 task，以 checkbox 記錄。使用者若另行授權平行 agent，可使用 `superpowers:subagent-driven-development`。先讀 README、設計與 inventory；不要自動開始下一份計畫。

**Goal:** 將高風險控制與設定流程改成 function components 和受控狀態。

**Architecture:** 設定由 owner 持有 draft；HTTP 用 Query；controller 操作保留事件路徑與協定。

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


**Prerequisite:** 01–03，G4 長按驗證。

## 每個 widget task 的固定步驟

以下是每個 task 必須執行的動作；task 表格補上各自的檔案、測試與行為，不跨 widget 一次改完。

- [ ] 讀 inventory 該 widget 全部 source（含已是 function 的內容、modals、settings、Stylus），找舊 component imports 與跨元件 refs。建立「state owner / events / cleanup / public instance calls」小表於執行紀錄。
- [ ] 在表列 test file 寫指定行為案例，先跑原版取得基線。將新介面／cleanup 的回歸案例先跑成失敗，確定測試不是空殼。
- [ ] 外框改讀 `chrome` props（U1a/U1b 的宣告式介面），移除 class 的 collapse/expand/fullscreen methods；domain state 用 useState/useReducer，callback 不呼叫 component instance。
- [ ] 所有 inventory 列出的舊 UI imports 逐個改 Tonic，包含原已是 function 的檔案；form 改 controlled values，ref 只對 DOM/第三方資源使用。
- [ ] lifecycle 拆成對應資源 effect：controller/pubsub/keyboard/timer/resize setup 與 cleanup 同處。依賴最新 props 的 handler 使用既有 useEventCallback 或明確 deps，不關掉 hooks lint。
- [ ] HTTP 按 03 的分工改 useQuery/useMutation；preserve response/payload，server query data 與未提交 form draft 分開。
- [ ] 執行 `yarn test:frontend --runInBand --runTestsByPath <表列測試路徑>`、`yarn eslint`、`yarn build`；表列 browser/simulator cases逐一記錄。
- [ ] `rg -n 'extends .*Component|findDOMNode|this\.' src/app/widgets/<Widget>` 檢查殘留；非 React domain class 可保留並註明。檢查 relative imports，不只 @app alias。
- [ ] 只有最後一個 consumer 移除時才刪 legacy component 家族；列出仍存在的 consumers 與後續 task。交付單一 widget 的 diff、測試和紀錄。

**Frontend測試位置**為新建目標，若該檔已有測試則擴充原測試。Browser case 不用 screenshot 代替 interaction assertion；server command 用 mock controller 或 simulator 比對精確序列。

## Task A1a：Axes settings 先消除 child instance 讀值

固定 draft、query、controlled tabs 與 Save 順序見 [06a](details/06a-controlled-settings.md)，以 S1–S4 為本 task 實際執行步驟。

**Modify:** `src/app/widgets/Axes/Settings/index.jsx`, `General.jsx`, `ShuttleXpress.jsx`, `MDI/MDI.jsx`, `MDI/TableRecords.jsx`, `MDI/CreateRecord.jsx`, `MDI/UpdateRecord.jsx`。
**Create:** `src/app/widgets/Axes/queries.js`, `src/app/widgets/Axes/__tests__/Settings.test.jsx`。

**Interface:** Settings owner 維持 `{ general, shuttleXpress, mdiRecords }` draft；子 tabs 收 `{ value, onChange }`，Save 讀 owner draft，不讀 `.node.general.value` 或 `.node.mdi.state`。Create/Update record 表單收 initial values，透過 onSave(record) 回傳；Cancel 不改 owner。

- [ ] 先測三個 tabs 修改→切換→Save、Cancel、原數字正規化與空 records；確保切換 tab 不遺失未提交草稿。
- [ ] MDI `useMdiQuery()` 回傳 body；`useSaveMdiMutation()` 接 `{ records }`。query 只在首次初始化/明確 reset 灌 draft；背景 refetch 不覆蓋 dirty fields。
- [ ] 用 react-final-form 或 owner state 驗證後保存，success 才關閉；mutation 失敗保留 dirty state 與錯誤。對原本本地 general/shuttle 寫入與 HTTP MDI 的順序明確採用「MDI 成功後寫本地設定」，避免部分成功被假裝全部成功。
- [ ] Checkbox/Input refs 改 controlled values；不建立 useImperativeHandle getValue/getState。

## Task A1b：Axes 操作與剩餘內容

**Modify:** `src/app/widgets/Axes/index.jsx`, `DisplayPanel.jsx`, `Keypad.jsx`, `MDI.jsx`, `components/PositionInput.jsx` 與 inventory 其餘 UI 檔案。
**Create Test:** `src/app/widgets/Axes/__tests__/Axes.test.jsx`。

- [ ] index 的 domain state 用 reducer 區分 reported position、user input、jog settings；socket reported position 不覆蓋 focused/dirty PositionInput 草稿。
- [ ] keyboard/combokeys/ShuttleControl 在 owner effect setup，cleanup 停止 repeat 與移除所有 callbacks。`ShuttleControl.js` 非 React class 保留。
- [ ] 測 X/Y/Z/附加軸、metric/imperial、distance/feed、MDI submit/history；焦點在 input 或 modal 時 hotkeys 不意外 jog；keydown/keyup、blur、disconnect、unmount 後都沒有多餘 command。
- [ ] 同步 MDI query cache 與 Settings 保存結果；不保留 index 手寫第二套 fetch/loading 狀態。

## Task A2：Tool 設定與執行

**Modify:** `src/app/widgets/Tool/index.jsx`, `Tool.jsx` 與 inventory 其餘來源。
**Create:** `src/app/widgets/Tool/queries.js`, `src/app/widgets/Tool/__tests__/Tool.test.jsx`。

- [ ] `useToolConfigQuery()` 讀 api.getToolConfig 的 `res.body`；`useSaveToolConfigMutation()` 接既有完整 data payload，success invalidate `['api/tool']`。server data 與本地 draft 分開。
- [ ] Tool 改 controlled `{ value, onChange }` 接收設定；移除 UNSAFE_componentWillReceiveProps，不在每個 query 更新重置表單。
- [ ] `ReactDOM.findDOMNode(this.fields.toolProbeCustomCommands)` 改 textarea/input DOM ref，保留 selection/cursor 插入行為；不要暴露整個 fields instance 給父層。
- [ ] 測保存成功/失敗、取消、tool change/probe 原 command sequence、延遲 timer 清理、disconnected/running gate、重複提交禁止。

## Task A3a：Autolevel 對話框與表單

**Modify:** `src/app/widgets/Autolevel/StartProbeModal.jsx`, `StopProbeModal.jsx`, `TestProbeModal.jsx`, `ApplyView.jsx` 及其 Tonic 重複 UI consumers。
**Create Test:** `src/app/widgets/Autolevel/__tests__/ProbeDialogs.test.jsx`。

- [ ] 改成 function、Tonic Modal/Progress/Checkbox/FormControl；表單使用 values/onChange。開始／停止／測試 actions 透過 callbacks，不經 refs。
- [ ] 測 cancel 不啟動、confirm 只啟動一次、invalid grid/feed/depth 不送命令、busy 不可重送、gcode unload/load events 訂閱一次。

## Task A3b：Autolevel 工作流程

**Modify:** `src/app/widgets/Autolevel/index.jsx` 與 inventory 其餘 domain/UI glue。
**Create:** `src/app/queries/gcode.js`, `src/app/widgets/Autolevel/__tests__/Autolevel.test.jsx`；需要時 `src/app/widgets/Autolevel/useAutolevel.js`。

- [ ] 整理原狀態與 transition 表（idle/probing/stopped/completed/error 等以來源實際值為準），將 event→state 純轉換與送 controller 指令拆開。不能為取代 fetch machine 而刪除探測 domain workflow。
- [ ] probe start/stop/measurement/error 各送入 reducer 或明確 handler；指令在 user/event handler 執行，禁止 reducer 送指令。
- [ ] `useLoadGCodeMutation()` 呼叫 `api.loadGCode(meta, context)`；套用補償只在明確操作時送一次，error 保留原 gcode 與資料。queryFn 不做補償／探測操作。
- [ ] 精確比對原 probing command sequence、網格座標／units、停止後不再排後續點、error/斷線清理、probe results 與 Visualizer PubSub events；演算法不順便改寫。
- [ ] 以現有 simulator 能支援的範圍執行；不支援的探測事件用 mock controller fixture，記錄模擬限制。A3b 與 V3 必須跑一次跨 widget 整合驗證。
