# 09a — 可重跑的 browser / simulator procedure

## Task BR0：原版執行環境與 fixtures

**Prerequisite:** H3。本 task 在 R0 前建立環境及 baseline；R6 在遷移後重跑相同步驟。尚未執行，不代表環境已通過。

**Create at execution:** `src/app/test/fixtures/browser/`、本計畫 `artifacts/browser/README.md` 與 baseline 結果。fixture 只含合成 G-code/config，browser credentials/storage state 不提交。

1. `yarn build-dev`。建立獨立測試 `.cncrc`，用明確 `--config`，不改使用者的 `~/.cncrc`。包含 `ports: [{path:'/tmp/ttyCNCjsMigration',manufacturer:'Grbl Simulator'}]`；watch directory 指向合成 fixture 目錄。以既有 first-run/sign-in UI 建立測試 session；記錄實際 setup 步驟與 route，但不記密碼/token。
2. 在各自的 terminal session 啟動下列程序。記 session/PID、port 與日誌位置，不使用會改共用 ~/.cncrc 的快捷腳本。

```bash
node grbl-simulator/grbl-server.js 8888
node grbl-simulator/serial-bridge.js 8888 /tmp/ttyCNCjsMigration
NODE_ENV=development ./bin/cncjs --host 127.0.0.1 --port 8000 --config /tmp/cncjs-migration.cncrc --watch-directory /tmp/cncjs-migration-watch
WEBPACK_DEV_SERVER_HOST=127.0.0.1 PROXY_TARGET=http://127.0.0.1:8000 yarn start-app-dev --port 8080
```

bridge 需要 `socat`。缺少依賴、占用 port、auth/setup 或 WebGL 啟動失敗時記 named blocker；不可跳過並宣稱 browser 通過。路徑中的 config/watch fixtures 需在啟動前從受版本控制的合成內容建立。首輪將成功命令/版本記入 artifacts README，後續照同版本重跑。

3. 使用 agent-browser skill 當前 CLI：先 `agent-browser --help`，再開 `http://127.0.0.1:8080` 並取 snapshot。以 accessible role/name 或穩定 domain test id 操作；不要把 snapshot 臨時 ref 跨 session 保存。首輪把實際成功指令存 `artifacts/browser/commands.md`，後續使用同一流程。使用獨立 browser session/profile，viewport 1440×900 / 768×900，記 browser、DPR、GPU、theme。
4. 保存小型 linear/arc/probe fixtures，並建立固定 100,000 行 G-code（固定生成規則及 SHA256）、5,000-node watch tree（100 個目錄各 49 檔案）。before/after 使用完全相同檔案；大目錄同時測單層大量 siblings 的 5,000-file 情境。
5. Connection 選模擬 serial path，Grbl/115200；確認 welcome/status、Run/Pause/Resume/Stop、jog release、Macro 操作及斷線流程。Marlin/Smoothie/TinyG 沒有對應 simulator，不宣稱 Grbl simulator 覆蓋它們：由各 controller fixture/mocked transport 精確命令測試驗證，browser 使用可重播 controller fixtures。

## R6 重播與 instrumentation

- 依 R1–R5 cases 跑真 16 chrome shells、Visualizer 無 chrome、fork/remove/reorder、settings save/cancel、modal keyboard/focus、light/dark/auto；每個 case 保存 assertion 結果，不只有 screenshot。
- 首輪在 dev/test build 中加入受 development guard 控制的觀測 hook：記錄 load start/end、render frame、renderer.info.memory、owned RAF/listener/canvas counters；engine dispose 後取消註冊。不得靠 React component instance 取得 engine，也不能把 debug API 打包成 production 功能。
- 觀測輸出只含 counters/timings/fixture IDs。pre-extraction instrumentation 從原資源 owner 注入，post-extraction 從 engine owner 注入，相同 schema，避免 before/after 量測不同區間。
- 五次 warm runs 記錄每次 load time；另每次 30 個固定 pan/zoom/selection 操作，合併 150 個 latency samples 算 p50/p95。五筆 load samples 的 p95 僅供粗略比較，不能冒充可靠 tail latency。
- 五次預熱後於第 5/10/20 次 load/unload 與 route mount/unmount 記資源 counters，遵守 R4/R6 plateau/cleanup 門檻。
- artifacts 保留 baseline/revision/fixture hash、results JSON、console errors、screenshots 與成功 commands。大檔可存 durable CI artifacts，但必須在 repo log 記 URL/期限；只有 /tmp 路徑不足以完成 gate。

**Gate:** BR0 有成功 setup、固定 fixtures、原版可重跑結果；R6 有相同流程的遷移後結果與差異。退出只停自己啟動的程序。缺失任一必要驗證記 blocking 與解阻條件。
