# 04 — 一般 Widgets Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans`，一次執行一個 task，以 checkbox 記錄。使用者若另行授權平行 agent，可使用 `superpowers:subagent-driven-development`。先讀 README、設計與 inventory；不要自動開始下一份計畫。

**Goal:** 完成八個一般 widgets 的 function 與 Tonic 遷移。

**Architecture:** 先小型元件再外部資源整合，每個 widget 獨立驗收。

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


**Prerequisite:** 01、02；HTTP 使用 03 契約。

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

## Task G1：Connection

**Modify:** `src/app/widgets/Connection/` 的 inventory 全部來源與相關 Stylus。
**Create Test:** `src/app/widgets/Connection/__tests__/Connection.test.jsx`。
**Specific acceptance:** serial/network 選擇、port/baud 設定、連線/斷線 pending 與 error；讀取 controller 狀態不重複 connect；不能 fork/remove 的原限制保留。

## Task G2：GCode

**Modify:** `src/app/widgets/GCode/` 的 inventory 全部來源與相關 Stylus。
**Create Test:** `src/app/widgets/GCode/__tests__/GCode.test.jsx`。
**Specific acceptance:** 檔案 metadata、loading/empty、units/行數與原欄位；刷新/收合不丟失內容。U2 pilot 的 UI 檢查併入本 task。

## Task G3：Spindle

**Modify:** `src/app/widgets/Spindle/` 的 inventory 全部來源與相關 Stylus。
**Create Test:** `src/app/widgets/Spindle/__tests__/Spindle.test.jsx`。
**Specific acceptance:** 轉速輸入、M3/M4/M5 原行為與 disabled gates，數字含零與空輸入；避免 change 與 submit 雙送。

## Task G4：Laser

**Modify:** `src/app/widgets/Laser/` 的 inventory 全部來源與相關 Stylus。
**Create Test:** `src/app/widgets/Laser/__tests__/Laser.test.jsx`。
**Specific acceptance:** 功率、測試脈衝、長按與 release；舊 RepeatableButton 的 500ms delay / floor(1000/15) interval 保留；disabled/blur/unmount 停止重複。

## Task G5：Probe

**Modify:** `src/app/widgets/Probe/` 的 inventory 全部來源與相關 Stylus。
**Create Test:** `src/app/widgets/Probe/__tests__/Probe.test.jsx`。
**Specific acceptance:** Probe modal 開關、參數驗證、指令預覽與開始條件；cancel 不能發 probe，controller run/paused/disconnected gates 保留。

## Task G6：Custom

**Modify:** `src/app/widgets/Custom/` 的 inventory 全部來源與相關 Stylus。
**Create Test:** `src/app/widgets/Custom/__tests__/Custom.test.jsx`。
**Specific acceptance:** iframe URL 設定、save/cancel、load/error、fork 的 URL 隔離；不以 Tonic Box 取代 iframe 的 domain lifecycle。

## Task G7：Webcam

**Modify:** `src/app/widgets/Webcam/` 的 inventory 全部來源與相關 Stylus。
**Create Test:** `src/app/widgets/Webcam/__tests__/Webcam.test.jsx`。
**Specific acceptance:** URL 切換、旋轉/flip、靜音與 crosshair SVG；卸載解除影像/media 事件；Circle/Line 只是 function SVG，不能用 Tonic 圖示誤代座標幾何。

**Related Modify:** `src/app/components/Webcam/Webcam.jsx` 改 function，ref 只指向 DOM/media 資源。

## Task G8：Console

依 [04a — Terminal owner](details/04a-terminal-owner.md) 的 T1–T3 細化介面與 tests；它取代下文初步方法清單。

**Modify:** `src/app/widgets/Console/` 的 inventory 全部來源與相關 Stylus。
**Create Test:** `src/app/widgets/Console/__tests__/Console.test.jsx`。
**Specific acceptance:** xterm 一次初始化、write/writeln/focus/clear/resize 原能力、history、貼上與 Enter 只送一次；onData 更新、FitAddon/PerfectScrollbar/subscriptions dispose。

**架構設計:** 不把原 TerminalWrapper methods 經 useImperativeHandle 全部搬回來。新建 `src/app/widgets/Console/useTerminal.js`，Console 的 function owner 呼叫 hook，取得 `{ containerRef, isReady, prompt, actions }`（actions 只保留實際 consumers 用到的方法）。Terminal.jsx 成為純容器／視圖，透過 DOM ref 掛載。hook 擁有 xterm 與 History，controller 輸出直接呼叫同一 owner 的函數，不經子元件 instance。先從 Console.jsx 的實際 callsites 整理參數合約與測試再搬移。
