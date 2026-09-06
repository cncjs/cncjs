# CNCjs next → Tonic UI v2 — handoff

## 使用者最新指示與目前邊界

使用者要求逐步改用 Tonic UI v2、刪除 src/app/components 的通用重複元件、淘汰 createFetchMachine、全部 React class components 改 function。特別要求重新設計 Widget/Visualizer，脫離 component instance 使用方式，並確保 regression。

最後指示：「用量只剩下 23% 了，可以先停下實作的部分，只保留 plan」。本輪已停止；沒有修改應用程式碼。接手 session 先確認使用者當次授權；若要求開始執行，從 F1 開始，不把本 handoff 的存在當成要立即跑整個 migration。

## Workspace 與文件入口

- Repo: `/home/cheton/Code/cncjs/cncjs-next`
- Plan entry: `/home/cheton/Code/cncjs/cncjs-next/docs/superpowers/plans/2026-09-07-tonic-ui-v2/README.md`
- Source inventory baseline: `f301cde7`。
- 目前 HEAD（最後檢查）：`c87a4520 docs: Tonic UI v2 migration plan`。這是工作區外部操作提交的初稿，不是本 agent 自行提交。
- 本輪細化為 tracked Markdown 修改與新增文件；先 `git status --short`，不要 reset/clean，也不要重跑 `/tmp/refine-cnc-plans.py` 或其他生成腳本，避免覆寫已校正文件。
- 本機 Tonic source: `/home/cheton/Code/trendmicro-frontend/tonic-ui-v2`，盤點 commit `ee589a52b0`。

## 先讀哪些文件

以 plan entry 所列順序執行。`00-design.md` 定義邊界，`inventory.md` 有全部 17 widgets 與 components consumers。`details/` 是 F2、U1、Query、Terminal、Settings、Visualizer 的細化 contract，優先於父文件的概要；不要同一 task 重做兩套。

`09-regression-gates.md` 是 Widget/Visualizer 的硬性驗收依據；先 baseline，再重構。具體方法、案例、命令與停止條件都在文件，不在 handoff 重複。

## 必須避免回退的決策

- 實際路徑是 src/app/widgets、src/app/components。
- 已有 React 18.3.1 / Tonic 2.15.0 / Query 4.44.0；不是從 React 15 重新升 major。不要無故升 React19/Query5/Three.js。
- Tonic 有替代的 UI 直接 import，不能永久保留 re-export/Bootstrap compatibility layer。
- 16 個 widgets 有 chrome，Visualizer 原本沒有；不要給它新增 minimized/fullscreen。
- minimized 唯一持久化來源為 config；Provider 僅持有 ephemeral fullscreen，避免雙向鏡像 store。
- 不用 useImperativeHandle 重造 widget instance。DOM refs / 非 React renderer/xterm engines 允許。
- 原版 Visualizer load call/signature、Console term.current.clear 及 config hydration 通知有來源可見問題，對應細化文件已列重現/修复；不要 mock 掉當成成功。
- 保留現有 controller/Socket.IO 路徑；query/refetch/render 不能發出機器命令。

## 已做與未做的驗證

已讀來源並檢查文件 links/fences；計畫內 JS/JSX 範例做 syntax 檢查。以獨立 Node process 呼叫現有 GCodeVisualizer/Three.js，核對矩形 fixture bounds，並量測三個 arc fixture 的 bounds/frame/vertex/sample。結果在 `geometry-baseline.json`。

沒有安裝測試套件、沒有建 frontend test harness、沒有跑 app build/lint/Jest、沒有啟動 dev server、沒有 browser/GPU regression、沒有真機器操作。因此不可宣稱整個 migration 或 regression 已通過。幾何量測是原版 source baseline，不是改版驗收。

## 建議下一個實際任務

若使用者授權開始：讀 README + AGENTS.md，F1 建立可重現 baseline，F2 依 `details/01a-test-harness.md` 加測試環境，接 R0；不要直接從 Visualizer extraction 開始。只交付第一個可驗證 task，記錄實際命令與結果，使用者可再指定後續批次。

若仍只授權 plan：不要修改 src/package/lockfile，只 review 指定 task 的規劃。

## Suggested skills

- `superpowers:executing-plans`：依已固定 contract 逐 task 執行。
- `superpowers:test-driven-development`：domain/UI regression 的先失敗再修復。
- `superpowers:verification-before-completion`：任何通過聲明前取得實際證據。
- `superpowers:systematic-debugging` 或 `diagnose`：既有 mismatch、回歸或 lifecycle failures。
- `vercel:agent-browser`：R6 真 browser 驗證；啟動 dev server 時依相關 verification skill。
- `handoff`：更新交接時引用現有文件，避免複製大份計畫。

未授權平行 agents；不自動 spawn、不自行 commit/push/deploy。
