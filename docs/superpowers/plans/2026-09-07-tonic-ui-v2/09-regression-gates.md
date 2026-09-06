# 09 — Widget / Visualizer Regression Gates Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans` 逐 task 執行。先讀上層 README 與設計。此文件是指定父 task 的細化版，介面以本文件為準；不授權平行 agents、不自動跳階段。

**Goal:** 將 Widget 與 Visualizer 的行為回歸變成每階段必須通過的可追溯門檻。

**Architecture:** 先建立舊版 characterization，再以相同輸入比較重構版；既有缺陷、允許差異與新 regression 分開記錄。真幾何／真 browser 與 transport mocks 各驗證其能證明的範圍。

**Tech Stack:** JavaScript/JSX、React 18.3.1、Tonic 2.15.0、Query 4.44.0、Jest 29、Stylus。

**Spec:** [設計](00-design.md)；[父計畫](07-visualizer.md)。

## Global Constraints

- 不新增 TypeScript/CSS modules/Sass；自訂樣式用 Stylus，Tonic props 照 API。
- 不升 React/Query/Three.js major；所有使用者文字含 aria-label 用 i18next。
- React components 最終全部 function；DOM／非 React engine refs 可以保留，禁止用 imperative component API 重建 class instance。
- HTTP server state 用 Query；controller 指令不放 render/reducer/queryFn，不自動 retry。
- 先建立測試，再實作；本文件的程式碼是待實作內容，不代表已寫入 src 或已通過 repo tests。
- 每個可交付 task 完成後記錄命令與結果，保留獨立 diff；未得到提交授權不自行提交。


本文件不是收尾才跑：**F2 後立即做 R0；D3/D4 前建立 R1/R2；E1 前建立 R3。** R4/R5 與重構同批完成；R6 是合併/交付 gate。所有「通過」必須附實際執行紀錄，本輪規劃尚未執行 app regression tests。

## Task R0：原版基準與已知差異清單

**Create:** 本文件夾 `regression-baseline.md`（執行時建立）；測試 fixtures 放各 widget `__tests__`，不要把使用者機器設定、token、私人 G-code 放 fixtures。

- [ ] 記錄 source commit、Node/Yarn/browser/GPU或 software WebGL、viewport/DPR/theme、測試指令及結果。before/after 同環境。
- [ ] 先在原版跑 F2 harness + characterization；大重構前保留 baseline commit/diff 或只讀 checkout 作對照，不 reset 使用者工作樹。
- [ ] 分三欄：observed passing behavior、confirmed pre-existing failures、approved-by-plan changes。每一項 defect 連到重現 test，不因「舊版也壞」便 skip 整個 suite。
- [ ] 有意差異僅限已明列的：fullscreen 忽略 collapse、Macro refresh 保留已快取資料、mutation 失敗不假成功關閉、Settings 等待 Save。需在整合測試斷言新行為。
- [ ] Visualizer load signature mismatch / Console term.current.clear 必須先重現；測試設計不能把錯誤呼叫也 mock 成成功。

## Task R1：16 個 Widget chrome 合約，全部逐一覆蓋

**Create:** `src/app/pages/Workspace/__tests__/widgetChromeContract.test.jsx`。

使用這個固定表列測試，不以只測 Connection 代表其他 15 個：

```js
export const CHROME_WIDGETS = [
  'autolevel', 'axes', 'connection', 'console', 'custom', 'gcode',
  'grbl', 'laser', 'macro', 'marlin', 'probe', 'smoothie',
  'spindle', 'tinyg', 'tool', 'webcam',
];
```

- [ ] 每個真 index shell 套真 WidgetHost/Provider，mock 各自 heavy body/transport；測 saved minimized、toolbar single/bulk expand-collapse、fullscreen enter/exit、aria-expanded/content visibility。
- [ ] 不只使用測試假的 Shell；parameterized import table 指向 16 個真 exports，才捕捉 Autolevel/Tool actions shape 與 Console/Webcam child props。
- [ ] 每個 shell 計數 body mount/unmount，collapse/expand/fullscreen 不能額外 mount/unmount；widget remove 必須 unmount 一次。
- [ ] 每個 shell rerender／chrome 操作時 controller.write/command、HTTP mutation 都應零次；必要的讀取 queries 另計，不把 reads 當機器命令。
- [ ] 兩個同型 fork 用不同 widgetId；只影響指定 id。ID 改變由 key remount，設定不串寫。
- [ ] Visualizer 另外測 registry supportsChrome=false，default container 顯示正常、bulk 操作不寫它的 minimized、不新增 collapse 按鈕。

**跨層整合另測:** 真 Widget 顯示、至少 Axes/Autolevel domain body 的 connected props 變化；shell test mock body 不能證明機器控制正確，R5 補足。

## Task R2：Workspace 的 list／事件／設定回歸

**Create:** `src/app/pages/Workspace/__tests__/WidgetGroups.test.jsx`、`WidgetLifecycle.test.jsx`。

