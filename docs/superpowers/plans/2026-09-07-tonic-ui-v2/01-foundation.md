# 01 — Baseline 與前端驗證 Implementation Plan

> **For agentic workers:** 使用 `superpowers:executing-plans`，一次執行一個 task，以 checkbox 記錄。使用者若另行授權平行 agent，可使用 `superpowers:subagent-driven-development`。先讀 README、設計與 inventory；不要自動開始下一份計畫。

**Goal:** 建立後續遷移可依賴的版本與測試基線。

**Architecture:** 沿用現有 providers；新增獨立 frontend Jest config，避免改壞 Node/backend tests。

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


## Task F1：记录安裝、build 與既有行為

**Files:** `package.json`, `yarn.lock`, `AGENTS.md`, `src/app/index.jsx`, `src/app/lib/portal.jsx`；建立本目錄 `execution-log.md`。

- [ ] 執行以下命令並記錄實際版本、錯誤及 exit code；build/test 不通過時先分辨既有問題與本輪修改。

```bash
git status --short
yarn --version
yarn install --immutable
yarn node -p "JSON.stringify(['react','react-dom','@tonic-ui/react','@tanstack/react-query'].map(name => [name,require(name + '/package.json').version]))"
yarn lint
yarn test --runInBand
yarn build
```

- [ ] 將 React/react-dom 範圍固定在 `18.3.1`，Tonic React/hooks/icons 分別 `2.15.0` / `2.2.1` / `2.1.3`；把 React Query 從 devDependencies 移至 dependencies 並固定 `4.44.0`。保留其餘依賴，`yarn install` 更新 lock，再 `yarn install --immutable`。
- [ ] `src/app/index.jsx` 與 `src/app/lib/portal.jsx` 都用 `import { createRoot } from 'react-dom/client'`，取代從 react-dom namespace 取 createRoot；不改 render/provider 結構。
- [ ] 更新 AGENTS.md 失真的 React/Router 資訊；不更動其他工作規範。
- [ ] `yarn dev` 後量測 login、Workspace、Administration/Macros、Appearance light/dark、自訂 modal 的現有行為；截圖與錯誤清單存執行紀錄指定位置。
- [ ] 再跑 `yarn build`；交付依賴 diff 與基線紀錄。

**Gate:** 版本可重現；若尚有阻止啟動的既有錯誤，先做獨立修復 task 並記錄，不能讓後續 UI task 在無可驗證基線下開始。

## Task F2：frontend Jest harness

具體 mock/render helper/smoke tests 見 [01a](details/01a-test-harness.md)，在 F2 完成後先做 [R0 baseline](09-regression-gates.md) 再開始 UI 重構。

**Create:** `jest.frontend.config.js`, `src/app/test/setup.js`, `src/app/test/styleMock.js`, `src/app/test/fileMock.js`, `src/app/test/render.jsx`, `src/app/test/__tests__/providers.test.jsx`。
**Modify:** `package.json` 的 scripts/devDependencies。現有 package.json 的 Node Jest config 保留。
**Produces:** `yarn test:frontend`，可用 `--runInBand --runTestsByPath <path>` 跑單一 JSX 測試。

- [ ] 加入與 Jest 29 / React 18 相容的 `jest-environment-jsdom@29.7.0`、`@testing-library/react@14.3.1`、`@testing-library/user-event@14.5.2`、`@testing-library/jest-dom@6.6.3`、直接宣告 `babel-jest@29.7.0`；不升 Jest major。
- [ ] 使用以下 config 作最小起點；assets/mock 只處理實際 import 到的格式。

```js
module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/app/**/__tests__/**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.[jt]sx?$': ['babel-jest', {
      configFile: false,
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
      ],
    }],
  },
  moduleNameMapper: {
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^app/(.*)$': '<rootDir>/src/app/$1',
    '\\.(styl|css)$': '<rootDir>/src/app/test/styleMock.js',
    '\\.(png|jpe?g|gif|svg|woff2?|ttf|eot)$': '<rootDir>/src/app/test/fileMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/app/test/setup.js'],
  clearMocks: true,
  testTimeout: 10000,
};
```

- [ ] styleMock 回傳穩定 class-name Proxy；fileMock 匯出字串。setup import jest-dom，僅補測試真正需要的 matchMedia/ResizeObserver，不一律吞 console.error。
- [ ] render helper 每次測試建立新 QueryClient（retry=false）、TonicProvider，按測試需要注入 Redux store；不要在 unit test mount 真 controller connection。整合 provider test 另外使用 GlobalProvider 並 mock transport。
- [ ] providers test：render Tonic Button；click 一次 callback 一次；切換 theme 保留文字；兩個 query consumers 共用一個 client；測試卸載清除 cache。
- [ ] script 加 `"test:frontend": "jest --config jest.frontend.config.js"`；跑以下命令。

```bash
yarn test:frontend --runInBand --runTestsByPath src/app/test/__tests__/providers.test.jsx
yarn test --runInBand
yarn build
```

**Gate:** JSX/alias/Stylus imports 可測，backend test discovery 完全保留。Terra 應先將上述案例細化成實際 failing tests 再實作 harness；不能用 `--passWithNoTests` 代替成功。
