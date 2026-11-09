# 07a — Visualizer Engine 與 Resource Ownership Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans` 逐 task 執行。先讀上層 README 與設計。此文件是指定父 task 的細化版，介面以本文件為準；不授權平行 agents、不自動跳階段。

**Goal:** 完成 V2/V3，保留幾何與操作語意並解除父子 React instance API。

**Architecture:** renderer engine 不 import React/controller/config/pubsub；owner hook 橋接既有事件、生命週期及 React state。同步 G-code load 回傳 bbox，非同步 STL/texture 使用資源 generation guard。

**Tech Stack:** JavaScript/JSX、React 18.3.1、Tonic 2.15.0、Query 4.44.0、Jest 29、Stylus。

**Spec:** [設計](../00-design.md)；[父計畫](../07-visualizer.md)。

## Global Constraints

- 不新增 TypeScript/CSS modules/Sass；自訂樣式用 Stylus，Tonic props 照 API。
- 不升 React/Query/Three.js major；所有使用者文字含 aria-label 用 i18next。
- React components 最終全部 function；DOM／非 React engine refs 可以保留，禁止用 imperative component API 重建 class instance。
- HTTP server state 用 Query；controller 指令不放 render/reducer/queryFn，不自動 retry。
- 先建立測試，再實作；本文件的程式碼是待實作內容，不代表已寫入 src 或已通過 repo tests。
- 每個可交付 task 完成後記錄命令與結果，保留獨立 diff；未得到提交授權不自行提交。


## 已確認的既有缺陷，不可當 golden baseline

歷史版本曾有 `index.jsx` 呼叫 `this.visualizer.load(content, callback)`、而 `Visualizer.jsx` 宣告 `load(name, gcode, callback)` 的不一致。現行 source 已由 `52560a43 fix(visualizer): pass gcode content to renderer` 修正為 `this.visualizer.load(name, content, callback)`，與 child signature 一致。E1 不得回退或新增雙 API；應以真正 parser 的 characterization test 固定這個已修正的合約，並在 execution log 記錄此 source drift ruling。不能用 mock load 任意回傳 bbox 隱藏錯誤。

`GCodeVisualizer.render(gcode)` 呼叫 loadFromStringSync，**G-code parse 目前同步**。初版計畫的 load callback race 描述太寬：真正非同步來源是 owner 的 setTimeout、STL/texture loaders、RAF 與 controller events。本版固定同步 engine.load 返回值，刪除不必要的 callback/setTimeout，不新增 worker 或 request queue。

## Task E1：舊版 characterization 與 load signature 修正

**Create:** `src/app/widgets/Visualizer/__tests__/fixtures.js`, `geometry.test.js`, `legacyLoad.test.jsx`。
**Modify only if current source violates the characterization:** `Visualizer.jsx` 的 load signature 改 `load(gcode, callback)`，或在同一 extraction patch 導入下述 object signature。現行 `load(name, gcode, callback)` 與 owner caller 已相符時，E1 只新增 characterization evidence；object signature 屬 E2，不能在 E1 提前導入。

- [x] 在改場景 methods 前完成 [regression gates](../09-regression-gates.md) 的 R0/R3 幾何與 pivot 基準。舊 class 可以在測試內用 ref 呼叫作 characterization；最終測試換 engine，不允許把 production component refs 保留。
- [x] `legacyLoad` 透過真 owner load action + 真 GCodeVisualizer parser，mock WebGLRenderer/asset network；斷言 parser 收到 G-code string，callback/bbox state 一次完成。現行 source 已符合合約，已記錄 passing characterization baseline 與修正 commit `52560a43`；沒有回退以人為製造 RED，也沒有提前導入 E2 object signature。
- [x] 不把重現的 defect 當所有其他測試失敗的理由。幾何測試以直接正確的 parser input 作獨立 oracle。

## Task E2：抽出非 React engine，保留演算法

