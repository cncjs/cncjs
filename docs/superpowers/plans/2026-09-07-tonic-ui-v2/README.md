# CNCjs next → Tonic UI v2 遷移執行入口

本套文件是可交給 terra / luna 逐 task 執行的計畫，尚未實作。範圍為 **`src/app` 全部 UI 與 React class components**，其中 widgets 位於 `src/app/widgets`，共 17 種。使用者提到的 `src/widgets`、`src/components` 在這個 checkout 對應到上述路徑。

**跨 session 入口：[HANDOFF.md](HANDOFF.md) → [STATUS.md](STATUS.md) → [EXECUTION.md](EXECUTION.md)。** 狀態使用 `todo / in_progress / completed / blocking`；STATUS 是唯一來源，父 task 與細化 task 的對應也在其中。目前為 plan_only / paused，所有實作 todo。下一次請直接使用 HANDOFF 中的恢復 prompt。

## 文件目錄與維護責任

```text
docs/superpowers/
├── handoffs/
│   └── cncjs-next-tonic-ui-v2-handoff.md  # 舊路徑入口，只連到本計畫
└── plans/2026-09-07-tonic-ui-v2/
    ├── README.md                       # 索引、範圍、目錄規則
    ├── 00-design.md                    # 架構決策與限制
    ├── inventory.md                    # 元件、consumer、source 基線
    ├── 01-*.md … 09-*.md               # 分期步驟與 regression gates
    ├── details/                        # 子任務合約、步驟與測試案例
    ├── STATUS.md                       # 唯一 task ledger
    ├── EXECUTION.md                    # 狀態轉移與交接規則
    ├── HANDOFF.md                      # 最新 checkpoint、恢復 prompt
    ├── execution-log.md                # 追加式執行歷史與驗證證據索引
    ├── geometry-baseline.json          # 已保存的幾何量測
    └── artifacts/                      # 執行時才建立：task/session 驗證產物
```

檔案依責任分工，不依 todo/in_progress/completed 移動目錄；任務 ID 與連結維持穩定。plan/details 只在步驟或合約改變時更新；每次 session 更新 STATUS、execution-log 與 HANDOFF，step checkbox 同步到對應 plan。

artifacts 建議路徑為 `artifacts/<task-id>/<session-id>/`；09a 的共用 browser 命令與 fixture 說明放 `artifacts/browser/`。實際測試程式及合成 fixtures 依各 task 放在 src/app/test 或 colocated __tests__，不把測試程式藏在文件目錄。大型產物可用 durable CI artifact，log 留連結與期限；不提交密碼、token 或 browser storage state。

HANDOFF 只保留最新恢復資訊，歷史寫 execution-log，不每次 session 新增另一份完整 handoff。舊 `handoffs/` 檔案僅作轉址；/tmp 便攜 handoff 可隨時重建。多週後不需重命名計畫日期；專案完成後保留原路徑與最終 STATUS。

## 已核對的基線

2026-09-07，CNCjs commit `f301cde7`；本機 Tonic UI checkout `/home/cheton/Code/trendmicro-frontend/tonic-ui-v2` commit `ee589a52b0`。規劃時工作樹原本乾淨。AGENTS.md 的 React 15.6 / Router 4 描述已落後：lockfile 實際是 React / ReactDOM 18.3.1、Router 6.3.0、Tonic React 2.15.0、Query 4.44.0。不要重做已完成的 React major migration。

`src/app` 沒有 `@trendmicro/*` import；目前真正的遺留是 `react-bootstrap-buttons`、本地 Buttons/Dropdown/Modal 等元件。`@trendmicro/babel-config` 是建置工具，不在要移除的 UI 套件範圍。QueryClientProvider、TonicProvider、ToastManager、PortalManager 已存在。createFetchMachine 目前只有 Macro widget 使用。

## 執行順序

| 順序 | 計畫 | 完成後交付 |
| --- | --- | --- |
| 0 | [設計](00-design.md) ＋ [盤點](inventory.md) | 所有執行者先讀；不直接改 code |
| 1 | [基線與前端測試](01-foundation.md) | 記錄 lockfile 相容性基線與可執行的 frontend test gate |
| 2 | [共用元件與 Widget 合約](02-shared-ui.md) | 直接使用 Tonic 的遷移規則、function Widget 外框、16 個 chrome + Visualizer 例外 |
| 3 | [Macro 與 Query](03-query-and-macro.md) | 刪除 createFetchMachine，Macro CRUD 與 Administration 共用 cache |
| 4 | [一般 widgets](04-general-widgets.md) | Connection、GCode、Spindle、Laser、Probe、Custom、Webcam、Console |
| 5 | [控制器 widgets](05-controller-widgets.md) | Grbl、Marlin、Smoothie、TinyG |
| 6 | [Axes／Tool／Autolevel](06-motion-widgets.md) | 高風險輸入、HTTP、探測流程保持一致 |
| 7 | [Visualizer](07-visualizer.md) | function 元件、Three.js 資源與觀察目錄生命周期 |
| 8 | [Workspace 與最終清理](08-workspace-and-cleanup.md) | 全 src/app class/UI 清零、依賴移除、全流程驗證 |
| 全程 | [Regression gates](09-regression-gates.md) | F2 後起建立 baseline；Widget/Visualizer 每個階段的必要驗收 |

**02 不需等所有舊 UI 刪光才通過。** 它提供新合約與 pilot，旧 component 只供尚未遷移的 consumers；04–08 逐批清空，08 才是零遺留 gate。03 不必等 Workspace 改寫；02 的 controlled chrome props 契約允許 domain class 與 function widgets 共存。

