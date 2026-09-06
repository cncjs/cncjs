# 03 — Macro 與 TanStack React Query Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans`，一次執行一個 task，以 checkbox 記錄。使用者若另行授權平行 agent，可使用 `superpowers:subagent-driven-development`。先讀 README、設計與 inventory；不要自動開始下一份計畫。

**Goal:** 刪除 createFetchMachine 及 Macro actor，統一 HTTP query/mutation 與 cache。

**Architecture:** 先共享 Administration 已有 query hooks，再遷移 Macro query、CRUD、widget chrome；只刪確定無其他使用的 XState dependencies。

**Tech Stack:** JavaScript/JSX、React 18.3.1、Tonic UI 2.15.0、TanStack React Query 4.44.0、Redux、Stylus、Jest 29、Webpack 5。

**Spec:** [設計與約束](00-design.md)。檔案範圍見 [inventory](inventory.md)。

## Global Constraints

- JavaScript only；不新增 TypeScript、CSS modules 或 Sass。自訂樣式使用既有 Stylus；Tonic 本身的 props/token/theme 照其 API 使用。
- 保留 Node >=18、React 18 與 Query v4；本輪不升 React 19 / Query v5，不升控制器協定與 Three.js。
- 使用 i18next 處理所有新增／修改的使用者文字，含 aria-label。
- 有 Tonic 對應的通用元件直接 import `@tonic-ui/react`；不能以永久 re-export 或自製同功能 wrapper 當作完成。
- 只轉 React class components；非 React 類別（WidgetConfig、History、ShuttleControl、Three.js 邏輯）不因語法掃描而重寫。
- 所有 HTTP server state 的新遷移使用 useQuery/useMutation；Socket.IO/controller 指令仍由既有傳輸層處理。
- 每個 task 先建立行為測試／基準，再修改、跑指定檢查；只 stage 該 task 的檔案。若沒有提交授權，留下可 review 的 diff 與建議 commit message。

---


**Prerequisite:** F2、U1a/U1b。Tonic modal 契約依 U3。

具體 hook 測試與 mutation 順序見 [03a](details/03a-query-contract.md)；所有 React/non-React caller 的允許邊界及稽核規則見 [03b](details/03b-query-boundaries.md)。Q1 開始前先完成 03b 的 B0 import baseline，W3 才能判斷何者是違規 direct transport。

## Task Q1：共用 Macro query module

**Create:** `src/app/queries/macros.js`, `src/app/queries/__tests__/macros.test.jsx`。
**Modify:** `src/app/pages/Administration/Macros/queries.js` 及其所有 consumers（inventory / rg 列出）；`src/app/context.jsx` 僅在 cache reset 測試需要時抽出同一 client。

**Interface:** 保留既有 `API_MACROS_QUERY_KEY = ['api/macros']` 與所有 useFetch/useRead/useCreate/useUpdate/useDelete/useBulkDelete hook 名稱及 `{ meta, data }` mutation variables，避免讓 Administration 與 widget 使用不同 cache key。

- [ ] 把现有 hooks 移到共享 module；Administration 暫時 re-export 再逐個更新 import。list query 的 `options` 預設 `{}`，queryFn 不再無條件解參考 `meta.query`。
- [ ] list/query detail queryFn 明確回傳 `response.data`，加入 Axios signal。保留目前 list key 的 `[...API_MACROS_QUERY_KEY, query].filter(Boolean)` 結構，本 task 不再發明另一套 key schema。

```js
const useFetchMacrosQuery = (options = {}) => {
  const query = options.meta?.query;
  return useQuery({
    ...options,
    queryKey: [...API_MACROS_QUERY_KEY, query].filter(Boolean),
    queryFn: async ({ signal }) => {
      const response = await axios.get(query ? 'api/macros?' + query : 'api/macros', { signal });
      return response.data;
    },
  });
};
```

- [ ] 每個 CRUD 成功後 invalidate API_MACROS_QUERY_KEY prefix；options.onSuccess 必須可共存，不能因 spread 順序蓋掉 mandatory invalidation。定義 internal onSuccess 先 await invalidation，再呼叫 caller callback，更新 Administration 原本重複 invalidation 的 consumers。
- [ ] detail query 缺 id 時 disabled；不要送 `/undefined`；logout/session 切換時 cancel/remove 舊使用者 queries，沿現有 session action 整合，禁止把 token 放 query key 或 log。
- [ ] 測試 `{records: [...]}` shape、無 options、不同 list filter key、同 key observers 共用 request、CRUD success invalidation、failure 不回報成功、signal 傳到 axios、session 切換不顯示舊資料。

```bash
yarn test:frontend --runInBand --runTestsByPath src/app/queries/__tests__/macros.test.jsx
yarn eslint
yarn build
```

## Task Q2：Macro list／CRUD／chrome

**Modify:** `src/app/widgets/Macro/index.jsx`, `Macro.jsx`, `modals/NewMacro.jsx`, `modals/EditMacro.jsx`, `modals/ConfirmDeleteMacro.jsx`；檢查 `modals/LoadMacro.jsx`, `modals/RunMacro.jsx`。
**Delete after tests:** `src/app/widgets/Macro/context.js`, `src/app/machines/index.js`。
**Create tests:** `src/app/widgets/Macro/__tests__/Macro.test.jsx`, `MacroMutations.test.jsx`。

