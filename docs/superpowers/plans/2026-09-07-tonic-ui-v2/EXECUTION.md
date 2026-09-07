# 多週執行與恢復規則

## 狀態與唯一來源

[STATUS.md](STATUS.md) 是唯一任務 ledger。plan 的 checkboxes 只代表該 task 的步驟，不是另一份獨立狀態。handoff 連到 ledger 與證據，不複製整份計畫。

| Status | 意義 | 可轉移 |
| --- | --- | --- |
| todo | 尚未開始；依賴未完成也屬此狀態 | in_progress |
| in_progress | 已領取，含 coding、test、review、正常暫停 | completed / blocking / todo |
| blocking | 已遇到具體阻礙，無法完成此 task；須有 blocker record | in_progress（解阻後） |
| completed | 所有 task gates 通過、證據與交接已寫入 | in_progress（新 regression 或 contract 變更重新打開） |

使用者提到的「blocking」在此指 task **被阻塞**；造成其他 task 無法開始的關係由 Depends on 欄表示。無權限執行的 plan_only 暫停是專案模式，不把全部 tasks 標 blocking。

## Terra main loop / Luna worker

使用者已指定主控為 **Terra (`gpt-5.6-terra`)**、實作 subagent 為 **Luna (`gpt-5.6-luna`)**。此角色分工授權用於後續 implementation；目前 plan_only 不啟動 worker。沿用本目錄狀態，不另建立 loop-engineering 的 .loop-states。

| 角色 | 責任與寫入範圍 |
| --- | --- |
| Terra main | 讀依賴、細化合約、選 task、派工、獨立 review 與整合驗證；唯一可修改 STATUS、HANDOFF、execution-log 及計畫 checkboxes 的角色 |
| Luna worker | 在指定 files/contract 內實作、跑測試、回報 diff 與證據；不自行改架構、擴大範圍、標 completed、派更多 subagents 或 commit |
| Sol medium advisor（按需） | 對具體技術問題做獨立、唯讀判斷；回傳來源證據、選項與建議，不改 source/ledger、不派工；Terra 負責採納與整合 |

### Model / reasoning effort

主控使用 **Terra high**。Luna 依以下表格使用 **high 或 max**；Sol 固定 **medium**。這是本專案依風險制定的派工預設，不代表模型能力排名，也不能用更高 effort 取代 regression evidence。

| 工作類型 | Luna effort | 選擇理由 / 升級條件 |
| --- | --- | --- |
| 依既定步驟建立 config、盤點 imports、刪除已證明無 consumer 的檔案 | high | 輸入輸出明確；若出現 dependency/alias 行為不一致，先交 Terra 判斷 |
| 單純 Tonic primitive 替換、純顯示、已固定 draft shape 的表單 | high | 主要是局部映射；出現 focus、搜尋、rich options、跨欄驗證或提交時序差異時升 max |
| Query/session、mutation invalidation、config hydration、跨元件 state | max | 要維持競態、draft/cache 邊界、callback 順序與更新一致性 |
| controller commands、長按、keyboard、Probe、workflow | max | 需要精確 gates/payload/sequence；不可重送或在 cleanup 後繼續執行 |
| xterm/Webcam/iframe owner、RAF/WebGL、非同步 asset disposal | max | 多種外部資源與 late callback，需要證明 setup/cleanup 對稱 |
| 跨 widget/Workspace 整合、table selection/paging、AST/import gate | max | 跨檔契約及隱性 consumers 多，需防止漏掃或整合退步 |
| 固定命令重跑、收集 artifacts、依 manifest 移除依賴 | high | 出現不明失敗或效能退步時停止機械執行，由 Terra 決定診斷範圍 |

### 現有任務的預設指派（覆蓋 STATUS 全部執行單位）

| Effort | Task IDs |
| --- | --- |
| Luna high | F1, H1, H2, BR0, B0, U2, Q2-cleanup, G2, S3, A3a, P0, P3, P6, W3 |
| Luna max | H3, R0, D1, D2, D3, D4, R1, R2, U3, B1, M1, M2, M3, G1, G3, G4, G5, G6, G7, T1, T2, T3, C1, C2, C3, C4, S1, S2, S4, A1b, A2, A3b, R3, V1, E1, E2, E3, E4, R4, R5, W1, P1, P2, P4, P5, B3, R6 |

