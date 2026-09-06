# 06a — Axes Settings 受控草稿 Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans` 逐 task 執行。先讀上層 README 與設計。此文件是指定父 task 的細化版，介面以本文件為準；不授權平行 agents、不自動跳階段。

**Goal:** 完成 A1a，消除讀取 child.state/value/checked 的 instance 耦合。

**Architecture:** 一個 Settings owner 保存未提交草稿，子 tabs 只接 value/onChange；MDI HTTP 使用 Query，Save 是顯式 transaction sequence。

**Tech Stack:** JavaScript/JSX、React 18.3.1、Tonic 2.15.0、Query 4.44.0、Jest 29、Stylus。

**Spec:** [設計](../00-design.md)；[父計畫](../06-motion-widgets.md)。

## Global Constraints

- 不新增 TypeScript/CSS modules/Sass；自訂樣式用 Stylus，Tonic props 照 API。
- 不升 React/Query/Three.js major；所有使用者文字含 aria-label 用 i18next。
- React components 最終全部 function；DOM／非 React engine refs 可以保留，禁止用 imperative component API 重建 class instance。
- HTTP server state 用 Query；controller 指令不放 render/reducer/queryFn，不自動 retry。
- 先建立測試，再實作；本文件的程式碼是待實作內容，不代表已寫入 src 或已通過 repo tests。
- 每個可交付 task 完成後記錄命令與結果，保留獨立 diff；未得到提交授權不自行提交。


## Task S1：固定草稿形狀與既有正規化

**Create:** `src/app/widgets/Axes/Settings/draft.js`, `__tests__/draft.test.js`。
**Interfaces:**

```js
// createSettingsDraft(config, mdiRecords) returns this shape:
const exampleDraft = {
  general: {
    axes: ['x', 'y', 'z'],
    imperialJogDistances: ['0.1'],
    metricJogDistances: ['1'],
  },
  shuttleXpress: { feedrateMin: 100, feedrateMax: 2500, hertz: 10, overshoot: 1 },
  mdiRecords: [],
};
```

上面數字是 test fixture，不是要取代 repo 的 default；實際初始化從傳入 WidgetConfig 讀原值，保留 constants fallback。

- [ ] `normalizeGeneral(general)` 純函式沿來源 getter 規則：axes 按 x/y/z/a/b/c 順序且 x 必有；jog entries 以 Number 轉數值，只保留 >0，保留原順序。空字串/0/負數被濾掉；不要在這次遷移自訂排序、去重或新的 validation policy。
- [ ] draft 的 jog entries 保留字串讓輸入 `''`、小數尚未完成可編輯；normalize 只在 Save，UI max 5 entries 規則保留。
- [ ] 若要新增 finite-number 拒絕 Infinity 等校驗，另列使用者可見變更，不混入這個結構重寫。本輪僅保留原可由表單輸入的邏輯。
- [ ] 使用下列 test 固定舊 Getter 的實際語意。

```js
import { normalizeGeneral } from '../draft';

test('preserves original axis order and positive jog filtering', () => {
  expect(normalizeGeneral({
    axes: ['z', 'y'],
    imperialJogDistances: ['', '0', '-1', '0.1'],
    metricJogDistances: ['5', '1'],
  })).toEqual({
    axes: ['x', 'y', 'z'],
    imperialJogDistances: [0.1],
    metricJogDistances: [5, 1],
  });
});
```

- [ ] MDI records 使用 `{ id, ...existing fields }`，新增 record 在點 Create 時只建立一次 UUID，不在 reducer/render 生成。編輯依 id、排序沿原 splice 演算法，不能轉成按名稱重排。

Run: `yarn test:frontend --runInBand --runTestsByPath src/app/widgets/Axes/Settings/__tests__/draft.test.js`。

## Task S2：MDI query 與初始化時序

**Create:** `src/app/widgets/Axes/queries.js`, `__tests__/queries.test.jsx`。

```js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@app/api';

export const MDI_QUERY_KEY = ['api/mdi'];
export const useMdiQuery = () => useQuery({
  queryKey: MDI_QUERY_KEY,
  queryFn: async () => (await api.mdi.fetch()).body,
});
export const useSaveMdiMutation = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ records }) => (await api.mdi.bulkUpdate({ records })).body,
    onSuccess: () => client.invalidateQueries({ queryKey: MDI_QUERY_KEY }),
  });
};
```

