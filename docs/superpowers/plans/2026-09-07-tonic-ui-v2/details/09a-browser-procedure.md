# 09a — 可重跑的 browser / simulator procedure

## Task BR0：原版執行環境與 fixtures

**Prerequisite:** H3。本 task 在 R0 前建立環境及 baseline；若 STATUS 明確記錄 BR0 waived，R0 可先繼續，但 R6 仍須在遷移後重跑相同步驟。部分 evidence 不代表環境已完整通過。

**Versioned fixtures:** `src/app/test/fixtures/browser/` 只保留小型、可讀的合成 G-code。大檔與 watch tree 是執行時資料，建立在唯一的 `/tmp` 路徑，不提交；browser credentials/storage state 同樣不提交。執行結果與生成規則記在本計畫的 `artifacts/browser/`。

1. `yarn build-dev`。browser/simulator tests 的唯一 config reference 是 [`docs/testing/configs/browser-test.cncrc`](../../../../testing/configs/browser-test.cncrc)。不要加入 `users` 欄位，使用 anonymous sign-in contract，預期直接進入 Workspace。每次執行先把 reference 複製到唯一 `/tmp` path，再在 `/tmp` 建立合成 large G-code 與 watch-tree fixtures；不可直接以 repo 內 reference 作 active config，因為 CNCjs 可能寫回 state。確認 `ports` 包含 `[{path:'/tmp/ttyGRBL',manufacturer:'Grbl Simulator'}]`。記錄實際 setup 步驟與 route，但不記密碼/token。
2. 從 repository root 以 temporary config 執行 `CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev`。`scripts/start-server-dev.sh` 讀取 `CONFIG_PATH` 並只傳給 backend `--config`；webpack development config 讀取 `SUPPRESS_WEBGL_WARNING`，Webpack 不讀取或暴露 config path。此命令會在同一個 lifecycle 啟動 Grbl simulator、frontend dev server 與 CNCjs backend；不要另外啟動 `start-with-cncjs.sh`，避免搶占 `/tmp/ttyGRBL`。記 session/PID、port 與日誌位置。

```bash
CONFIG_PATH=/tmp/cncjs-browser-test.cncrc SUPPRESS_WEBGL_WARNING=1 yarn dev
```

bridge 需要 `socat`。缺少依賴、占用 port、auth/setup 或 WebGL 啟動失敗時記 named blocker；不可跳過並宣稱 browser 通過。路徑中的 config/watch fixtures 需在啟動前從受版本控制的合成內容建立。首輪將成功命令/版本記入 artifacts README，後續照同版本重跑。

3. Linux／CI 預設以 headless Chrome 驗證，不要求有 macOS 可視瀏覽器。先記 `google-chrome --headless=new --no-sandbox --version`；用已安裝的 Playwright 或 agent-browser 開 `http://127.0.0.1:8080`、取 accessible snapshot 與 screenshot。Linux/headless 若出現 WebGL fallback/error modal，先 dismiss 後再操作 widget；macOS headed 有 Xwindow/GPU 時此 modal 可能不出現，不需額外 dismiss。agent-browser 可用時先跑 `agent-browser --help`；不可用時以 Playwright 呼叫同一個 Chrome executable，不能因此跳過 browser gate。macOS headed browser 僅作可選人工視覺複核。以 accessible role/name 或穩定 domain test id 操作；不要把 snapshot 臨時 ref 跨 session 保存。首輪把實際成功指令存 `artifacts/browser/commands.md`，後續使用同一流程。使用獨立 browser session/profile，viewport 1440×900 / 768×900，記 browser、headless/headed、DPR、GPU、theme。
4. 使用 repo 內的小型 linear/arc/probe fixtures；在 `/tmp` 依固定生成規則建立 100,000 行 G-code（記錄 SHA256）與 5,000-node watch tree（100 個目錄各 49 檔案）。before/after 使用完全相同的暫存內容；大目錄同時測單層大量 siblings 的 5,000-file 情境。不要把這些 runtime-generated payload 加入 commit。
5. Connection 選模擬 serial path，Grbl/115200；確認 welcome/status、Run/Pause/Resume/Stop、jog release、Macro 操作及斷線流程。Marlin/Smoothie/TinyG 沒有對應 simulator，不宣稱 Grbl simulator 覆蓋它們：由各 controller fixture/mocked transport 精確命令測試驗證，browser 使用可重播 controller fixtures。

## R6 重播與 instrumentation

- 依 R1–R5 cases 跑真 16 frame widgets、Visualizer 無 frame、fork/remove/reorder、settings save/cancel、modal keyboard/focus、light/dark/auto；每個 case 保存 assertion 結果，不只有 screenshot。
- 首輪在 dev/test build 中加入受 development guard 控制的觀測 hook：記錄 load start/end、render frame、renderer.info.memory、owned RAF/listener/canvas counters；engine dispose 後取消註冊。不得靠 React component instance 取得 engine，也不能把 debug API 打包成 production 功能。
- 觀測輸出只含 counters/timings/fixture IDs。pre-extraction instrumentation 從原資源 owner 注入，post-extraction 從 engine owner 注入，相同 schema，避免 before/after 量測不同區間。
- 五次 warm runs 記錄每次 load time；另每次 30 個固定 pan/zoom/selection 操作，合併 150 個 latency samples 算 p50/p95。五筆 load samples 的 p95 僅供粗略比較，不能冒充可靠 tail latency。
- 五次預熱後於第 5/10/20 次 load/unload 與 route mount/unmount 記資源 counters，遵守 R4/R6 plateau/cleanup 門檻。
- artifacts 保留 baseline/revision/fixture hash、生成規則、results JSON、console errors、screenshots 與成功 commands。大檔可存 durable CI artifacts，但必須在 repo log 記 URL/期限；只有 `/tmp` 路徑不足以完成 gate，但也不代表 payload 必須進 Git。

**Gate:** BR0 有成功 setup、固定 fixtures、原版可重跑結果；R6 有相同流程的遷移後結果與差異。退出只停自己啟動的程序。缺失任一必要驗證記 blocking 與解阻條件。
