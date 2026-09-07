# Migration execution log

## Dispatch dimensions — 2026-09-07

依使用者確認，補充合約明確度、狀態/時序、影響範圍、驗證能力四個派工維度；以子任務選 effort，worker brief 記選擇理由，失敗先分類再決定升級。沿用現有 matrix/ledger，不新增狀態。只更新文件，尚未派工或執行 migration。

## Effort policy — 2026-09-07

依使用者要求，將 61 個執行 task 分配 Luna high/max 預設；Terra main 使用 high，必要時 Sol medium 唯讀 advisor。EXECUTION 記錄分類、升級條件、實際派工參數與 blocking 判定。此為計畫修改，未派代理、未執行 migration，全部 tasks 狀態不變。

## Role configuration — 2026-09-07

使用者指定 Terra main loop + Luna worker。已更新 EXECUTION/HANDOFF/STATUS/README：單 worker、Terra 獨立 review 與唯一 state writer、worker brief/中斷恢復、階段停止邊界。尚未啟動 implementation 或派工；下一 task 仍 F1。

2026-09-07：只更新計畫與交接機制；未執行 migration、安裝套件、啟動 server 或跑 app regression。所有實作狀態見 [STATUS](STATUS.md)。每次執行依 [EXECUTION](EXECUTION.md) 追加 checkpoint；不要覆寫先前測試證據。

## Planning review — 2026-09-07

- 新增 61 個可追蹤執行單位，全部 todo；依賴檢查無未知 ID、無循環。
- 檢查所有 plan Markdown relative links、code fences 與 bash 範例語法：通過。只做 bash -n，未執行範例命令。首次 link checker 誤把 fenced regex 當連結，排除 code fences 後通過，文件無壞連結。
- git diff --check：通過。source/package/lock 無本次修改。
- 修正 Tonic Slider 不存在、native Select 相容性限制；補 controller command oracle、browser setup/fixtures/instrumentation 與 persistent handoff。
- 下一步：依使用者後續明確執行授權，從 STATUS 的 F1 開始；目前仍 plan_only / paused。
