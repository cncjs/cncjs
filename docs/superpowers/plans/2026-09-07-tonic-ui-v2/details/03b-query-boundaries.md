# 03b — React Query 邊界與直接 transport 清理

**Goal:** 讓 React 畫面對 HTTP server state 一律使用 TanStack Query，同時讓 saga、登入儲存與下載等非 React 流程有明確且可稽核的出口。

**Prerequisite:** F2。先完成 B0，再開始 Q1/Q2；其餘資源跟隨各 widget task。

## 固定分層

```text
React component
  -> use<Resource>Query / use<Resource>Mutation
     -> <resource>QueryOptions / pure mutationFn
        -> existing api/axios transport

Saga/bootstrap
  -> exported pure queryFn/transport function (hooks 不可在 React 外呼叫)

Socket controller / PubSub
  -> existing realtime transport (不進 React Query)
```

- `src/app/queries/**` 放跨畫面資源；單一 widget 私有資源放 `src/app/widgets/<Widget>/queries.js`。
- query key factory、queryFn、mutationFn 是純 JavaScript exports，hook 只是很薄的 `useQuery` / `useMutation` wrapper。測試可直接驗證 transport shape，非 React caller 也能重用純函式。
- React component、page、container 不直接 import `src/app/api`、axios 或 superagent 來做 server-state GET/POST/PUT/DELETE。command handlers 也要用 `useMutation`，不能因為是按鈕觸發就繞過 Query。
- mutation 預設 `retry: false`；query retry policy 由資源 module 定義。成功 invalidation、caller callback 和 modal close 順序由 03a 固定。
- Query 只管理 HTTP server state。Redux/controller/PubSub 的即時位置、workflow、connection state 維持既有 owner。

## Task B0：建立可比較的 import baseline

**Create:** `docs/superpowers/plans/2026-09-07-tonic-ui-v2/query-boundary-baseline.md`（執行時建立）。

- [ ] 以 AST/import resolver 列出 `src/app` 對 `api`、axios、superagent、`useFetch`、`useAsync` 的所有直接 imports，欄位為 file、symbol、endpoint、read/mutation、owner、目標 task、允許例外。
- [ ] 至少核對目前已知的 `LoginPage.jsx`、Macro、Axes MDI、Tool、Visualizer machine/watch、Workspace/Autolevel loadGCode、app bootstrap saga 與 `lib/user.js`；不能只掃 widgets。
- [ ] 對每一筆指定下表分類。未知用途不能先列為例外；讀 callsite 後再決定。

```bash
rg -n "from ['\"](@app/)?api|from ['\"]axios|require\(['\"]axios|useFetch|useAsync|api\." src/app --glob '*.{js,jsx}'
```

## 允許邊界

| 類別 | 路徑／例子 | 決策 |
| --- | --- | --- |
| Query transport | `src/app/queries/**`, `src/app/widgets/*/queries.js`, Administration 暫時 re-export | 可 import api/axios；必須輸出一致 key/options 與 hooks |
| React authentication action | `src/app/containers/app/LoginPage.jsx` | 新增 `src/app/queries/session.js` 的 `useSigninMutation`；component 不再直接呼叫 `user.signin`。mutationFn 可呼叫純 `signin` 並回傳 `{ authenticated, token }` |
| Authentication storage | `src/app/lib/user.js` | 保留純 transport/token persistence，不能 import React 或 hooks；由 session mutation 與 bootstrap 呼叫 |
| App bootstrap/saga | 現有啟動 saga／session restore | 不能呼叫 hooks；重用 query module 輸出的純 fetch function。若結果也進 Query cache，由 React owner 使用 `queryClient.fetchQuery`，不要在 saga 建第二個 QueryClient |
| Browser download/export | iframe、form submit、blob save，見 Macro/Visualizer 等既有流程 | 保留既有 browser transport；它不是可 cache server state。仍要測 URL、metadata、token 與一次觸發 |
| Socket controller | `controller.command/write`, Socket.IO event | 保留；不包進 Query，精確事件與 payload 由 widget regression tests 保護 |
| Static/local data | localStorage/config、bundled JSON/assets | 不使用 Query，維持既有 owner |

`api.loadGCode` 雖然造成 domain side effect，仍由 `useLoadGCodeMutation` 包裝，因為它是 React 觸發的 HTTP mutation。Macro CRUD、Tool save、MDI bulk update 同理。

## Task B1：session 與非 React caller

**Create:** `src/app/queries/session.js`, `src/app/queries/__tests__/session.test.jsx`。
**Modify:** `src/app/containers/app/LoginPage.jsx`、實際 bootstrap/saga caller；`src/app/lib/user.js` 僅在需要抽出純函式時修改。

- [ ] `useSigninMutation` 使用 `useMutation({ mutationFn: signin, retry: false })`；LoginPage 以 `mutateAsync` 保留原 authenticated/error/navigation 流程，pending 時禁止重送。
- [ ] 登出成功後先 cancel active queries，再 clear/remove session-scoped cache；不能讓上一使用者資料閃現。不要把 access token放 query key、DOM、錯誤訊息或 execution log。
- [ ] bootstrap caller 重用純 fetch 函式；禁止在 saga 裡呼叫 hook。測 sign-in success/failure、double submit、logout cache、bootstrap 一次請求。

## Task B2：資源逐批搬移

依父計畫執行，不另建巨型 Query PR：

1. Q1/Q2：Macro list/detail/CRUD 與 `createFetchMachine`。
2. A1/A2：MDI、Tool GET/POST，server data 與 form draft 分開。
3. A3/W1：共享 `useLoadGCodeMutation`。
4. V1：Machines 共用 cache、WatchDirectory path keys。
5. 其餘 B0 清單：在擁有該 UI flow 的 widget/page task 處理。

每一批都測 query key、response shape、mutation variables、error UI、invalidation、unmount/abort。無法實際 abort 的 transport 只能記為「ignore late result」，不能宣稱支援 cancellation。

## Task B3：靜態 gate

**Modify:** W3 的 `scripts/check-ui-migration.js` 與 fixtures。

- [ ] AST rule 禁止 `src/app/widgets/**`、`src/app/pages/**`、`src/app/containers/**`（query module 除外）直接 import HTTP transport。
- [ ] allowlist 使用完整檔案路徑與理由；只允許上表的 `lib/user.js`、bootstrap/saga、browser download helpers、query modules。禁止 wildcard directory allowlist。
- [ ] fixture 至少包含 alias import、relative import、barrel re-export、合法 query module、合法 controller command、非法 component mutation。
- [ ] 最終 baseline 每一筆要變成 query module或表列例外；`createFetchMachine`、`fetchMacrosService`、React component 內直接 server-state transport 為零。

```bash
yarn check:ui-migration
yarn test:frontend --runInBand
yarn lint
yarn build
```

**Gate:** React UI 所有 HTTP read/mutation 都能從 component → hook → pure transport 追蹤；非 React caller 沒有違反 Hooks 規則；例外清單沒有未具名檔案。
