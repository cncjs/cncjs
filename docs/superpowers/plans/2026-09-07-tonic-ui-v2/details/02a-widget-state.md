# 02a — 無 component instance 的 Widget 架構 Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans` 逐 task 執行。先讀上層 README 與設計。此文件是指定父 task 的細化版，介面以本文件為準；不授權平行 agents、不自動跳階段。

**Goal:** 完成 U1a/U1b，移除 Workspace 的 widget instance registry。

**Architecture:** minimized 直接以既有 config 為唯一持久化來源；Provider 只持有 ephemeral fullscreen。讀取端訂閱穩定 snapshot，沒有第二份 minimized reducer。

**Tech Stack:** JavaScript/JSX、React 18.3.1、Tonic 2.15.0、Query 4.44.0、Jest 29、Stylus。

**Spec:** [設計](../00-design.md)；[父計畫](../02-shared-ui.md)。

## Global Constraints

- 不新增 TypeScript/CSS modules/Sass；自訂樣式用 Stylus，Tonic props 照 API。
- 不升 React/Query/Three.js major；所有使用者文字含 aria-label 用 i18next。
- React components 最終全部 function；DOM／非 React engine refs 可以保留，禁止用 imperative component API 重建 class instance。
- HTTP server state 用 Query；controller 指令不放 render/reducer/queryFn，不自動 retry。
- 先建立測試，再實作；本文件的程式碼是待實作內容，不代表已寫入 src 或已通過 repo tests。
- 每個可交付 task 完成後記錄命令與結果，保留獨立 diff；未得到提交授權不自行提交。


## 來源證據與這次細化的修正

- `EventEmitterStore.get()` 回傳內部不可變更新後的 root；`.state` getter 每次淺拷貝，不能直接當 useSyncExternalStore snapshot。
- `config.set/update/unset` 透過 Immer 並在改變時 emit `change`；`config.state = ...` 不 emit。啟動非同步載入需要一次明確通知。
- Primary/Secondary 的 shouldComponentUpdate 只比較 state，忽略 props；只往舊 class 注入新 props 可能被擋住。因此 group containers 在 D4 一併改 function。
- 只有 **16 個 widgets** 有 minimized/isFullscreen；`Visualizer/index.jsx` 沒有。registry 必須有 `supportsChrome: false` 的 Visualizer，保留原行為，不新增外框功能。
- DefaultWidgets 沒有 sortable/onFork/onRemove，不可用一般 widget props 強制要求；WidgetHost 原樣傳入合法 props。

## Task D1：純資料 helper 與 snapshot（尚不接線）

**Create:** `src/app/pages/Workspace/widgetRegistry.js`, `widgetUIState.js`, `__tests__/widgetUIState.test.js`。
**Read:** 現有 `Widget.jsx` registry、Primary/Secondary filter、`widgets/shared/utils.js`。

**Registry:** 搬現有 17 個 imports 與 mapping；每筆 `{ Component, supportsChrome, controllerType }`。Visualizer false，其餘 true；Grbl/Marlin/Smoothie/TinyG 填 controller constants，其餘 undefined。不要把 `app/widgets/Tool` 的 alias 拼字帶到新檔，使用既有標準 `@app`。

**Helper signatures:**

```js
export const selectVisibleWidgetIds = (ids, availableControllers, registry) => {
  return ids.filter(id => {
    const entry = registry[id.split(':')[0]];
    return entry && (!entry.controllerType || availableControllers.includes(entry.controllerType));
  });
};

export const setWidgetsMinimized = (widgets, ids, minimized) => {
  let next = widgets;
  ids.forEach(id => {
    const previous = widgets[id] || {};
    if (Boolean(previous.minimized) === minimized) {
      return;
    }
    if (next === widgets) {
      next = { ...widgets };
    }
    next[id] = { ...previous, minimized };
  });
  return next;
};
```

`ids` 進入 setWidgetsMinimized 前已由 Provider 過濾 capabilities/fullscreen，這個 pure helper 不 import React/config/controller。保留沒在 ids 的設定物件 identity；fork id 用 object key／array path，不用有歧義的 dotted 字串。

- [ ] 建立下面 failing test，再實作 helpers。

```js
import { setWidgetsMinimized } from '../widgetUIState';

test('bulk collapse updates only selected ids and preserves domain settings', () => {
  const widgets = {
    axes: { minimized: false, axes: ['x', 'y'] },
    'webcam:fork-1': { minimized: false, url: 'fixture' },
    macro: { minimized: false },
  };
  const next = setWidgetsMinimized(widgets, ['axes', 'webcam:fork-1'], true);
  expect(next.axes).toEqual({ minimized: true, axes: ['x', 'y'] });
  expect(next['webcam:fork-1'].url).toBe('fixture');
  expect(next.macro).toBe(widgets.macro);
  expect(widgets.axes.minimized).toBe(false);
  expect(setWidgetsMinimized(next, ['axes'], true)).toBe(next);
});
```