high 任務是依 contract 已固定的前提分類：例如 S3 依 S1/S2，A3a 依既定 Probe 合約；G3 雖小仍涉及 CNC command，預設 max。R0/R3/R6 的 oracle 與量測判讀交 max；BR0 只負責依已定 procedure 建環境。Q2-cleanup 若發現額外 XState consumer，先交 Terra 判斷，不能直接刪除。

混合任務可拆 suffix：例如 V1 的純 toolbar 視覺替換可用 high，但 watch tree race/selection 維持 max；P5 的純 markup high，resource ownership max。Terra 在 brief/log 記實際 model、effort 與分類理由。新增任務按上表分類，不需另建第二份狀態表。

### 每次派工的四個判斷維度

task matrix 是預設，Terra 派工前還要看實際子任務。以下不新增狀態或評分系統，只在 worker brief 用一句話說明判斷。

| 維度 | 偏向 Luna high | 偏向 Luna max 或先交 Terra |
| --- | --- | --- |
| 合約明確度 | 輸入、輸出、行為與不可改項已固定 | 行為、API 等價性或 ownership 有歧義：Terra 先決定；不能用 max 代替設計決策 |
| 狀態與時序 | 局部同步更新，單一 state owner | 跨 owner、非同步競態、事件訂閱、cleanup 或 late callback：max |
| 影響範圍 | 單一 consumer，介面不變 | 共用元件、跨 widget、Provider 或多個 consumer 的契約：max；變更契約先交 Terra |
| 驗證能力 | 可靠測試、固定 baseline 與可重現步驟已存在 | 缺 oracle 或 baseline：先建立驗證，Terra 判定可信度；需要第二意見時 Sol medium。提高 effort 本身不能補足驗證證據 |

選擇順序：先解決合約歧義、確認驗證方法，再按狀態/時序與影響範圍決定 effort。任一實際實作涉及後兩項高風險，預設 max；四項皆明確且局部可用 high。對 task matrix 的調整記理由，不默默將整個高風險 task 降級。

**以子任務選 effort，不以 widget 名称整批固定。** Visualizer 的例子：

| 子工作 | 指派 |
| --- | --- |
| Toolbar 的局部 Tonic 視覺替換，actions 已固定 | Luna high |
| WatchDirectory 非同步載入、race、selection | Luna max |
| Engine/resource ownership 設計與契約變更 | Terra high |
| 依已確認契約搬移 engine、清理 RAF/assets/listeners | Luna max |
| 對效能量測方法與結論提供獨立第二意見 | Sol medium，唯讀 |

只有可獨立驗證、值得單獨 review 的工作才拆穩定 suffix；一般步驟保留在同一 task checkpoint，避免為切換 effort 製造大量 ledger rows。子工作通過不代表父 task completed，原整合/regression gates 仍須全部通過。

worker brief 最少包含以下選擇紀錄（寫入既有 execution-log，不另建表）：

```text
Task / substep:
Model / reasoning_effort:
Selection reason: contract 是否固定；state/timing 風險；影響範圍；baseline/test evidence。
Unresolved decision / decision owner: none 或具體問題及 Terra/Sol 分工。
```

失敗後先分類：合約不清交 Terra；環境或依賴問題按證據處理，必要時 blocking；實作推理不足且合約明確才考慮 high → max；test/oracle 不可信先修驗證。不能因一次失敗就一律升 max 或更換模型。

### 判斷、升級與 blocking