不建議一次全改：編譯成功不足以證明 CNC 指令、refs、鍵盤、renderer 行為仍正確。也不建議先建立整套 Bootstrap → Tonic 相容層：它會留下使用者希望汰換的抽象。推薦每個 task 完成一個可操作的垂直範圍，測試與 diff 一起交付。

## 給 terra / luna 的起始 prompt

下方只適用第一次 F1；之後一律使用 [HANDOFF](HANDOFF.md) 的恢復 prompt，先核对 STATUS 的 active task，避免每個新 session 都從 F1 開始。

```text
請執行 docs/superpowers/plans/2026-09-07-tonic-ui-v2/01-foundation.md 的第一個未完成 task。
先讀同目錄 README.md、00-design.md、inventory.md 及 repo AGENTS.md。
只執行該 task，不跳到後面；尊重目前工作樹，先檢查 dependency gates。
對照本機 Tonic UI v2 source 確認 exports 和 props，不憑其他 UI library 的 API 猜測。
先保存原行為與測試，再修改；完成後回報變更、實際執行的命令／結果、剩餘風險。
更新 task checkbox 與執行紀錄。沒有測過的 UI flow 不能宣稱通過。
```

角色固定為 Terra main loop、Luna implementation worker；共用介面、Query、Axes、Autolevel、Visualizer 由 Terra 先細化 contract 再派 Luna，所有 diff 由 Terra review。最多一個活躍 worker，Terra 唯一維護狀態；詳細規則見 EXECUTION。開始時選 Terra 為主模型並使用 HANDOFF prompt，不需導入 loop-engineering。

## 每個 task 的執行與交接

模型分工及所有 task 的 effort 預設見 [EXECUTION](EXECUTION.md)：Terra high 主控，Luna high 處理固定合約的局部工作、max 處理 state/query/commands/resources 整合；Sol medium 僅在需要第二意見時唯讀判斷。派工前記實際 effort，複雜問題先交 Terra，不直接當 blocker。

1. `git status --short`、`git rev-parse --short HEAD`；確認前置 task 的測試結果，而非只看 checkbox。
2. 讀 inventory 指定的全部 `.js/.jsx` 和 `.styl`；另跑 import/ref 查詢，納入後來新增檔案。
3. 先測原行為；既有 bug 另記錄，不把本輪造成的退步當作 baseline。
4. 每次最多一個 widget 或一個共用 component 家族；保留原 protocol payload、事件名稱、設定 key。
5. 跑 task 的 frontend tests、相關 lint、build；高風險指令跑 simulator／mock transport，瀏覽器不連接真實機器。
6. 寫入 `execution-log.md`（首次執行時建立）：task、commit/diff、命令、exit code、手動驗證、未解問題、下一 task。
7. 失敗就留在該 task 修正。需要回退時 revert 自己的 task commit；不 reset 使用者工作、不改 persistent settings schema。

計畫驗證僅涵蓋檔案與 API 盤點，**不代表目前 app 的 build / tests 已通過**。01 負責真正量測基線。

## 已補齊的細化文件

| 父 task | 細化文件 | 子 task |
| --- | --- | --- |
| F2 | [測試 harness](details/01a-test-harness.md) | H1–H3 |
| U1a/U1b | [Widget state](details/02a-widget-state.md) | D1–D4 |
| Q1/Q2 | [Macro Query](details/03a-query-contract.md) | M1–M3 |
| G8 | [Terminal owner](details/04a-terminal-owner.md) | T1–T3 |
| A1a | [受控 Settings](details/06a-controlled-settings.md) | S1–S4 |
| V2/V3 | [Visualizer engine](details/07a-visualizer-engine.md) | E1–E4 |
| Query 全域 | [HTTP 邊界](details/03b-query-boundaries.md) | B0/B1/B3；B2 為資源 task 彙總 |
| G1–G7/C1–C4 | [Widget/controller contracts](details/04b-widget-contracts.md) | 各 widget 的事件、state 與精確命令 oracle |
| W2 | [Component families](details/08a-component-families.md) | P0–P6 |
| R0/R6 | [Browser procedure](details/09a-browser-procedure.md) | BR0 與 R6 重播 |

同一 task 不重複跑父文件與細化文件兩套實作；父文件是階段索引，細化版是介面與執行依據。其他 widgets 依既有逐 widget task 執行，在動手前補上該 task 的明確行為測試；不需要再次盤點整個 repo。

## Terra 接手順序與停止邊界

1. F1 建立可啟動／可重現基線；F2 用 H1–H3 完成 frontend harness。
2. R0 保存原版行為，R1/R2 的 test cases 先寫好，再 D1–D4 改 Widget 架構。
3. U2/U3 pilot → M1–M3 / Q2 移除 fetch machine → 04/05 widgets；Console 用 T1–T3。
4. Axes Settings 用 S1–S4，接 A1b/A2/A3；Visualizer 先 R3 再 E1–E4 與 R4/R5/R6。
5. W1、P0–P6、B3、R6、W3 收尾，全部 regression gates 必須有實際結果。細部依賴與可領取 task 以 STATUS ledger 為準。

本輪只交付計畫與少量只讀 source 幾何量測，沒有修改 app、安裝套件、啟動 dev server 或執行完整測試。交接後 terra 可依使用者授權執行；長期狀態與恢復入口保存在 repo。OS temporary directory 的 handoff 僅作便攜連結，不是唯一進度來源。

## 本輪文件狀態

初版計畫提交為 `c87a4520`；本次 review 開始前已見後續文件提交 `e09a642c`，當時工作樹乾淨。本次狀態管理與 review 補充未由本 agent 提交。source 仍以 `f301cde7` 盤點；後續每次執行重新檢查 HEAD。使用者要求保留 plan 並停止實作，已遵守：沒有 app source 修改、安裝套件或啟動 dev server。完整 regression 尚未執行。