- [ ] 對照 endpoint：GET `/api/mdi`、PUT `/api/mdi/`，不是 POST。保留 transport auth/cache header。現有 Promise wrapper 無可用 abort 介面，不宣稱 request cancellation。
- [ ] Settings 首次開啟先初始化 general/shuttle；MDI 未成功時 `mdiRecords=null`。query 首次成功再設定 records；後續 refetch 不覆蓋已建立的 draft，即使尚未編輯也不悄悄換內容。
- [ ] Save 在 mdiRecords=null/loading/error 時 disabled，防止把未讀取的記錄誤存成空陣列。Error 顯示重試；Cancel 仍可關閉。
- [ ] dialog 重開 remount 建立新 draft；明確 reset 以重新開啟為界，不以 query data identity 重置表單。
- [ ] 測一次 GET、多次 query data 更新不改 draft、成功 PUT invalidates、failure 不 invalidates、不自動 retry。

## Task S3：各 tab 改為受控 function

**Modify:** `Settings/General.jsx`, `ShuttleXpress.jsx`, `MDI/MDI.jsx`, `MDI/TableRecords.jsx`, `MDI/CreateRecord.jsx`, `MDI/UpdateRecord.jsx`。
**Create Test:** `src/app/widgets/Axes/__tests__/Settings.test.jsx`。

- [ ] General 收 `{ value, onChange }`，checkbox 綁 checked，不使用 ref.checked。Add/Remove distance 以 immutable arrays 呼叫 onChange；使用 Tonic Input/Checkbox/Button/Grid。
- [ ] ShuttleXpress 收同樣介面；feedrate range `[100,2500]` step 50，overshoot `[1,1.5]` step .01，hertz 原 options `[60,45,30,15,10,5,2,1]`。**Tonic 2.15 沒有公開 Slider**，保留 rc-slider，改 controlled `value` 而非 defaultValue；其餘 Label/Select 改 Tonic。
- [ ] MDI 收 `{ records, onRecordsChange }`，只持有 modal 開關與暫存 edit selection；移除 fetchRecords/api state。Create/Update dialogs 收 `{ initialValues, onSave, onCancel }`，不持有整個 parent action/state object。
- [ ] TableRecords 收 records 與 named callbacks `{ onMove, onCreate, onUpdate, onRemove }`；不再依賴 state.api。loading/error 由 Settings owner 顯示。
- [ ] inactive Tabs 保持 mount 或從 parent draft 還原，二者結果都要讓跨 tab 編輯不丟值；維持原 tab 順序與無 overlay-dismiss 的 modal。

## Task S4：Save 一次、成功才關閉

**Modify:** `Settings/index.jsx`、Axes 的 Settings onSave caller。

- [ ] owner Save handler 先檢查 MDI ready，保存這次 draft 的 snapshot，啟動 mutation；在 pending 時 disabled，另外使用同步 submit lock ref 防止同一 tick 的雙擊穿透。lock 在 finally 清理。
- [ ] await `saveMdi.mutateAsync({ records: snapshot.mdiRecords })` 成功，再依 normalizeGeneral 寫七個原設定：axes、jog.imperial.distances、jog.metric.distances、shuttle.feedrateMin、feedrateMax、hertz、overshoot；最後 `onSave(event)` 一次。
- [ ] 失敗不寫本地設定、不呼叫 onSave；保留草稿並以既有 i18n error 呈現。MDI server 成功而本地 persistence 延遲失敗不聲稱跨 server/local 的 ACID transaction；config.persist 本身已有異步記錄行為，本輪不重寫 storage engine。
- [ ] `onCancel` 不送 PUT；pending 時是否可 Cancel 必須明確：本輪禁用 Cancel/close，避免使用者誤以為可撤銷已送出的更新。此項與「成功才關閉」一併列為有意 UX 修正。

**整合測試順序：** load two records → General 改 distance → MDI reorder/create → Shuttle change → tabs 來回 → background refetch → Save → 驗證 PUT records 順序及 config writes → onSave once。failure 分支驗證所有 local writes 零次，重試使用未丟失 draft。

```bash
yarn test:frontend --runInBand --runTestsByPath src/app/widgets/Axes/Settings/__tests__/draft.test.js src/app/widgets/Axes/__tests__/queries.test.jsx src/app/widgets/Axes/__tests__/Settings.test.jsx
yarn eslint
yarn build
rg -n 'this.node|this.field|get value|useImperativeHandle|extends .*Component' src/app/widgets/Axes/Settings
```

最後 rg 無 React instance 存取。原 Axes 的 command logic 不在此改；A1b 另外驗證指令。
