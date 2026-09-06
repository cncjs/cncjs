# 04a — Console / xterm Resource Hook Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans` 逐 task 執行。先讀上層 README 與設計。此文件是指定父 task 的細化版，介面以本文件為準；不授權平行 agents、不自動跳階段。

**Goal:** 細化 G8，移除 TerminalWrapper React instance refs 並避免 console lifecycle regression。

**Architecture:** Console function owner 直接使用 useTerminal；hook 封裝 xterm 資源和 prompt/history，DOM view 不提供 method API。

**Tech Stack:** JavaScript/JSX、React 18.3.1、Tonic 2.15.0、Query 4.44.0、Jest 29、Stylus。

**Spec:** [設計](../00-design.md)；[父計畫](../04-general-widgets.md)。

## Global Constraints

- 不新增 TypeScript/CSS modules/Sass；自訂樣式用 Stylus，Tonic props 照 API。
- 不升 React/Query/Three.js major；所有使用者文字含 aria-label 用 i18next。
- React components 最終全部 function；DOM／非 React engine refs 可以保留，禁止用 imperative component API 重建 class instance。
- HTTP server state 用 Query；controller 指令不放 render/reducer/queryFn，不自動 retry。
- 先建立測試，再實作；本文件的程式碼是待實作內容，不代表已寫入 src 或已通過 repo tests。
- 每個可交付 task 完成後記錄命令與結果，保留獨立 diff；未得到提交授權不自行提交。


## Task T1：固定真正被用到的介面

**Read:** `src/app/widgets/Console/Console.jsx`, `Terminal.jsx`, `History.js`。
**Create:** `src/app/widgets/Console/__tests__/Console.test.jsx`。

- [ ] 列現有 consumers：`writeln(data)`、`prompt`（字串）、`clear()`、`resize()`、`clearSelection()`、`refresh()`、`selectAll()`。其餘 TerminalWrapper methods 若全 repo 無 consumer，不搬成公開 API；hook 內部需要則保留內部函式。
- [ ] connection:close 的 `const {current:term}=terminalRef; term.current.clear()` 與其餘用法不一致；mock 真 wrapper shape `{clear:jest.fn()}` 重現，修正成 owner action clear，不能 fake `.current` 掩蓋。
- [ ] sender id 每個 Console owner 固定 UUID，同 widget echo 被過濾；兩個 fork 各有 id。

## Task T2：useTerminal 與 DOM view

**Create:** `src/app/widgets/Console/useTerminal.js`, `__tests__/useTerminal.test.jsx`。
**Modify:** `Terminal.jsx`, `Console.jsx`。

**Interface:** `useTerminal({ enabled, cols, rows, cursorBlink, scrollback, tabStopWidth, onData })` → `{ containerRef, isReady, prompt, actions }`。actions 只有 T1 被使用的功能。

- [ ] `enabled=isConnected`，callback containerRef 保存實際 DOM node；disconnected 時 Console 原本只顯示 No serial connection，因此 node 可為 null。effect 依 node/enabled create/dispose，不能只有依 [] 导致重連後沒有 terminal。
- [ ] 不把 rows/cols/options/onData 放進建立 effect；尺寸與 options 用更新 effect/setOption，onData 使用最新 callback ref，避免新 props 建第二個 terminal。
- [ ] 搬 onKey/onPaste/history/prompt 原行為；history 的箭頭與 input editing 不改演算法。`cols=254`, rows=fullscreen?'auto':15，scrollback=1000，tabStopWidth=2 保留。
- [ ] Terminal view 是 `function Terminal({containerRef})`，保持 CSS class 與 aria；父層不再 `ref={terminalRef}`。
- [ ] controller listeners與 terminal action 使用相同 owner；未 ready 時不觸發底層 method，保留原缺 term 時忽略輸出的語意，不新增無上限 buffer。
- [ ] Console 的 WidgetEventProvider 既有 terminal:clearSelection/refresh/selectAll 事件可保留（domain events），handler 呼叫 hook actions；不是任意 component method dispatch。
- [ ] 明確保存 onKey/onResize 的 disposables，cleanup onpaste 與 scrollbar，再依 xterm API 釋放 Terminal/owned addon；不能只設 ref=null。

## Task T3：事件與 lifecycle gates

- [ ] connected→disconnected→connected：原 console DOM/資源 dispose，新 terminal 初始化；history 的重連重設與原 Terminal remount 一致。
- [ ] fullscreen toggle 只 resize，反覆 collapse 不卸載；connection read/write 每筆顯示一次。
- [ ] rerender 更換 onData，再 Enter 使用新 callback；自己 sender echo 不寫一次以上。
- [ ] 模擬 paste 多行、history up/down、selection、refresh、resize callbacks；以 controlled fake xterm API 驗證，不 mock 整個 useTerminal。
- [ ] 20 次 mount/unmount、StrictMode 活躍資源為零/一份，見 R4；真 browser 有字型、實際寬高與選取驗證，見 R6。

Run: `yarn test:frontend --runInBand --runTestsByPath src/app/widgets/Console/__tests__/Console.test.jsx src/app/widgets/Console/__tests__/useTerminal.test.jsx`，再 `yarn eslint`、`yarn build`。