1. **Luna high → max**：合約明確，但實作涉及跨檔 state、非同步或 lifecycle，或局部修正暴露這些風險。Terra 先 review 已有 diff，再以明確 model/effort 建新 worker，保留修改與證據；不假設現有 agent 的 effort 可以原地切換。
2. **交 Terra high**：需決定 public contract、state/resource owner、controller gate/payload、既有 bug 與預期差異、拆任務或改依賴。先做本地判斷，固定決策後讓 Luna 繼續，不要求 Luna max 自行設計新架構。
3. **按需交 Sol medium**：問題可獨立界定，但 Terra 需要第二意見，例如 Tonic API 是否等價、Query callback/cancellation 語義、測試 oracle 是否掩蓋 bug、Two designs 的具體取捨、效能量測是否有效。Sol 接收最小相關 sources、失敗 evidence、候選方案與單一待決問題；唯讀回覆，由 Terra 作最終裁定。不是每個 task 都呼叫 Sol。
4. **標 blocking**：缺必要環境/輸入、驗收無法執行、需要超出授權的產品決策，或有具體證據顯示現有 contract 無法成立且 Terra/按需 Sol 尚無可行解法。記問題、嘗試、decision owner、解阻條件與不受影響的 task。僅僅「複雜」或「正在請 Sol 判斷」仍為 in_progress。

同一未解問題不無限輪流換模型。沿既有兩次失敗修正門檻由 Terra 診斷；Sol 建議也不能通過 gate 時，記錄剩餘假設與具體 blocker，不用忽略測試或更新 golden 消除失敗。

派工參數：Luna 使用 `model: "gpt-5.6-luna"`、`reasoning_effort: "high"` 或 `"max"`；Sol 使用 `model: "gpt-5.6-sol"`、`reasoning_effort: "medium"`，兩者使用 `fork_turns: "none"` 和完整 bounded brief。main session 選 `gpt-5.6-terra` / high。若 host 不支援指定 model/effort，明確記錄限制，不聲稱已套用。

Sol 判斷期間讓 Luna 在 checkpoint 暫停，避免同一問題邊修改邊 review；預設同時最多一個活躍 subagent（Luna worker 或 Sol advisor）。Terra 保持唯一 ledger writer。worker brief 與 log 增加 `model / reasoning_effort / selection reason / advisor decision`；handoff 記錄未決問題及下次所需 effort。

預設最多 **一個活躍 Luna worker**。Terra 可在 worker 執行期間讀 code、準備 review，但不編輯同一批 source。共用介面、Axes/Autolevel/Visualizer 先由 Terra 固定 contract、測試 oracle 與 ownership，再交 Luna 實作。需要更改 contract 時 worker 回報，由 Terra 決策並更新計畫後再派工。

主控模型需由使用者在新 session 選 Terra；文件無法切換當前 main model。派工使用工具的 model 參數明確選 Luna，並用 `fork_turns: "none"` 提供完整 brief，避免繼承 main model。若環境沒有可選 Luna 的 subagent 能力，回報工具限制，不默默換成其他模型。

### 每次迭代

1. Terra 依下面啟動程序選可執行 task，寫入 in_progress 與 session owner。
2. Terra 在 execution-log 留 worker brief：task ID、plan/contract 路徑、允許檔案、目前 dirty files、介面與不可改項、baseline、測試命令、驗收條件、停止條件。新 worker 必須能單靠此 brief 接手。
3. Terra 派 Luna，記錄 agent ID 與目前子步驟。task 過大可用穩定 suffix 分割，仍依 STATUS 的父子對應計算完成，不能跳過整合 gate。
4. Luna 回傳：changed files、實作摘要、命令/exit code、未跑項目、review 注意事項、blocker 或下一步；測試結果標明所測工作樹，不只說「passed」。
5. Terra 讀實際 diff，檢查 contract、command payload、effect cleanup 與測試品質。worker 的自評不等於 completed；必要的整合/browser/simulator gates 由 Terra 確認實際證據。
6. 有缺陷時 Terra 給同一 worker 具體修正與驗收條件。相同缺陷連續兩次修正仍未解時，停止盲目重試，由 Terra 診斷/縮小問題；真正無法推進才標 blocking，記解阻條件。
7. 通過後由 Terra 更新 completed、checkbox、log、HANDOFF。若本次授權為 loop，繼續同一授權範圍內下一個 eligible task；若指定單一 task，完成即停止。

使用者說「開始 main loop」但沒有指定範圍時，預設跑 **目前階段**（01–09 的單一父計畫及必要的細化/驗收），完成該階段即交接；不自動跑完整 migration。範圍、停止邊界先記在 HANDOFF，無需每個 task 重問。遇到需要使用者決策的 scope 變更、無可執行 task、使用者要求停止或 session 資源不足，保存 checkpoint 後停止。

