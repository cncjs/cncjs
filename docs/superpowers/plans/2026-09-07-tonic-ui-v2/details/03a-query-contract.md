# 03a — Macro Query / Mutation 可測合約 Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans` 逐 task 執行。先讀上層 README 與設計。此文件是指定父 task 的細化版，介面以本文件為準；不授權平行 agents、不自動跳階段。

**Goal:** 細化 Q1/Q2，讓 shared cache、錯誤處理與 mutation closure 可直接測試。

**Architecture:** 沿用已有 Query v4 client 與 resource keys，只抽出跨頁 hooks；HTTP mutation 成功先 invalidation 再 caller callback。

**Tech Stack:** JavaScript/JSX、React 18.3.1、Tonic 2.15.0、Query 4.44.0、Jest 29、Stylus。

**Spec:** [設計](../00-design.md)；[父計畫](../03-query-and-macro.md)。

## Global Constraints

- 不新增 TypeScript/CSS modules/Sass；自訂樣式用 Stylus，Tonic props 照 API。
- 不升 React/Query/Three.js major；所有使用者文字含 aria-label 用 i18next。
- React components 最終全部 function；DOM／非 React engine refs 可以保留，禁止用 imperative component API 重建 class instance。
- HTTP server state 用 Query；controller 指令不放 render/reducer/queryFn，不自動 retry。
- 先建立測試，再實作；本文件的程式碼是待實作內容，不代表已寫入 src 或已通過 repo tests。
- 每個可交付 task 完成後記錄命令與結果，保留獨立 diff；未得到提交授權不自行提交。


## Task M1：共享 Query data 契約

**Create:** `src/app/queries/macros.js`, `src/app/queries/__tests__/macros.test.jsx`。
**Modify:** 原 Administration/Macros queries import consumers。

沿父計畫保留 query key/variables；list 回 `{ records, ...serverFields }`，不回 axios response。不把 detail data 和 list data 混合。Axios mock 定義在 suite，`jest.mock('@app/api/axios', () => ({ get:jest.fn(), post:jest.fn(), put:jest.fn(), delete:jest.fn() }))`，不 mock useQuery。

```jsx
import { renderHook, waitFor } from '@testing-library/react';
import axios from '@app/api/axios';
import { createTestQueryClient, createTestWrapper } from '@app/test/render';
import { useFetchMacrosQuery } from '../macros';

jest.mock('@app/api/axios', () => ({
  get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(),
}));

test('list works without meta and returns the payload rather than axios response', async () => {
  const payload = { records: [{ id: 'm1', name: 'fixture' }] };
  axios.get.mockResolvedValue({ data: payload });
  const client = createTestQueryClient();
  const view = renderHook(() => useFetchMacrosQuery(), { wrapper: createTestWrapper(client) });
  try {
    await waitFor(() => expect(view.result.current.isSuccess).toBe(true));
    expect(view.result.current.data).toEqual(payload);
    expect(axios.get).toHaveBeenCalledWith('api/macros', {
      signal: expect.any(AbortSignal),
    });
  } finally {
    view.unmount();
    client.clear();
  }
});
```

- [ ] 相同 key 的兩個 observers 在同一 render mount，以 deferred GET 斷言在完成前只有一次 request；不是第二個晚 mount 在 stale data 時也強制零 refetch。
- [ ] filtered query key 與全列表不能互相覆蓋；detail query 無 id disabled；cancelQueries 傳 signal abort，未 resolve 的舊請求不可覆寫新使用者 cache。
- [ ] options.queryFn/queryKey 不允許覆蓋共享 resource contract；options.enabled/select/staleTime 等保留既有呼叫需求。

## Task M2：Mutation callbacks 與 retry

**Modify:** shared macros.js 所有 CRUD hooks；清除 callers 重複 invalidate。

對每個 hook 明確寫以下 shape，不建萬用 CRUD factory：

```js
const useCreateMacroMutation = (options = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...rest } = options;
  return useMutation({
    ...rest,
    mutationFn: async ({ data }) => (await axios.post('api/macros', data)).data,
    onSuccess: async (data, variables, context) => {
      await queryClient.invalidateQueries({ queryKey: API_MACROS_QUERY_KEY });
      return onSuccess?.(data, variables, context);
    },
  });
};
```

mutation retry 全域 false；caller 不得設 retry=true 重送 CNC 操作。本 module 的 CRUD 也沿用 false。

- [ ] 測 mutationFn params、success invalidate prefix、onSuccess args/order、failure 不調 success、不 close。批次刪除仍 POST `api/macros/delete`，不能照單筆 DELETE 改 API。
- [ ] GlobalProvider 的 client 維持 module singleton；portal 的第二 React root 要共用它。不要每 render new QueryClient；每個測試用自己的 client。
- [ ] MacroQueryEvents 只掛主 App 一次，不放到 portal 重建的 GlobalProvider。config:change 事件只 invalidates read data，不觸發 mutations。
- [ ] session token 變更時清理 server cache：在主 App 的 session lifecycle bridge 保存前一 session identity（不 log/token key），先 cancel/remove 舊 queries，後開啟新 session query；Axios 取最新 token。測慢舊 request 晚到與兩個 portal roots 的共享狀態。

## Task M3：Macro UI 與失敗路徑

**Create Test:** `src/app/widgets/Macro/__tests__/MacroMutations.test.jsx`。

- [ ] NewMacro 填資料→Submit→pending→resolve：post 一次，invalidate 後 close 一次。reject：保留原輸入、顯示 error、不 close。
- [ ] Edit→Delete confirm：Cancel 只關 confirm；confirm reject 留兩層；resolve 各關一次。明確區分 `closeEdit`/`closeConfirm` 命名，避免舊 lexical shadowing。
- [ ] pending 下禁連按/關閉引起誤解，必要 synchronous submit lock 同 Settings；mutation 已送不聲稱 Cancel 可撤銷。
- [ ] list initial loading、empty、failure、background refetch 四種視圖；background refetch 保留 rows 是有意變更。
- [ ] New/Edit/Delete 後 widget 與 Administration 的 active observers 都取得新資料，不依賴 controller config:change 才更新。
- [ ] 最後清 actor/start/stop/context/import；先 repo-wide掃描再刪 XState package，不影響 controller workflow。

Run：父計畫 03 所列 Query/Macro tests + `yarn lint` / `yarn build`。若只單元測 hooks 沒跑真表單 submit/close，Q2 不算完成。