- [ ] 再測 empty ids、false/default no-op、unknown registry id、controller filter、Visualizer 可見但不支援 chrome。
- [ ] `createMinimizedSnapshotReader(config)` 回傳 memoized getter：讀 `config.get('widgets', EMPTY_OBJECT)`，投影成**只有 minimized=true 的 ids map**；若 keys/boolean 全相同，回傳上次同一物件。無關 axes position/settings 更新不得換 snapshot。不可在 getter 寫 config。
- [ ] `config` 注入只為測試這個有 IO 邊界的 reader，不做泛用 store framework。測試 reader 連續呼叫 `toBe` 相同、改 domain 值相同、改 minimized 不同、unset/reset 回到 empty。

Run: `yarn test:frontend --runInBand --runTestsByPath src/app/pages/Workspace/__tests__/widgetUIState.test.js`。
Expected: 新增 import 缺失先 FAIL；helpers 完成後上述 identities 與 values PASS。

## Task D2：config 啟動通知與 Provider actions

**Create:** `WidgetUIProvider.jsx`, `useWorkspaceWidgetUI.js`, `useWorkspaceWidgetIds.js`, `__tests__/WidgetUIProvider.test.jsx`（均在 Workspace）。
**Modify:** `src/app/store/config/index.js` 的成功載入路径；新增 `src/app/store/config/__tests__/hydration.test.js`。

- [ ] 只在成功 parse/normalize/assign，且 migration 完成後 `config.emit('change', config.get())`。記錄一個 local `didRestore` flag 控制通知，失敗的 corrupted-settings 分支不要把預設值默默 persist 覆蓋原資料。測試 mock Electron 延遲成功/失敗；不修改 EventEmitterStore.state setter 的全域語意。
- [ ] `config.restoreDefault()` 的現有 consumers 會 persist 然後 reload，Provider 透過 remount 取得新值，不另加輪詢或全域 reset event。其他將來不 reload 的整份狀態替換必須遵守通知契約。
- [ ] Provider `useSyncExternalStore(subscribe, readMinimizedSnapshot)`；subscribe 只在 effect 所控生命周期 attach `config.on('change', listener)` 並回傳 off。reader 用 useMemo 建一次。
- [ ] fullscreenById 是 Provider 的 local state；在 action handler 同步更新 latest ref 和 setState，以支援同一 event 中連續 toggle；ref 不在 render 改，不藏其他 domain state。
- [ ] `setManyMinimized(ids,next)` 過濾 unknown、supportsChrome=false 與 fullscreen=true；呼叫一次 `config.update('widgets', widgets => setWidgetsMinimized(widgets || {}, filteredIds, next))`，不是每 id 逐一 emit。next 是 boolean，禁止 toggle 批次副作用。
- [ ] `setMinimized(id,next)` 呼叫同一 bulk action。`toggleFullscreen(id)` 進入時先展開，然後 set fullscreen；退出保留展開，不恢復舊收合值。fullscreen 時單一/批次 collapse 都忽略。
- [ ] 支援 group toolbar 的最終契約仍為 `{ getChrome, setMinimized, setManyMinimized, toggleFullscreen }`，getChrome 回 `{ minimized, isFullscreen }`。context value 對 snapshot/fullscreen 變化 memoized，無關資料不更新。
- [ ] `useWorkspaceWidgetIds(group)` 用相同 config change 訂閱與 `config.get(['workspace','container',group,'widgets'], EMPTY_ARRAY)` snapshot；EMPTY_ARRAY 模組級常數。setWidgetIds(group, ids) 直接寫原 path；不再複製 group list 到第二份 local state。
- [ ] 僅支持 default/primary/secondary 三個既有 group，沒有新 plugin schema、跨 widget command bus 或任意 method registry。

測試用 `EventEmitterStore` 或只 mock `{get,update,on,off}`，不要載入真 config singleton 的 localStorage 啟動副作用。建立 Harness 的 buttons 呼叫 actions，output 顯示 JSON chrome，再用 Testing Library 點擊。

**必測序列:**

| 操作 | 期待 |
| --- | --- |
| bulk axes + webcam:fork | 一次 config change；兩者 minimized=true；macro 不變 |
| 同值 collapse 再一次 | 零 config change |
| fullscreen axes → bulk collapse → exit | axes 保持展開，webcam 收合 |
| 對 visualizer/unknown toggle | 不寫任何 config，不創建 fullscreen entry |
| config 外部修改 minimized | UI 更新；沒有反向寫回造成 loop |
| provider 卸載/重掛 | listener 數回基線；fullscreen=false，minimized 保留 |
| 異步 config restore 完成 | 已掛載 UI 讀到 saved minimized，不用等待下一次設定修改 |

## Task D3：WidgetHost 與 16 個 chrome consumers（整合單位前半）

**Modify:** `Widget.jsx`；除 Visualizer 外 16 個 `widgets/<Name>/index.jsx`；`components/Widget/Widget.jsx` / `Button.jsx`。
**Create Test:** `__tests__/WidgetChromeIntegration.test.jsx`。