**Create:** `src/app/widgets/Visualizer/VisualizerEngine.js`, `__tests__/VisualizerEngine.test.js`。
**Modify:** `Visualizer.jsx` 暫時委派 engine，或與 E3 同批改 function。

**固定公開介面：**

```text
createVisualizerEngine({ container, viewState, onError })
// returns:
{
  update(nextViewState),
  load({ name, content }), // synchronous -> { bbox }, name reserved for display metadata only
  unload(),
  resize(),
  zoomFit(), zoomIn(delta), zoomOut(delta),
  panUp(), panDown(), panLeft(), panRight(), lookAtCenter(),
  showProbe(data), updateProbe(data), hideProbe(),
  dispose(),
}
```

不得同時再提供 `load(content, callback)`。engine load 失敗 throw，owner catch 到 i18n error 狀態；onError 專供 engine 非同步 asset failures，不同一錯誤報兩次。

**viewState 固定欄位：** `{ show, cameraPosition, projection, cameraMode, units, objects, machinePosition, workPosition, isAgitated, sent, machineProfile }`。objects 延用既有四組 visibility（coordinateSystem/gridLineNumbers/limits/cuttingTool）。machineProfile 源自 config 已解析的 object/null；sent 是原 state.gcode.sent。不要把整個 widget state/controller instance 传進 engine。

| 來源 methods | engine 責任 |
| --- | --- |
| createScene/create*Camera/createTrackballControls | constructor/factory setup；每 container 一個 renderer |
| componentDidUpdate 的 projection/mode/units/visibility/positions | update(nextViewState)，內部保存 previous viewState 做差異判斷 |
| changeMachineProfile | update 的 profile branch，保留 pivot pipeline，不讀 config |
| load/unload | 同步 parse + mesh/frame/bbox/pivot，回傳 bbox，不 dispatch Redux |
| setCameraMode/toTopView/to3DView/toFrontView/toLeftSideView/toRightSideView | update cameraMode/cameraPosition |
| resizeRenderer/throttledResize | resize + hook 擁有的 32ms throttle；保留原值，註解的 60hz 不拿來改算法 |
| show/hide/updateProbeVisualization | showProbe/updateProbe/hideProbe；資料形狀不變 |
| clearScene/unsubscribe/removeResize | engine dispose 只處理 scene 資源；event unsubscribe 屬 hook |

- [x] 將 group/pivot/machinePosition/workPosition 等欄位移到 engine；允許非 React class 保存 methods，沒有必要把 1500 行塞進 hook closure。
- [x] factory 使用傳入 container 取尺寸，移除全部 findDOMNode。render/show 隱藏語義仍 visibility:hidden，不能新改 display:none 卻把 canvas 尺寸歸零。
- [x] `load` 先卸載前 mesh、parse content、center/pivot/viewport update，最後 return `{bbox}`；frameIndex 仍由 sent update 控制，不改 Toolpath 演算法。
- [x] 初始 machineProfile 不預先設成相同值讓 equality guard 跳過；先 scene setup，再 apply profile pipeline。保留 profile / gcode 兩套 pivot 政策。
- [x] engine tests 使用真 THREE.Scene/Group/Geometry 與真 GCodeVisualizer，只 mock WebGLRenderer、assets 和 controls DOM；捕捉 renderer.render(scene,camera) 的參數作 oracle，不新增 production debug getter。

## Task E3：精確資源 cleanup

**Modify:** `VisualizerEngine.js`, `helpers.js`（loader error callback），必要的 `GCodeVisualizer.js` disposal。
**Create Test:** `__tests__/VisualizerResources.test.js`。