- [ ] index 改 function + controlled chrome props；移除 interpret/start/stop、ServiceContext、僅為舊 UI 存在的 ModalProvider/ModalRoot。
- [ ] Macro 直接呼叫 shared useFetchMacrosQuery；`data.records` 是 records，不再取 Axios `data.data.records`。render 對应 `isLoading` / `isError` / empty / records。
- [ ] Refresh 改 `refetch()`，**明確選擇保留舊資料並顯示 fetching**，不再 CLEAR 整個共享 cache。初次 loading 無資料才顯示整頁 loading；背景 error 顯示錯誤但不清掉可見 records。這是有意的 UX 差異，納入測試。
- [ ] config:change listener 改 invalidate prefix；effect cleanup remove 同一 callback。多個 forked Macro 的相同資料共用 cache；為避免每個 widget 都訂閱造成多次 invalidation，在主應用程式 `src/app/containers/app/App.jsx` 內建立唯一 Macro invalidation bridge（`src/app/queries/MacroQueryEvents.jsx`），測試 mount/unmount 次數。不能放進會被 portal 再次掛載的 GlobalProvider；主 App 只掛一份，並在有效 session 下啟用。
- [ ] New/Edit/Delete 使用 shared `mutateAsync`；await success 後 close，catch 顯示既有 i18n 錯誤並留在表單，pending 時禁重複送出。不能保留現有吞 error 卻 close 的 helpers。
- [ ] 修正 EditMacro nested delete 的 onClose scope：成功只關 confirm 與 edit 各一次；取消只關 confirm；失敗兩者仍保留，input 不丟失。
- [ ] Run/Load 保持 controller 執行路徑與 gating，禁止用 queryFn 自動執行 Macro。export iframe/form download 保留傳輸機制。
- [ ] 驗證 Administration 新增/更新/刪除同步到已開啟的 widget，widget 更新也同步到 Administration；不依賴 websocket 才能刷新。
- [ ] 清空所有引用後刪 fetch machine/context，掃描所有 src 再判斷移除 `xstate` / `@xstate/react`。舊 generic useFetch/useAsync 只禁止新 server-state 使用；無關無消费者 hooks 不為本任務順便刪除。

```bash
rg -n 'createFetchMachine|fetchMacrosService|ServiceContext|@xstate/react|from .xstate' src/app
yarn test:frontend --runInBand --runTestsByPath src/app/widgets/Macro/__tests__/Macro.test.jsx src/app/widgets/Macro/__tests__/MacroMutations.test.jsx
yarn lint
yarn build
```

**Gate:** 第一個 rg 對目標 symbols 無輸出（exit 1 表示沒找到）；CRUD failure 不 close、不 retry；實際卸載不殘留 listener。沒有額外 XState consumers 才執行 `yarn remove xstate @xstate/react`。

## 其餘 HTTP 遷移的固定分工

| Resource | 所屬 task / hooks | key / payload 注意事項 |
| --- | --- | --- |
| MDI fetch / bulkUpdate | A1，`src/app/widgets/Axes/queries.js` | `['api/mdi']`；GET 與 bulk update 保留原 endpoint，讀 `res.body` 後回傳 body |
| Tool config GET / POST | A2，`src/app/widgets/Tool/queries.js` | `['api/tool']`；mutation 不覆蓋使用者正在編輯的 draft |
| Machine profiles | V1，共享 `src/app/pages/Administration/Machines/queries.js` | 沿用既有 API_MACHINES_QUERY_KEY，避免重複 cache |
| Watch directory | V1，`src/app/widgets/Visualizer/queries.js` | `['api/watch', normalizedPath]`；展開子目錄使用子 component useQuery 或 queryClient.fetchQuery，hooks 不放 callback |
| loadGCode HTTP | A3 / W1，共享 `src/app/queries/gcode.js` | useLoadGCodeMutation，variables `{ meta, context }`，mutationFn 呼叫既有 api.loadGCode(meta, context)，保留 ident |
| downloads / export | 保留傳輸；在所属 widget 驗證 | 非 cache read；form/iframe browser download 不硬包 query |
| Socket controller commands | 各 widget | 仍用 controller；不做 query、不自動 retry、不 mount 即執行 |

以上 queryFn 可先 wrap 既有 Promise transport；只有 Axios 改造能真正消耗 signal 時才宣稱 transport cancellation，不能把無法 abort 的 superagent wrapper 寫成已可取消。React Query 仍負責 cache 與 UI 狀態。

**Boundary gate:** React component 不直接 import `api`/`axios` 讀寫 server state；它 import query module 的 hook。query module 同時輸出純 transport/query-options 給 saga/bootstrap 等非 React caller，這些 caller 不能呼叫 hooks。Socket controller、browser download/export 與 authentication storage 的具體例外只限 03b 表列路徑，不能以「不是 GET」為由任意繞過 mutation。
