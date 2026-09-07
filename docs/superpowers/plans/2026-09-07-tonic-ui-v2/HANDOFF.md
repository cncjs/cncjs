# CNCjs Tonic UI v2 — 持久交接入口

## 現況

- Mode: **plan_only / paused**。使用者目前授權 review 與更新計畫；沒有授權本次開始 migration implementation。
- 執行角色已指定：Terra main loop + Luna implementation subagent，最多一個活躍 worker。Terra 唯一維護 task state 並 review；沿用 EXECUTION，不導入另一套 loop state。尚未派工。
- Effort：Terra high；Luna high/max 依 EXECUTION 的 task matrix；需要獨立技術判斷時可派唯讀 Sol medium。尚未派 worker/advisor，沒有新增 blocker。
- 每次派工再按合約明確度、狀態/時序、影響範圍、驗證能力判斷子任務 effort，brief 記一句選擇理由。合約歧義先交 Terra，缺 oracle 先建立驗證，不因失敗一律升 max。
- [STATUS](STATUS.md)：所有 implementation tasks 為 todo；active task none，下一個可執行為 F1。
- [EXECUTION](EXECUTION.md)：領取、blocking、驗收、停止與恢復程序。
- [README](README.md)、[設計](00-design.md)、[inventory](inventory.md)：範圍與 source/API 基線。
- 計畫更新前觀察 HEAD e09a642c，工作樹乾淨；本次只有 docs 變更，接手時重新檢查實際 HEAD/diff。

## 最新 review 結論

已補持久 ledger、父子 task 對應、避免 regression gate 循環依賴、browser procedure，以及 widget/controller contract 補充。修正不存在的 Tonic Slider；rc-slider 暫留。Tonic Select 是 native select，自訂 option/search 不可直接降級。react-datepicker 掃描未找到 src/app consumer，W3 再全 repo 複核。

未宣稱 build/test/browser 通過。目前只有先前只讀 geometry-baseline.json；F1/H1–H3/R0 必須取得可重跑實證。詳細案例仍要在各 task 的 source baseline 上寫成 tests；不能把計畫範例當成已執行測試。

## 恢復 prompt

```text
請從 docs/superpowers/plans/2026-09-07-tonic-ui-v2/HANDOFF.md 接手。
請以 Terra high 當 main loop，Luna high/max 當 implementation subagent；這次授權執行目前階段。
先讀 EXECUTION.md、STATUS.md、00-design.md 與 AGENTS.md，核對 git status/HEAD。
優先恢復 in_progress；若 blocking 先判斷解阻條件，否則選 Depends on 都 completed 的 todo。
目前若尚未開始，執行 F1。不要重做 completed task，也不要只靠 checkbox 判斷測試通過。
開始前記 in_progress；結束同步 STATUS、execution-log、plan checkboxes、HANDOFF。
依實際 evidence 標 completed 或 blocking；保留未完成 diff 與下一個精確步驟。
Terra 先固定每個 task 的 contract，依 EXECUTION task matrix 設 model=gpt-5.6-luna、reasoning_effort=high 或 max、fork_turns=none 派一個 worker，記錄選擇理由。
再按四個維度核對實際子任務，勿以整個 widget 固定 effort；調整 task 預設需記理由，父 task 的整合 gate 不變。
架構/ownership/command 語義交 Terra high 決策；需要第二意見時暫停 worker，派唯讀 gpt-5.6-sol / medium advisor。
複雜不等於 blocking；只有明確缺少解阻條件、輸入、環境或可行方案時記 blocker。
Terra review 實際 diff 與驗證證據後才 completed；worker 不改 ledger，不派更多代理。
一個 task 通過後繼續本階段下一個 eligible task，階段完成或遇停止條件就交接。
不自行 commit/push；若本次另有授權則依授權執行。
```

## Suggested skills

- superpowers:executing-plans：依單一 task 實作。
- superpowers:verification-before-completion：狀態改 completed 前核對證據。
- handoff：session 結束產生 /tmp 便攜交接，引用本檔；長期 state 仍留 repo。
- vercel:agent-browser：需要 browser regression 時才使用。
