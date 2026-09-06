# 01a — 可直接起跑的前端測試工具 Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans` 逐 task 執行。先讀上層 README 與設計。此文件是指定父 task 的細化版，介面以本文件為準；不授權平行 agents、不自動跳階段。

**Goal:** 細化 F2，提供不連真機器、可驗證 Query/Tonic 的最小測試骨架。

**Architecture:** 獨立 frontend Jest config 保留 Node tests；mock assets 是測試環境需求，controller/Query mocks 由個別 suite 明確定義。

**Tech Stack:** JavaScript/JSX、React 18.3.1、Tonic 2.15.0、Query 4.44.0、Jest 29、Stylus。

**Spec:** [設計](../00-design.md)；[父計畫](../01-foundation.md)。

## Global Constraints

- 不新增 TypeScript/CSS modules/Sass；自訂樣式用 Stylus，Tonic props 照 API。
- 不升 React/Query/Three.js major；所有使用者文字含 aria-label 用 i18next。
- React components 最終全部 function；DOM／非 React engine refs 可以保留，禁止用 imperative component API 重建 class instance。
- HTTP server state 用 Query；controller 指令不放 render/reducer/queryFn，不自動 retry。
- 先建立測試，再實作；本文件的程式碼是待實作內容，不代表已寫入 src 或已通過 repo tests。
- 每個可交付 task 完成後記錄命令與結果，保留獨立 diff；未得到提交授權不自行提交。


## Task H1：安裝、config、mock 檔案

沿父計畫 F2 的 exact package versions/config，不改 Node Jest config。建立以下三個檔案。

`src/app/test/styleMock.js`：

```js
const names = new Proxy({}, {
  get: (target, key) => (typeof key === 'string' ? key : undefined),
});
module.exports = { __esModule: true, default: names };
```

`src/app/test/fileMock.js`：

```js
module.exports = 'test-file-stub';
```

`src/app/test/setup.js`：

```js
import '@testing-library/jest-dom';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
```

- [ ] ResizeObserver、canvas、URL.createObjectURL 若特定元件需要，在該 suite 補最小 mock；不要一開始全域回傳假成功。
- [ ] Babel config 採父計畫 transform；若實際來源使用 Emotion css prop，對該 config 加 `importSource:'@emotion/react'`，測 Tonic smoke 行為與 className，不啟動完整 app Babel plugins。
- [ ] 使用 `yarn test:frontend --listTests` 確認只選 src/app tests；`yarn test --listTests` 原本 server/simulator discovery 不變。

## Task H2：Query/Tonic render helper 與真正 smoke tests

`src/app/test/render.jsx`：

```jsx
import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TonicProvider } from '@tonic-ui/react';

export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false, cacheTime: 0 },
    mutations: { retry: false },
  },
});

export const createTestWrapper = (client) => {
  return function TestProviders({ children }) {
    return (
      <QueryClientProvider client={client}>
        <TonicProvider>{children}</TonicProvider>
      </QueryClientProvider>
    );
  };
};

export const renderAppUI = (ui, options = {}) => {
  const client = createTestQueryClient();
  const result = render(ui, { wrapper: createTestWrapper(client), ...options });
  return {
    ...result,
    queryClient: client,
    dispose: () => {
      result.unmount();
      client.clear();
    },
  };
};
```

不能隱式用 global app QueryClient，否則 tests 間互相污染。Redux store／i18next／WidgetProvider 由需要它們的 suite 在 wrapper 內加入；不把真 controller boot import 進每個 test。

`src/app/test/__tests__/providers.test.jsx`：

```jsx
import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@tonic-ui/react';
import { renderAppUI } from '../render';

test('Tonic Button invokes its action once', async () => {
  const onClick = jest.fn();
  const view = renderAppUI(<Button onClick={onClick}>Apply</Button>);
  try {
    await userEvent.setup().click(screen.getByRole('button', { name: 'Apply' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  } finally {
    view.dispose();
  }
});
```

fixture 文字可固定英文，產品文字一樣走 i18n。此 smoke test 不取代 09 的 domain regression。

Run: `yarn test:frontend --runInBand --runTestsByPath src/app/test/__tests__/providers.test.jsx`。

## Task H3：strict mode 與 listener 計數工具

**Create:** `src/app/test/deferred.js`；事件 mock 在各 suite 自行建立 EventEmitter，避免造跨產品的 fake controller 框架。

```js
export default function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
```

- [ ] deferred 用於 Query pending、兩個 asset completion、Save failure；測試自己 resolve/reject 並 await，不用真 sleep。
- [ ] StrictMode wrapper 在 lifecycle tests 明確 `<React.StrictMode>`；不全面開啟後把所有 double-call 當 app bug，也不以「StrictMode 會雙跑」掩蓋沒有 cleanup。
- [ ] 檢查測試結束無 unhandled rejection／open handles；遇到 infinite RAF 禁用 runAllTimers，使用 09 的手動 scheduler。
- [ ] 每個 changed suite 先單跑，再完整 frontend suite，最後 Node tests/build。純文件細化階段不安裝 packages 或啟動 dev server。