| Scenario | Assertions |
| --- | --- |
| primary ↔ secondary reorder | ids/order 相同；不丟 fork config；sortable data-id/handle/filter 保留 |
| 連續 fork/remove | source callback 參數一致；原生 widget config 留存；fork config 刪除 |
| Grbl/Marlin/Smoothie/TinyG filter | render 與 bulk 使用同一 ids；hidden widget config 不變 |
| config domain event burst | chrome snapshot identity 不變，沒有 persistence feedback loop |
| chrome bulk 一次 | config 僅一次 change，動作冪等 |
| restore config after async hydration | mounted UI 讀到 saved state；corrupt data 不被無聲覆寫 |
| mount→unmount→mount | config/controller/PubSub listeners 回到 expected baseline，事件只處理一次 |

訂閱以 mock EventEmitter 計數或 spy listenerCount，PubSub token 收集並驗證 unsubscribe。StrictMode case 額外跑，**允許 setup→cleanup→setup**，斷言活躍 listener 最後只有一份，不以 constructor 累計次數錯判 React 開發行為。

## Task R3：真幾何與 pivot 基準

**Create:** `src/app/widgets/Visualizer/__tests__/geometry.test.js`, `pivot.test.js`, `fixtures.js`。

- [ ] 真 `three` + 真 `GCodeVisualizer`，不 mock parser/getBoundingBox。固定線段 fixture 的期待值手寫，不從 production helper 生成 expected。

```js
import GCodeVisualizer from '../GCodeVisualizer';
import { getBoundingBox } from '../helpers';

const fixture = [
  'G21', 'G90',
  'G0 X10 Y20 Z-2',
  'G1 X50 Y20 Z-2 F100',
  'G1 X50 Y60 Z0',
  'G1 X10 Y60 Z0',
  'G1 X10 Y20 Z-2',
].join('\n');

test('known path preserves machine-coordinate bounds', () => {
  const model = new GCodeVisualizer();
  const object = model.render(fixture);
  expect(getBoundingBox(object)).toEqual({
    min: { x: 10, y: 20, z: -2 },
    max: { x: 50, y: 60, z: 0 },
  });
});
```

此測試 fixture 先對原 parser 執行；若不同，檢查輸入／parser 真行為，不盲改 expected 讓它過。測試 cleanup 需釋放當次建立的 geometry/material。

本次已只讀驗證上述矩形 fixture：bounds 完全符合手寫期待，frames=7；另已量測 [三個 arc fixtures](geometry-baseline.json)，各 frames=3、vertices=32，保存了 bounds 與 sample points。這些是 source baseline，不是重構完成結果。

- [ ] Arc 使用 repo 現有 `examples/gcode/arc-xy-plane.gcode`, `arc-xz-plane.gcode`, `arc-yz-plane.gcode`，保存原版 deterministic bounds、vertex/frame count 與數個特徵點；重構不能改 sampling。大檔可用固定 seed 生成直線序列，不用隨機 Date.now。
- [ ] 空 gcode、同內容連續 load、不同內容 load、sent frame 0/中間/末尾、G20/G21 都列 fixture。
- [ ] pivot 比較數值容差 `1e-6`，不比較不穩定 UUID。renderer mock 捕捉 scene 後以 `scene.getObjectByName('Visualizer')` 與真 Box3 驗證 world bbox center。

| 步驟 | expected pivot | world mesh center |
| --- | --- | --- |
| profile A limits x=[0,200], y=[-100,100]，無 gcode | (100,0,0) | 無 mesh |
| 載入上述 gcode | (30,40,-1) | (0,0,0) |
| 帶 gcode 改 profile B x=[-100,0], y=[50,100] | (30,40,-1) | (0,0,0) |
| unload，保留 profile B | (-50,75,0) | 無 mesh |
| 移除 profile，無 gcode | (0,0,0) | 無 mesh |
| 帶 gcode 移除 profile | 仍為 gcode center | (0,0,0) |

若 pivot 未公開，從 limits/tool/mesh 位置及 controls target 的結果驗證；不要為測試新增對外 mutable scene API。原 engine 的 machine - pivot 座標策略不得因 extraction 漂移。

## Task R4：renderer／terminal 資源與非同步時序

**Create:** `Visualizer/__tests__/VisualizerResources.test.js`, `useVisualizer.test.jsx`, `Console/__tests__/useTerminal.test.jsx`。