- [ ] WidgetHost 改 function；先 registry lookup，unknown→null；supportsChrome=false 直接傳原 props，不 subscribe 每 widget chrome。
- [ ] 支援 chrome 的內層 Host 取 context，`useMemo` 組 `{ minimized, isFullscreen, onMinimizedChange, onToggleFullscreen }` 傳下去。callback 綁 widgetId，不能再把 component ref 傳到 registry Component。
- [ ] simple shells（Connection/Console/Custom/GCode/Grbl/Laser/Macro/Probe/Spindle/Webcam）移除 local minimized/fullscreen 和 public methods；可以順便轉 function，但 Macro actor 須保留至 Q2 正確 cleanup，不任意刪除其 services。
- [ ] domain shells（Axes/Autolevel/Tool/Marlin/Smoothie/TinyG）只換 chrome：state 不再放兩個欄位；保留其餘 state、lifecycle 和 domain actions。本 task 不是大規模重寫 domain。
- [ ] Axes componentDidUpdate 只移除 minimized 寫入，axes/jog/mdi persistence 保留。Tool 的 unitsDidChange guard 保留。Autolevel/Tool `actions.toggleMinimized/toggleFullscreen` 可短期作事件轉送到 props，但不能再 setState chrome。
- [ ] Console/Webcam 傳給內容的 isFullscreen 改 `chrome.isFullscreen`；其他 child 若解構整個 state，需要在 callsite 明確補同名 UI prop，不把 chrome 再存回 state。
- [ ] Widget 外框用 function，保留 role region 與 fullscreen class；內容隱藏保持 mounted。Tonic Button 使用現有 header sizing/disabled behavior。

Test：用 mock registry body renderCounter/unmountCounter 驗證雙 fork、collapse 不卸載；另以真 Connection 和 Autolevel shell（mock controller）驗證，不只 mock 全部內容。

## Task D4：group containers 與 Workspace toolbar（整合單位後半）

**Modify:** `PrimaryWidgets.jsx`, `SecondaryWidgets.jsx`, `DefaultWidgets.jsx`, `Workspace.jsx`, `index.js`。
**Create:** `WorkspaceRoot.jsx`, `__tests__/WidgetGroups.test.jsx`。

- [ ] index.js barrel 改 export WorkspaceRoot；新增 JSX 文件避免 JS entry 解析歧義。WorkspaceRoot 包 Provider，內層 function boundary 用 hook 把 `widgetUI` props 傳進暫留 class 的 Workspace；原 router/Redux export 合約原樣轉發。
- [ ] Primary/Secondary 改 function，讀 useWorkspaceWidgetIds；fork/remove/sort handlers 直接寫 config list，沿用確認 dialogs、UUID、settings clone 和 `onForkWidget/onRemoveWidget` 原 callback 參數。
- [ ] PubSub updatePrimaryWidgets/updateSecondaryWidgets 訂閱一次，handler 更新同一 config list；不再 componentDidUpdate 回寫。Sortable callbacks 使用當下 list，跨欄位移動保留 group put/pull 設定。
- [ ] registry filter 使用 selectVisibleWidgetIds；Workspace toolbar 用相同 selector 和目前 config list 取得 ids，再呼叫 widgetUI.setManyMinimized。可保留 controller.availableControllers 原來源，此輪不加新 controller subscription。
- [ ] 刪 shouldComponentUpdate、widgetMap、collapseAll/expandAll、Primary/Secondary component refs。Visualizer 若在 default/其他 group，依 supportsChrome=false 不做 minimize。
- [ ] remove fork 設定仍 `config.unset(['widgets',widgetId])`，原生 widget 保留設定；fullscreen entry 在 active ids 移除時清除，持久化資料不可因 general render 被掃除。
- [ ] 測 toolbar→真 group→Host→chrome 的完整鏈、設定寫入次數、availableControllers、跨欄 drag、fork/remove、舊設定重新載入。mock Sortable 以其 onChange/order 合約觸發，不 mock state reducer。

D3/D4 可分 patch review，但必須一起通過 build/browser 才交付；中間沒有用 imperative bridge 維持 runtime 的需求。

```bash
yarn test:frontend --runInBand --runTestsByPath src/app/pages/Workspace/__tests__/widgetUIState.test.js src/app/pages/Workspace/__tests__/WidgetUIProvider.test.jsx src/app/pages/Workspace/__tests__/WidgetChromeIntegration.test.jsx src/app/pages/Workspace/__tests__/WidgetGroups.test.jsx src/app/store/config/__tests__/hydration.test.js
yarn eslint
yarn build
rg -n 'widgetMap|collapseAll|expandAll|useImperativeHandle' src/app/pages/Workspace
```

最後一個 rg 無結果為預期 exit 1。檢查 widget index 的 minimized local state；16 個 consumers 應只讀 chrome，Visualizer 不被改成收合式 widget。
