# Frontend Connection Runtime Plan

## Goal

Move the Connection widget's lifecycle handling from Redux actions and sagas
to one frontend-only `useConnection()` hook. Keep the existing Socket.IO
protocol and server implementation unchanged.

## Constraints

- Do not modify files under `src/server/`.
- Keep `CNCJSController.open(controllerType, connectionType, options, callback)`
  and `CNCJSController.close(callback)` unchanged.
- Do not add operation IDs, lifecycle metadata, cancellation events, or new
  Socket.IO arguments.
- Do not add Redux actions, reducers, or saga paths.
- Keep the existing Redux connection state for widgets not migrated in this
  slice.
- Use TanStack Query for serial-port and baud-rate reads.

## Design

The server owns one global physical connection. Socket.IO lifecycle events are
the source of truth for every browser client. A local timeout ends only the
caller promise; it does not cancel or invalidate the server operation.

The runtime serializes local open and close requests until each receives a
server lifecycle result or the Socket.IO session disconnects. This prevents a
second local request from treating a late callback from the first request as
its own result. A late `connection:open` event always updates the snapshot to
`connected`.

`useConnection()` is the only public frontend interface:

```js
const {
  state,
  type,
  ident,
  options,
  error,
  isOpening,
  isClosing,
  open,
  close,
  command,
  write,
  writeln,
} = useConnection();
```

## Implementation

1. Write runtime tests with Jest fake timers for open timeout, close timeout,
   late global events, duplicate local requests, lifecycle errors, and
   Socket.IO disconnect cleanup.
2. Implement the framework-independent runtime with `subscribe()` and
   `getSnapshot()`.
3. Add `useConnection()` with `useSyncExternalStore` over the singleton
   runtime.
4. Add TanStack Query hooks for `getPorts()` and `getBaudRates()`.
5. Migrate only `widgets/Connection` from Redux connection and serial-port
   actions to the hook and query hooks.
6. Run focused tests, the frontend suite, lint, and `yarn build-dev`.

## Acceptance Criteria

- No server file or Socket.IO protocol changes.
- A late server `connection:open` event changes the global frontend state to
  `connected`, even after local timeout.
- A second local open or close request is rejected while the previous request
  is unconfirmed.
- Socket.IO disconnect releases the local request guard.
- The Connection widget no longer imports Redux connection or serial-port
  actions.
- Serial-port and baud-rate reads use TanStack Query.