| Resource | owner / 釋放 |
| --- | --- |
| WebGLRenderer/canvas | engine dispose：renderer.dispose()；移除自己 append 的 canvas；不移除 host DOM |
| controls start/end/change handlers | engine 保存具名 callbacks；removeEventListener + controls.dispose |
| agitation RAF、controls drag RAF | 各存獨立 RAF id；重複 start 不建立第二條 loop；dispose cancel 兩者 |
| throttle resize | hook cleanup cancel()，移除 window listener |
| geometry/material/texture | 每個 engine 自有 instance；dispose removed mesh 時遍歷 Set 去重；共享資源明確排除 |
| ProbeVisualization | 呼叫其 dispose，避免其物件與 engine traversal 雙重所有權；逐項核對它實際 dispose 的資源 |
| STL/texture pending | dispose 後回來的 geometry/texture 立刻釋放，不 attach scene，不 render，不 onError 再 setState |
| PubSub/config | hook cleanup，engine 不直接 subscribe |

- [x] loadSTL/loadTexture 的 Promise 加入 loader onError→reject；成功/失敗都有可完成的 Promise，不掛住無限 loading。
- [x] 用 Promise.allSettled 或分資源 ownership 收集處理「一個 loader 成功、一個失敗」；不能只 Promise.all catch 而丟失已完成但未 attach 的 GPU 資源。engine disposed flag/asset generation gate 在 await 後、attach 前檢查。
- [x] 資源 late arrival 使用**目前** viewState 的位置、visible、profile，而不是 createScene 時解構的 stale objects。允許 assets 晚到，但不能重新建立 renderer。
- [x] dispose 可重複；第 2 次不再呼叫底層 dispose、不 render；RAF callback 若正執行，也先判 disposed 才 schedule 下一 frame。
- [x] 不升 Three.js，不把既有 Geometry 轉 BufferGeometry，不變更 arc sampling。

## Task E4：hook、owner 與跨 widget events

**Create:** `src/app/widgets/Visualizer/useVisualizer.js`, `__tests__/useVisualizer.test.jsx`。
**Modify:** `index.jsx`, `Visualizer.jsx`。

**Hook interface:** `useVisualizer({ viewState, onError })` 回 `{ containerRef, isReady, actions }`；actions 與 engine 公開操作一致，但無 engine/scene instance 暴露給其他 widgets。isReady 代表 renderer/scene setup 完成，不等 STL 載完。

- [x] hook 用 callback DOM ref 或 state node 作 mount dependency，container 真正出現才建 engine；viewState 更新走 engine.update，不能列入 create/dispose effect dependencies。一個 canvas host 不因單純 rerender 重建。
- [x] actions 用穩定 callbacks 讀 engineRef；事件觸發時 call，不能為重複命令使用 render prop 累加 counter。engine 未 ready 時 toolbar actions disabled，G-code load 在 hook ready 後由 owner 明確處理當下最新 pending document 一次。
- [x] owner 的 loadGCode({name,content,isProbeCompensationApplied}) 在 ready 時同步 `actions.load({name,content})`，取得 bbox 後更新 controller.context/Redux UPDATE_BOUNDING_BOX/domain reducer 一次。刪原 setTimeout 和 React setState callback 排程。
- [x] WebGL unavailable 分支保留 ready/no-renderer 舊流程；G-code 仍可載入機器、顯示名稱／狀態，不因 engine 缺席永遠 loading。
- [x] 如果 load 在 engine 建立前抵達，只保留最新 pending `{id,name,content}`，unload 清 pending。ready effect 消耗一次並移除；同內容但不同使用者 load 事件可重新載入。
- [x] 既有 resize/PubSub 的四項 probe事件、config profile change 由 hook/owner 单一地方橋接。profile 使用目前 config snapshot；避免 engine 與 owner 各訂一次。
- [x] `Visualizer.jsx` 只接 `{ containerRef, show }` 渲染 DOM；不需要 forwardRef，不能加 useImperativeHandle。owner 拿的是 hook actions，不是子 React component methods。
- [x] Run/Pause/Stop 保留既有 command route，UI/state 更新本身不送機器指令。

**Gate:** R3/R4/R5 全過，真 browser WebGL 見 regression plan。V2 不可只以 mock load 回傳固定 bbox 宣稱功能相同。
