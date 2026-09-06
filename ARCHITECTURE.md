# Architecture

This document describes the architecture of **switcher-client-js**, from the public API surface down to
low-level implementation details. It complements the [README](./README.md), which focuses on usage.

## Table of Contents

- [1. Overview](#1-overview)
- [2. API-First Design](#2-api-first-design)
  - [2.1 Client — Global Facade](#21-client--global-facade)
  - [2.2 Switcher — Fluent Evaluation Object](#22-switcher--fluent-evaluation-object)
  - [2.3 SwitcherResult](#23-switcherresult)
- [3. Execution Modes](#3-execution-modes)
- [4. High-Level Architecture](#4-high-level-architecture)
- [5. Software Design Patterns](#5-software-design-patterns)
- [6. Module Structure (Low-Level)](#6-module-structure-low-level)
  - [6.1 `src/client.js`](#61-srcclientjs)
  - [6.2 `src/switcher.js`, `switcherBuilder.js`, `switcherRequest.js`](#62-srcswitcherjs-switcherbuilderjs-switcherrequestjs)
  - [6.3 `src/lib/resolver.js` — Local Criteria Engine](#63-srclibresolverjs--local-criteria-engine)
  - [6.4 `src/lib/snapshot.js` — Domain Model & Strategy Operations](#64-srclibsnapshotjs--domain-model--strategy-operations)
  - [6.5 `src/lib/remote.js` & `remoteAuth.js` — Remote API Layer](#65-srclibremotejs--remoteauthjs--remote-api-layer)
  - [6.6 `src/lib/globals/*` — Shared Mutable State](#66-srclibglobals--shared-mutable-state)
  - [6.7 `src/lib/bypasser/*` — Test Stubbing](#67-srclibbypasser--test-stubbing)
  - [6.8 `src/lib/utils/*` — Cross-Cutting Utilities](#68-srclibutils--cross-cutting-utilities)
  - [6.9 `src/lib/exceptions/index.js` — Error Taxonomy](#69-srclibexceptionsindexjs--error-taxonomy)
- [7. Request Lifecycle (Sequence)](#7-request-lifecycle-sequence)
- [8. Concurrency & Background Work](#8-concurrency--background-work)
- [9. Extensibility Notes](#9-extensibility-notes)

---

## 1. Overview

Switcher Client JS is a feature-flag SDK that evaluates **Switchers** (feature flags with optional
strategy-based criteria) either against the **Switcher API** (remote), a **local snapshot** (zero
latency), or a **hybrid** combination of both with an automatic **circuit breaker** (silent mode).

The library is distributed as a single ES module (`type: "module"` in `package.json`) with a small,
static entry point (`switcher-client.js`) re-exporting four public symbols: `Client`, `Switcher`,
`SwitcherResult`, and `StrategiesType`. Everything else under `src/` is internal implementation detail.

## 2. API-First Design

The public API is intentionally small and split into two responsibilities: **context/session management**
(`Client`) and **feature evaluation** (`Switcher`). This mirrors the README's feature set one-to-one:

| README Feature | API Surface |
|---|---|
| Initialize context / configure options | `Client.buildContext(context, options)` |
| Get a switcher instance | `Client.getSwitcher(key?)` |
| Sync/async evaluation | `switcher.isItOn()`, `isItOnBool()`, `isItOnDetail()`, `detail().isItOn()` |
| Strategy validation (fluent input) | `switcher.checkValue()`, `checkNetwork()`, `checkDate()`, `checkTime()`, `checkRegex()`, `checkNumeric()`, `checkPayload()`, `prepare(key)` |
| Throttling | `switcher.throttle(ms)`, `Client.subscribeNotifyError()`, `switcher.flushExecutions()` |
| Hybrid mode | `switcher.remote()` |
| Circuit breaker / silent mode | `options.silentMode`, handled transparently by `Auth` |
| Built-in stub / test mode | `Client.assume(key)`, `Client.forget(key)`, `Client.testMode()` |
| Smoke testing | `Client.checkSwitchers(keys)` |
| Snapshot management | `Client.loadSnapshot()`, `checkSnapshot()`, `watchSnapshot()`, `unloadSnapshot()`, `scheduleSnapshotAutoUpdate()`, `terminateSnapshotAutoUpdate()` |

### 2.1 Client — Global Facade

`Client` (`src/client.js`) is a **static facade** (no instances) acting as the single entry point for
context configuration, snapshot lifecycle, and switcher instantiation. It owns process-wide singletons:
a `Map` of persisted `Switcher` instances (keyed by switcher key) and a `SnapshotWatcher`. All other
shared state (auth token, options, snapshot data) is delegated to dedicated static holder classes under
`src/lib/globals/`.

### 2.2 Switcher — Fluent Evaluation Object

`Switcher` (`src/switcher.js`) is the object returned by `Client.getSwitcher()`. It builds on a
three-tier class chain:

```
Switcher extends SwitcherRequest extends SwitcherBuilder
```

- **`SwitcherBuilder`** — holds mutable evaluation state (`_key`, `_input`, `_delay`, `_defaultResult`,
  `_forceRemote`, `_showDetail`, `_restrictRelay`) and exposes the **fluent/builder API**
  (`checkValue`, `checkNetwork`, `throttle`, `remote`, `detail`, `defaultResult`, `restrictRelay`,
  `resetInputs`). Every method returns `this` to support chaining.
- **`SwitcherRequest`** — a thin read-only view (`key`, `input`, `isRelayRestricted` getters) consumed
  by the resolver so evaluation logic never touches builder internals directly.
- **`Switcher`** — adds the actual evaluation behavior (`isItOn`, `isItOnBool`, `isItOnDetail`, `prepare`,
  `validate`, throttling/caching, error fallback).

This separation keeps "building a request" (fluent configuration) decoupled from "executing a request"
(evaluation strategy), enabling the resolver and remote layer to depend only on the narrow
`SwitcherRequest` contract.

### 2.3 SwitcherResult

`SwitcherResult` (`src/lib/result.js`) is an immutable value object (`result`, `reason`, `metadata`)
returned whenever `.detail()`/`isItOnDetail()` is used, and unwrapped to a plain `boolean` otherwise via
`Switcher.#transformResult`. It is constructed through named static factories (`enabled()`, `disabled()`,
`create()`) instead of exposing a public constructor contract, keeping result-creation semantics uniform
across the local resolver, remote layer, and bypasser.

## 3. Execution Modes

The SDK supports four evaluation modes, all funneled through `Switcher#isItOn` → `#submit`:

1. **Remote** — default; calls the Switcher API (`executeRemoteCriteria`) using a short-lived JWT
   obtained via `Auth`.
2. **Local** — `options.local = true`; evaluates entirely against an in-memory/snapshot-file domain via
   `executeLocalCriteria` → `resolver.js`. No network calls.
3. **Hybrid** — local mode with a per-call `switcher.remote()` override, forcing that specific
   evaluation to hit the API (e.g., for Relay-backed strategies) while the rest of the app stays local.
4. **Silent Mode (circuit breaker)** — `options.silentMode` configured; when remote calls fail, `Auth`
   issues a synthetic `'SILENT'` token with an expiry window (parsed from strings like `'5m'`), during
   which evaluations transparently fall back to the local snapshot. Once the window elapses, health is
   rechecked (`Auth.checkHealth`) and remote mode resumes automatically if the API is back.

Throttling is an orthogonal, cross-cutting concern: `switcher.throttle(ms)` caches the last
`SwitcherResult` (via `ExecutionLogger`) and refreshes it asynchronously in the background
(`scheduleBackgroundRefresh`, via `queueMicrotask`) rather than blocking the caller, so hot code paths
get zero-latency reads with eventual consistency.

This is a **Stale-While-Revalidate (SWR)** strategy: `Switcher#isItOn` always returns the cached
(potentially stale) `SwitcherResult` immediately when a throttle window is active
(`#tryCachedResult`), while `scheduleBackgroundRefresh` concurrently kicks off a non-blocking
revalidation (`#submit()` executed in a `queueMicrotask`) once `_nextRefreshTime` has elapsed. The
refreshed value replaces the cached entry in `ExecutionLogger` for subsequent calls, but the caller
that triggered the refresh never waits on it — trading strict consistency for zero-latency reads,
exactly like the HTTP `Cache-Control: stale-while-revalidate` semantics. Errors surfaced during the
background revalidation do not propagate to the caller; they are routed to `#notifyError` and
surfaced only via `Client.subscribeNotifyError`.

## 4. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Public API (index)                          │
│                switcher-client.js → Client, Switcher,               │
│                    SwitcherResult, StrategiesType                   │
└───────────────┬───────────────────────────────────┬─────────────────┘
                │                                    │
        ┌───────▼────────┐                  ┌────────▼─────────┐
        │  Client (facade)│                  │ Switcher (builder/│
        │  src/client.js  │◄────getSwitcher──┤ request/execution)│
        └───────┬─────────┘                  └────────┬──────────┘
                │                                      │
   ┌────────────┼─────────────────┐          ┌─────────┼─────────────┐
   │            │                 │          │         │             │
┌──▼───┐   ┌────▼─────┐    ┌──────▼───┐  ┌────▼───┐ ┌───▼────┐  ┌─────▼─────┐
│Global │   │ Snapshot │    │ Snapshot │  │Bypasser│ │Resolver│  │Execution  │
│Options│   │ (load/   │    │ Watcher  │  │(stub/  │ │(local  │  │Logger     │
│/Auth/ │   │ validate)│    │(fs watch)│  │assume) │ │criteria│  │(throttle  │
│Snapshot│  └────┬─────┘    └──────────┘  └────────┘ │engine) │  │ cache)    │
└───────┘        │                                    └───┬────┘  └───────────┘
                  │                                        │
           ┌──────▼───────┐                        ┌───────▼──────┐
           │ Remote / Auth│◄───────────────────────┤ GlobalSnapshot│
           │ (fetch layer)│    checkCriteria/        (in-memory     │
           │              │    resolveSnapshot       domain data)  │
           └──────┬───────┘                        └───────────────┘
                  │
           ┌──────▼───────┐
           │ Switcher API  │
           │ (external)    │
           └───────────────┘
```

Cross-cutting utilities (`src/lib/utils/*`) — regex-safe matching (`timed-match`), CIDR checks
(`ipcidr`), date/time comparisons (`datemoment`), JSON payload traversal (`payloadReader`), the fetch
wrapper (`fetchFacade`), and the auto-update scheduler — are consumed by the resolver, remote, and
client layers respectively.

## 5. Software Design Patterns

- **Facade** — `Client` hides subsystem complexity (auth, snapshot loading, watchers, bypasser) behind a
  small static API.
- **Builder / Fluent Interface** — `SwitcherBuilder` lets callers compose an evaluation request
  (`checkValue().checkNetwork().throttle().isItOn()`) incrementally, mutating internal state and
  returning `this`.
- **Template/Strategy-like dispatch** — `resolver.js` and `snapshot.js` use `switch`-based dispatch
  (`processOperation`, `resolveCriteria` → `checkGroup` → `checkConfig` → `checkStrategy`) that mirrors a
  Chain-of-Responsibility: each level short-circuits with a `SwitcherResult.disabled(...)` reason before
  delegating to the next.
- **Singleton / Static Registry** — `GlobalAuth`, `GlobalOptions`, `GlobalSnapshot` are static classes
  holding process-wide state, avoiding the need to thread configuration through every call. `Client`
  keeps a `Map` singleton of persisted `Switcher` instances so repeated `getSwitcher('KEY')` calls reuse
  the same fluent object (and its cached throttle state).
- **Factory Method** — `SwitcherResult.create/enabled/disabled` and `Bypasser.assume(key)` (returning a
  chainable `Key`) construct pre-configured objects instead of exposing raw constructors.
- **Decorator-like wrapping** — `ExecutionLogger.add` wraps a raw `SwitcherResult` with a `cached: true`
  metadata flag without altering the original evaluation logic.
- **Circuit Breaker** — `Auth` implements the classic circuit-breaker state machine: healthy (real JWT)
  → open/silent (`'SILENT'` token with TTL) → half-open (`checkHealth` probes `/check`) → closed (`auth()`
  restores a real token).
- **Observer/Callback** — `Client.subscribeNotifyError`, `watchSnapshot({ success, reject })`, and
  `scheduleSnapshotAutoUpdate({ success, reject })` use callback-based event notification rather than
  EventEmitter, keeping the dependency surface minimal.

## 6. Module Structure (Low-Level)

```
src/
├── client.js                 Client facade (context, snapshot lifecycle, switcher registry)
├── switcher.js               Switcher: evaluation/execution logic
├── switcherBuilder.js        SwitcherBuilder: fluent configuration API
├── switcherRequest.js        SwitcherRequest: read-only accessor layer
└── lib/
    ├── constants.js          Default option values & option-key enum
    ├── result.js             SwitcherResult value object
    ├── resolver.js           Local criteria evaluation engine
    ├── snapshot.js           Domain model helpers + strategy/operation processors
    ├── snapshotWatcher.js    fs.watchFile-based snapshot reload
    ├── remote.js             Switcher API HTTP client (fetch wrapper calls)
    ├── remoteAuth.js         Auth: token lifecycle & circuit breaker (silent mode)
    ├── bypasser/             Stub/assume test-double implementation
    │   ├── index.js          Bypasser registry (assume/forget/search)
    │   ├── key.js            Key: per-switcher forced result + conditions
    │   └── criteria.js       Criteria: "when" strategy conditions for stubs
    ├── exceptions/
    │   └── index.js          ClientError / RemoteError / CheckSwitcherError
    ├── globals/
    │   ├── globalAuth.js     Static holder: url/token/exp
    │   ├── globalOptions.js  Static holder: all SwitcherOptions
    │   └── globalSnapshot.js Static holder: in-memory snapshot/domain
    └── utils/
        ├── index.js                get() null-coalescing helper
        ├── fetchFacade.js          Runtime-agnostic fetch resolution (Node/Bun/Workers)
        ├── datemoment.js           Minimal date comparison helper (DATE/TIME strategies)
        ├── ipcidr.js               CIDR range matching (NETWORK strategy)
        ├── payloadReader.js        JSON key-path extraction (PAYLOAD strategy)
        ├── executionLogger.js      In-memory cache of last executions (throttle + Client.getLogger)
        ├── snapshotAutoUpdater.js  setInterval-based scheduler for checkSnapshot()
        └── timed-match/
            ├── index.js            TimedMatch: worker-thread-guarded regex matching (regexSafe)
            ├── match.js            Direct (non-worker) regex evaluation
            └── match-proc.js       Worker-thread entry point running match.js
```

### 6.1 `src/client.js`

- Owns `#context` (domain/component/environment/apiKey/url), `#switchers` (persisted instance cache),
  `#testEnabled`, and a `SnapshotWatcher` instance.
- `buildContext(context, options)` resets `GlobalSnapshot`, initializes `GlobalOptions` with defaults
  from `constants.js`, initializes `Auth`, then dispatches `options` through a **handler map**
  (`#buildOptions`) keyed by `SWITCHER_OPTIONS` constants — an extensible alternative to a long
  `if/else` chain when adding new options.
  - This handler-map pattern (`{ [OPTION_KEY]: (val) => ... }` iterated via
    `Object.entries(options)`) is a recurring convention in this codebase for dispatching on config
    keys; follow it when adding new `SwitcherOptions`.
- `getSwitcher(key)` returns a cached instance from `#switchers` if present, otherwise constructs a new
  `Switcher`, applies `restrictRelay(GlobalOptions.restrictRelay)`, and persists it only if `key` is
  provided (non-persisted/anonymous switchers are not cached).
- Snapshot methods (`loadSnapshot`, `checkSnapshot`, `watchSnapshot`, `unloadSnapshot`,
  `scheduleSnapshotAutoUpdate`) coordinate `GlobalSnapshot`, `snapshot.js` helpers, and
  `SnapshotAutoUpdater`.

### 6.2 `src/switcher.js`, `switcherBuilder.js`, `switcherRequest.js`

- `isItOn(key)` is the core entry point: checks `Bypasser` first (test stubs win over everything),
  then a throttle cache (`#tryCachedResult`), then falls through to `#submit()`.
- `#submit()` branches on `GlobalOptions.local`/`_forceRemote` to choose `executeLocalCriteria()` vs.
  `validate()` → `executeRemoteCriteria()`; remote failures trigger silent-mode fallback
  (`Auth.updateSilentToken()` + `executeLocalCriteria()`) or default-result fallback
  (`#getDefaultResultOrThrow`).
- `scheduleBackgroundRefresh()` uses `queueMicrotask` to refresh a throttled result without blocking the
  caller, guarded by `_nextRefreshTime` to avoid overlapping refreshes.
- `isItOnBool`/`isItOnDetail` normalize an overloaded signature (`(key?, forceAsync?)`) where a boolean
  first argument is reinterpreted as `forceAsync`, enabling both sync (local) and async (remote) call
  styles from the same method.

### 6.3 `src/lib/resolver.js` — Local Criteria Engine

Pure-function evaluation pipeline over a snapshot domain, mirroring the server-side authorization
hierarchy: **Domain → Group → Config → Strategy**. Each level can short-circuit with a disabled
`SwitcherResult` and a human-readable `reason` (`'Domain disabled'`, `'Group disabled'`,
`'Config disabled'`, `'Config has Relay enabled'`, `'Strategy '<x>' does not agree'`). `checkConfig` also
enforces **Relay restriction**: if a config has an activated Relay and the switcher instance is
relay-restricted (default), local evaluation refuses to proceed — this is what makes Hybrid Mode
(`switcher.remote()`) necessary for Relay-backed switchers in local mode.

### 6.4 `src/lib/snapshot.js` — Domain Model & Strategy Operations

Two responsibilities live here intentionally close together:
1. **Snapshot I/O** — `loadDomain` (reads/creates `<snapshotLocation>/<environment>.json`),
   `validateSnapshot` (calls remote `checkSnapshotVersion`/`resolveSnapshot`), `checkSwitchersLocal`
   (smoke test against local data).
2. **Strategy/Operation processors** — `StrategiesType` and `OperationsType` enums plus
   `processOperation`, dispatching to one `process<STRATEGY>` function per strategy
   (NETWORK/VALUE/NUMERIC/TIME/DATE/REGEX/PAYLOAD). Each processor implements only the `OperationsType`
   values meaningful to it (e.g., NETWORK only supports EXIST/NOT_EXIST via CIDR or exact match; NUMERIC
   adds BETWEEN/GREATER/LOWER via string comparison).

### 6.5 `src/lib/remote.js` & `remoteAuth.js` — Remote API Layer

- `remote.js` is a stateless collection of exported functions wrapping `FetchFacade.fetch` calls to the
  Switcher API REST/GraphQL endpoints (`/criteria/auth`, `/criteria`, `/criteria/switchers_check`,
  `/criteria/snapshot_check/:version`, `/graphql` for `resolveSnapshot`). All HTTP errors are normalized
  through `errorHandler`, which wraps non-`ClientError` exceptions in `RemoteError`.
- `Auth` is the only class-based module here: it manages token acquisition (`auth()`), automatic
  background refresh scheduling (`#scheduleNextAuth`, refreshing ~5s before expiry when
  `autoRefreshToken` is enabled), and the **silent-mode circuit breaker**
  (`updateSilentToken`/`checkHealth`/`isTokenExpired`) described in §3.

### 6.6 `src/lib/globals/*` — Shared Mutable State

Three static classes act as the SDK's process-wide state container, replacing what would otherwise be a
context object threaded through every function call:
- `GlobalAuth` — `url`, `token`, `exp`.
- `GlobalOptions` — the fully-resolved `SwitcherOptions`, merged incrementally via `updateOptions`.
- `GlobalSnapshot` — the currently loaded snapshot/domain JSON.

Because these are static, calling `Client.buildContext()` again fully resets application state — useful
for tests, but callers should be aware there is a single global context per process (no multi-tenant
context isolation within one process).

### 6.7 `src/lib/bypasser/*` — Test Stubbing

`Bypasser` maintains a module-level `bypassedKeys` array (not exposed on `Client` directly) checked first
by `Switcher.isItOn` before any local/remote evaluation. `Key.when(strategy, input)` returns a `Criteria`
that supports chaining `.and(strategy, input)` for multi-condition stubs; `Key#getResponse` inverts the
forced result when the actual call input doesn't match the configured criteria, and always returns a
regular `SwitcherResult` so downstream code paths are indistinguishable from real evaluations.

### 6.8 `src/lib/utils/*` — Cross-Cutting Utilities

- `fetchFacade.js` — resolves whichever `fetch` implementation is available (Node global fetch,
  Bun, Cloudflare Workers), keeping `remote.js` runtime-agnostic per the README's multi-runtime claim.
- `timed-match/` — implements `regexSafe` protection: regex evaluation optionally runs in a
  `node:worker_threads` `Worker` with a `SharedArrayBuffer` + `Atomics.wait` for synchronous timeout
  enforcement, and blacklists patterns/inputs that repeatedly time out (`regexMaxBlackList`,
  `regexMaxTimeLimit`), directly implementing the README's ReDoS protection.
- `datemoment.js` / `ipcidr.js` / `payloadReader.js` — small, dependency-free helpers backing the
  DATE/TIME, NETWORK, and PAYLOAD strategies respectively (no external date/CIDR libraries are used).
- `executionLogger.js` — module-level `logger` array acting as an LRU-less cache keyed by
  `(key, input)`; backs both throttling (`Switcher#tryCachedResult`) and the public
  `Client.getLogger`/`getExecution` introspection API.
- `snapshotAutoUpdater.js` — thin `setInterval` wrapper used by `Client.scheduleSnapshotAutoUpdate`.

### 6.9 `src/lib/exceptions/index.js` — Error Taxonomy

A minimal 3-class hierarchy: `ClientError` (base, prefixes messages with `"Something went wrong: "`),
`RemoteError` (network/HTTP failures), `CheckSwitcherError` (smoke-test failures, carries the list of
not-found switcher keys). All are thrown as regular `Error` subclasses (no custom error codes), and
`Switcher.#getDefaultResultOrThrow` is the single place where a caller-supplied `defaultResult` can
suppress any of these exceptions.

## 7. Request Lifecycle (Sequence)

```
Client.getSwitcher('FEATURE01')
        │
        ▼
switcher.checkValue('U1').throttle(1000).isItOn()
        │
        ▼
 Bypasser.searchBypassed(key) ──found──► Key.getResponse(input) ──► SwitcherResult
        │ not found
        ▼
 #tryCachedResult() ──hit──► cached SwitcherResult (+ background refresh via queueMicrotask)
        │ miss
        ▼
 #submit()
        │
   ┌────┴─────────────────────┐
   │ local mode?               │ remote/hybrid
   ▼                           ▼
executeLocalCriteria()    validate() → Auth.auth() (if needed)
   │                           │
   ▼                     token === 'SILENT'?
resolver.resolveCriteria        │yes            │no
(Domain→Group→Config→Strategy)  ▼               ▼
   │                    executeLocalCriteria  executeRemoteCriteria → remote.checkCriteria (HTTP)
   ▼                           │                    │
SwitcherResult ◄───────────────┴────────────────────┘
   │
   ▼
ExecutionLogger.add(...)  (if logger enabled)
   │
   ▼
#transformResult() → boolean or SwitcherResult (per .detail())
```

Errors raised anywhere in this pipeline are routed through `#notifyError` (→
`ExecutionLogger.notifyError` → subscriber set via `Client.subscribeNotifyError`), and, if
`silentMode` is configured, trigger a fallback to `executeLocalCriteria()` instead of propagating.

## 8. Concurrency & Background Work

- **Token refresh** — `Auth.#scheduleNextAuth` uses `setTimeout` to proactively refresh the JWT ~5s
  before expiry when `autoRefreshToken` is enabled, stopping automatically on failure
  (`terminateAutoRefresh`).
- **Throttled refresh** — `Switcher.scheduleBackgroundRefresh` uses `queueMicrotask` (not `setTimeout`)
  so the refresh runs after the current synchronous call returns but before the next I/O tick, without
  introducing a timer.
- **Snapshot auto-update** — `SnapshotAutoUpdater` wraps a single-instance `setInterval`, always
  clearing any previous interval before scheduling a new one (`schedule` calls `terminate()` first).
- **Snapshot file watching** — `SnapshotWatcher` uses `node:fs`'s `watchFile`/`unwatchFile` (polling-based),
  guarding against duplicate reloads via a `ctime` comparison.
- **Regex timeout enforcement** — `TimedMatch` uses a dedicated `Worker` thread with
  `Atomics.wait`/`SharedArrayBuffer` to synchronously bound regex execution time from the calling
  thread's perspective, without relying on cooperative cancellation inside the regex engine itself.

## 9. Extensibility Notes

- **New strategy type**: add a value to `StrategiesType` (`snapshot.js`), a `check<Name>()` method to
  `SwitcherBuilder`, and a `process<NAME>` function wired into `processOperation`'s `switch`.
- **New client option**: add a default to `constants.js`, a key to `SWITCHER_OPTIONS`, a getter to
  `GlobalOptions`, and a handler entry in `Client.#buildOptions`'s `optionsHandler` map.
- **New remote endpoint**: add an exported function to `remote.js` following the existing
  fetch-then-`errorHandler` pattern, keeping HTTP concerns out of `client.js`/`switcher.js`.