- [ ] 假 RAF scheduler 保存 callback/id；advance 一 frame，不 runAllTimers 造成自我排程無限循環。分別檢查 agitation 和 controls-drag loops；連續 start 仍各至多一條。
- [ ] dispose 後兩條 RAF 都 cancel；晚到 callback 不 render、不 reschedule；32ms throttle cancel。
- [ ] deferred STL/texture：成功/成功、失敗/成功、成功/失敗、卸載後成功。已取得而不使用的資源每份 dispose 一次；不吞 rejected Promise。
- [ ] profile/visibility 在 asset pending 時改變，晚到 tool 採最新值；不得把初始舊 profile 寫回。
- [ ] 一般 rerender/show 切換不新建 renderer。route unmount/remount 可新建，但舊 canvas 被移除、舊 scene 無活躍 listeners。
- [ ] xterm onKey/onResize disposable、paste handler、PerfectScrollbar、FitAddon/Terminal ownership 清理完整。term dispose 與 addon.dispose 的責任核對 xterm 實作，避免重複 dispose。
- [ ] 使用 listener/spies 斷言 20 次 mount/unmount 後活躍資源為 0；StrictMode 不以總 setup 次數要求 1，而要求每次 setup 都匹配 cleanup。

## Task R5：輸入／流程／命令序列零意外變更

**Create:** `src/app/widgets/Visualizer/__tests__/WorkflowControl.test.jsx`, `src/app/widgets/Autolevel/__tests__/VisualizerIntegration.test.jsx`, `src/app/widgets/Console/__tests__/Console.test.jsx`。

- [ ] spy `controller.command`、`controller.write` 保存原始參數與順序；使用固定 connection/controller/workflow fixtures，不連真機器。
- [ ] WorkflowControl baseline：idle ready click Run→`sender_start` 一次；running Pause→`sender_pause`；paused Stop→`sender_stop`, `{force:true}`；idle Close→`sender_unload`。Resume 保留既有確認條件，再斷言 `sender_resume`。
- [ ] disconnected、not ready、各 controller alarm/locked 狀態阻擋；重構不得只保留 disabled 外觀卻讓 keyboard/onClick 可呼叫 action。
- [ ] chrome toggle、profile change、camera change、resize、refetch、rerender、StrictMode mount **零 command/write**。
- [ ] Axes jog 的長按/release、失焦、modal/input focus、disconnect、unmount 不重送；這由 A1b+RepeatableButton tests 覆蓋，R6 引用結果。
- [ ] Autolevel show/update/hide probe visualization→drag bounds 回傳→start/stop→compensation load，驗證原 PubSub payload/units/offset 與 controller command 次序。
- [ ] Console 的 sender id 排除自己 echo；外部 read/write 仍顯示一次；onConnectionClose 應 clear/release 資源、不 throw。先以真方法形狀重現 term.current.clear 問題。

## Task R6：真 browser、效能與最終門檻

**依賴:** F2、R1–R5 與各 implementation task 已過。
**工具:** `yarn dev`；執行者使用 `vercel:agent-browser` skill 的實際 CLI 進行互動、截圖和 console 檢查。若已有 browser runner，延用。不要為計畫引入第二套 E2E framework。

- [ ] 固定 viewport 1440×900 和 768×900、固定 DPR、light/dark，各跑 Workspace 與 Visualizer 情境。對照的是佈局/可操作區域，Tonic 有意的外觀差異需記錄，不能以像素必須全等阻擋 UI library 升級。
- [ ] 滑鼠與 keyboard 跑 menu、modal focus trap/return、tabs、sort/fork/remove、bulk/single collapse、fullscreen、Webcam/Console 尺寸。
- [ ] 真 WebGL：profile pivot 六種情境、top/3d/front/left/right、zoom/pan/fit、limits/grid/tool visibility、units、probe drag、G-code load/unload、WebGL unavailable fallback。
- [ ] 同一 browser/GPU、同一大型 fixture、五次 warm runs，記錄 p50/p95 load/render、操作後 frame latency。相較 baseline 中位數退步 >20% 或新主執行緒長停頓，先調查並列 reviewer gate，不隨意以 golden update 忽略。
- [ ] 預熱 5 次 load/unload，再記第 5/10/20 次 renderer.info.memory.geometries/textures 與 canvas/listener/RAF counts；應回到相同基線或可解釋的 cache plateau，不隨迴圈單調增長。heap 數字有 GC 噪音，不以单次 heap 增加斷言 leak。
- [ ] route mount/unmount 20 次後無殘留 widget canvas/active listeners/RAF。browser 的資源診斷只用開發測試 instrumentation，不新增產品控制介面。
- [ ] 所有 browser console errors、unhandled rejections、lost-context 異常列紀錄；新產生者零容忍，基線已知者分開記錄與修复 task。

```bash
yarn test:frontend --runInBand
yarn lint
yarn test --runInBand
yarn build
```

**Fail policy:** 任一數值/命令/lifecycle test 失敗，留在當前 task 修復；禁止 `test.skip`、廣泛吞 console.error、全 mock renderer/parser、更新 snapshot 來「解決」未知退步。browser 未跑就標 `not run`，不能宣稱 regression 已確保。

## 結果檔格式

```text
Task / source commit:
Test command / exit code:
Fixture / browser / viewport / GPU:
Before behavior:
After behavior:
Expected differences:
Unexpected differences / fix:
Artifacts:
Remaining untested paths:
Reviewer gate: pass / blocked by named failure
```
