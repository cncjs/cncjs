# 05 — Controller Widgets Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans`，一次執行一個 task，以 checkbox 記錄。使用者若另行授權平行 agent，可使用 `superpowers:subagent-driven-development`。先讀 README、設計與 inventory；不要自動開始下一份計畫。

**Goal:** 完成 Grbl、Marlin、Smoothie、TinyG 顯示與操作 UI。

**Architecture:** 維持各 controller 的協定／gate，不合併成一個萬用 controller widget。

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


**Prerequisite:** 01、02、G4 的 repeatable 行為驗證。

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

## Task C1：Grbl

**Modify:** `src/app/widgets/Grbl/` 全部 inventory source/Stylus。
**Create Test:** `src/app/widgets/Grbl/__tests__/Grbl.test.jsx`。
**Specific acceptance:** 狀態／alarm/unlock/reset、feed/spindle/rapid overrides、modal groups；實際送出的控制字元和序列完全相同，禁用狀態不能出指令。

- [ ] 把 Navs/Panel/ProgressBar/HorizontalForm 等改成 Tonic Tabs/Box/Progress 與表單 primitives；驗證切 tab 的 mount 行為，不讓初始化指令重送。
- [ ] 同一條 controller event 在 mount→unmount→mount 後只更新一次；mock transport snapshot 比對前後 command sequence。

## Task C2：Marlin

**Modify:** `src/app/widgets/Marlin/` 全部 inventory source/Stylus。
**Create Test:** `src/app/widgets/Marlin/__tests__/Marlin.test.jsx`。
**Specific acceptance:** 溫度/進度/狀態與 modal tabs；連線種類切換後移除舊 listeners；controller 的不同 state shape 不套 Grbl 假設。

- [ ] 把 Navs/Panel/ProgressBar/HorizontalForm 等改成 Tonic Tabs/Box/Progress 與表單 primitives；驗證切 tab 的 mount 行為，不讓初始化指令重送。
- [ ] 同一條 controller event 在 mount→unmount→mount 後只更新一次；mock transport snapshot 比對前後 command sequence。

## Task C3：Smoothie

**Modify:** `src/app/widgets/Smoothie/` 全部 inventory source/Stylus。
**Create Test:** `src/app/widgets/Smoothie/__tests__/Smoothie.test.jsx`。
**Specific acceptance:** 狀態、操作、tabs 與 panel；斷線狀態、reported units、controller 切換與重掛載。

- [ ] 把 Navs/Panel/ProgressBar/HorizontalForm 等改成 Tonic Tabs/Box/Progress 與表單 primitives；驗證切 tab 的 mount 行為，不讓初始化指令重送。
- [ ] 同一條 controller event 在 mount→unmount→mount 後只更新一次；mock transport snapshot 比對前後 command sequence。

## Task C4：TinyG

**Modify:** `src/app/widgets/TinyG/` 全部 inventory source/Stylus。
**Create Test:** `src/app/widgets/TinyG/__tests__/TinyG.test.jsx`。
**Specific acceptance:** status/footer、progress、tabs 與 repeatable controls；TinyG state 更新對顯示與 disabled 的影響，g2core 原支援不縮減。

- [ ] 把 Navs/Panel/ProgressBar/HorizontalForm 等改成 Tonic Tabs/Box/Progress 與表單 primitives；驗證切 tab 的 mount 行為，不讓初始化指令重送。
- [ ] 同一條 controller event 在 mount→unmount→mount 後只更新一次；mock transport snapshot 比對前後 command sequence。