### Worker 中斷與重啟

subagent ID 只供當前 session 查詢，不是長期恢復機制。worker 中斷時先檢查 process 是否仍在執行，再核對 dirty diff/最後命令；保留可用修改，不 reset。新的 Luna 從持久 brief、實際 diff 與下一步恢復，不從頭覆寫。Terra session 結束前讓 worker 停在安全點，將未完成內容寫入 HANDOFF；不能留下仍在寫檔的 worker 卻派另一個接手。

## 啟動程序（每次換模型／隔週接手都做）

1. 讀 HANDOFF、STATUS、00-design、repo AGENTS；執行 git status --short 與 git rev-parse HEAD。比對 handoff 的 branch、HEAD、dirty files。保留未知差異，先判斷是否影響目標 task。
2. 確認本次使用者授權是 plan_only 或 implementation。單純請求 review/handoff 不啟動 coding。
3. 若有 in_progress，先看 checkpoint 並恢復同一 task；若 owner 是仍在執行的 session，不重複領取。owner 欄包含 session 日期/識別，不以模型名稱作唯一 owner。
4. 若有 blocking，只有解阻條件已成立才重試。否則挑無依賴阻塞的 todo。每次派工一個最小 task；是否繼續下一個依本次 loop 授權範圍，不因 handoff 自動啟動 implementation。
5. 核對依賴的 evidence 與目前 code：completed 但沒有測試證據不能視為可信依賴。讀實際 exports/config；source drift 若使 contract 失效，先更新計畫並記錄決策。
6. 改 STATUS 為 in_progress，記 owner/time，寫 execution-log 的開始 checkpoint，再修改 source。

## 每個 task 的證據

在 [execution-log.md](execution-log.md) 追加以下紀錄；大型輸出放有持久路徑的 artifact，log 只列摘要。不可只有 /tmp screenshot 或 chat message。

```text
Task / session / timestamp:
Branch / start HEAD / reviewed dirty files:
Plan contract and baseline fixture:
Changed files / commit or uncommitted diff:
Command / exit code / tested revision or working-tree description:
Before / after / intentional differences:
Review findings and resolutions:
Artifacts (repo relative path or durable CI artifact URL):
Remaining untested paths:
Next exact step and expected result:
Status transition / blocker ID:
```

completed 要有所有必要 unit/integration、browser、simulator gates 的實際結果；build 成功不等於命令或 WebGL regression 通過。Terra 必須 review Luna 的 diff；高風險 Widget/Visualizer 額外核對 command oracle 與 resource ownership。未跑必要 browser gate 就留 in_progress；若環境確實阻止驗證，改 blocking。

正常 session 結束或 token 不足不是 blocker。保留 in_progress，記錄最後通過測試、失敗原因、未完成 diff 及下一條命令。不得為結束 session 而勾 completed。

## 停止與 handoff

1. 在安全邊界停止：記錄尚未完成的 edit/test；不丟棄使用者修改。
2. 同步 STATUS、execution-log、相關 plan checkboxes；最後更新 HANDOFF 的 current checkpoint。
3. 有提交授權才 commit；沒有則寫明 dirty files 與 diff。HANDOFF 不要求必須已有 commit 才能恢復。
4. 有背景 dev server/simulator 要記 session/PID、port、啟動命令與 owner；結束僅停自己的 process。不能 kill 共用程序。
5. 可另輸出 /tmp handoff 便於轉交，但內容以 repo 內 HANDOFF 連結為準。/tmp 遺失不影響恢復。

## 計畫演進與重新驗證

任務拆分使用原 ID 加穩定 suffix；在 ledger 加新 rows、dependencies，原 ID 變 aggregate mapping，不刪除歷史。不可重新編號導致舊 handoff 指向不同工作。

改介面要記 why、affected tasks、tests 與 evidence revision。已完成 task 若受影響，只重開受影響者並跑相關回歸；不要重跑整個月工作，也不能沿用已失效證據。新增阻塞修復用 FIX-001 等 ID，連到重現案例與被阻塞 task。

W3 才是整個遷移完成：所有 executable rows completed、無未解 blockers、R6 與完整 build/lint/tests 已過、最終 domain component/第三方例外 manifest 可追溯。
