***

<div align="center">
<b>Switcher Client SDK</b><br>
A JavaScript SDK for Switcher API
</div>

<div align="center">

[![Master CI](https://github.com/switcherapi/switcher-client-js/actions/workflows/master.yml/badge.svg)](https://github.com/switcherapi/switcher-client-js/actions/workflows/master.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=switcherapi_switcher-client-master&metric=alert_status)](https://sonarcloud.io/dashboard?id=switcherapi_switcher-client-master)
[![npm version](https://badge.fury.io/js/switcher-client.svg)](https://badge.fury.io/js/switcher-client)
[![install size](https://packagephobia.com/badge?p=switcher-client)](https://packagephobia.com/result?p=switcher-client)
[![Known Vulnerabilities](https://snyk.io/test/github/switcherapi/switcher-client-js/badge.svg?targetFile=package.json)](https://snyk.io/test/github/switcherapi/switcher-client-js?targetFile=package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Slack: Switcher-HQ](https://img.shields.io/badge/slack-@switcher/hq-blue.svg?logo=slack)](https://switcher-hq.slack.com/)

</div>

***

![Switcher API: JavaScript Client: Cloud-based Feature Flag API](https://github.com/switcherapi/switcherapi-assets/blob/master/logo/switcherapi_js_client.png)

## Table of Contents

- [About](#-about)
- [Quick Start](#-quick-start)
- [Installation & Setup](#️-installation--setup)
  - [Installation](#installation)
  - [Basic Configuration](#basic-configuration)
  - [Advanced Options](#advanced-options)
- [Usage Examples](#usage-examples)
  - [Basic Usage](#basic-usage)
  - [Strategy Validation](#strategy-validation)
  - [Throttling](#throttling)
  - [Hybrid Mode](#hybrid-mode)
- [Testing Features](#testing-features)
  - [Built-in Stub Feature](#built-in-stub-feature)
  - [Test Mode](#test-mode)
  - [Smoke Testing](#smoke-testing)
- [Snapshot Management](#snapshot-management)
  - [Loading Snapshots](#loading-snapshots)
  - [Watching for Changes](#watching-for-changes)
  - [Version Checking](#version-checking)
  - [Auto-Update Scheduler](#auto-update-scheduler)

---

## About

**Switcher Client JS** is a feature-rich SDK for integrating [Switcher API](https://github.com/switcherapi/switcher-api) into your JS-based applications (Web, Node.js, Bun, Cloudflare Workers). It provides robust feature flag management with enterprise-grade capabilities.

### Key Features

- 🚀 **Zero Latency**: Local mode with snapshot files or in-memory for instant feature flag resolution
- 🔄 **Hybrid Configuration**: Silent mode with automatic fallback handling
- 🧪 **Testing Ready**: Built-in stub implementation for comprehensive testing
- ⚡ **Performance Optimized**: Throttling optimizes remote API calls to reduce bottlenecks in critical code paths
- 🛠️ **Developer Tools**: Runtime snapshot updates without app restart and automatic sync with remote API

---

## Quick Start

Get up and running with Switcher Client in 3 simple steps:

```bash
npm install switcher-client
```

```js
import { Client } from 'switcher-client';

// 1. Initialize the client
Client.buildContext({
  url: 'https://api.switcherapi.com',
  apiKey: '[YOUR_API_KEY]',
  domain: 'My Domain',
  component: 'MyApp',
  environment: 'default'
});

// 2. Get a switcher instance
const switcher = Client.getSwitcher();

// 3. Check if a feature is enabled
const isFeatureEnabled = await switcher.isItOn('FEATURE01');
console.log('Feature enabled:', isFeatureEnabled);
```

---

## Installation & Setup

### Installation

```bash
npm install switcher-client
```

### Basic Configuration

The context properties store all information regarding connectivity:

```js
import { Client } from 'switcher-client';

// Required configuration
const config = {
  apiKey: '[API_KEY]',                // Switcher-API key for your component
  environment: 'default',             // Environment name ('default' for production)
  domain: 'My Domain',                // Your domain name
  component: 'MyApp',                 // Your application name
  url: 'https://api.switcherapi.com'  // Switcher-API endpoint (optional)
};

Client.buildContext(config);
const switcher = Client.getSwitcher();
```

#### Configuration Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | ✅ | Your Switcher domain name |
| `url` | string | | Switcher API endpoint |
| `apiKey` | string | | API key for your component |
| `component` | string | | Your application name |
| `environment` | string | | Environment name (default: 'default' for production) |

### Advanced Options

Configure additional features for enhanced functionality:

```ts
Client.buildContext({ 
  url, apiKey, domain, component, environment 
}, {
  local: true,                          // Enable local mode
  freeze: false,                        // Prevent background updates
  logger: true,                         // Enable request logging
  snapshotLocation: './snapshot/',      // Snapshot files directory
  snapshotAutoUpdateInterval: 300,      // Auto-update interval (seconds)
  snapshotWatcher: true,                // Monitor snapshot changes
  silentMode: '5m',                     // Fallback timeout
  restrictRelay: true,                  // Relay restrictions in local mode
  regexSafe: true,                      // Prevent reDOS attacks
  certPath: './certs/ca.pem'            // SSL certificate path
});
```

#### Options Reference

| Option | Type | Description |
|--------|------|-------------|
| `local` | boolean | Use only snapshot files/in-memory (no API calls) |
| `freeze` | boolean | Disable background cache updates with throttling |
| `logger` | boolean | Enable logging for debugging (`Client.getLogger('KEY')`) |
| `snapshotLocation` | string | Directory for snapshot files |
| `snapshotAutoUpdateInterval` | number | Auto-update interval in seconds (0 = disabled) |
| `snapshotWatcher` | boolean | Watch for snapshot file changes |
| `silentMode` | string | Fallback timeout (e.g., '5s', '2m', '1h') |
| `restrictRelay` | boolean | Enable relay restrictions in local mode |
| `regexSafe` | boolean | Protection against reDOS attacks |
| `regexMaxBlackList` | number | Max cached regex failures |
| `regexMaxTimeLimit` | number | Regex timeout in milliseconds |
| `certPath` | string | Path to SSL certificate file |

> **Security Note:** `regexSafe` prevents ReDoS attacks. Keep this enabled in production.

---

## Usage Examples

### Basic Usage

Multiple ways to check if a feature is enabled:

```js
const switcher = Client.getSwitcher();

// 🚀 Synchronous (local mode only)
const isEnabled = switcher.isItOn('FEATURE01');              // Returns: boolean
const isEnabledBool = switcher.isItOnBool('FEATURE01');      // Returns: boolean
const detailResult = switcher.detail().isItOn('FEATURE01');  // Returns: { result, reason, metadata }
const detailDirect = switcher.isItOnDetail('FEATURE01');     // Returns: { result, reason, metadata }

// 🌐 Asynchronous (remote/hybrid mode)
const isEnabledAsync = await switcher.isItOn('FEATURE01');              // Returns: Promise<boolean>
const isEnabledBoolAsync = await switcher.isItOnBool('FEATURE01', true); // Returns: Promise<boolean>
const detailResultAsync = await switcher.detail().isItOn('FEATURE01');  // Returns: Promise<SwitcherResult>
const detailDirectAsync = await switcher.isItOnDetail('FEATURE01', true); // Returns: Promise<SwitcherResult>
```

### Strategy Validation

#### Method 1: Prepare Input Separately

Load information into the switcher using `prepare()` when input comes from different parts of your code:

```js
// Prepare the switcher with input data
await switcher.checkValue('USER_1').prepare('FEATURE01');

// Execute the check
const result = await switcher.isItOn();
```

#### Method 2: All-in-One Execution

Fast method that includes everything in a single call:

```js
const result = await switcher
  .defaultResult(true)          // 🛡️ Fallback result if API is unavailable
  .throttle(1000)               // ⚡ Cache result for 1 second
  .checkValue('User 1')         // 👤 User-based strategy
  .checkNetwork('192.168.0.1')  // 🌐 Network-based strategy
  .isItOn('FEATURE01');
```

### Throttling

Perfect for critical code blocks requiring zero-latency. API calls are scheduled after the throttle time:

```js
const switcher = Client.getSwitcher();

// Cache result for 1 second
const result = await switcher
  .throttle(1000)
  .isItOn('FEATURE01');
```

#### Error Handling for Throttled Calls

Subscribe to error events to capture issues during throttled execution:

```js
Client.subscribeNotifyError((error) => {
  console.error('Switcher error:', error);
});
```

### Hybrid Mode

Force specific switchers to resolve remotely while running in local mode. Ideal for features requiring remote validation (e.g., Relay Strategies):

```js
const switcher = Client.getSwitcher();

// Force remote resolution for this specific call
const result = await switcher.remote().isItOn('FEATURE01');
```

---

## Testing Features

### Built-in Stub Feature

Bypass switcher configuration for testing scenarios. Perfect for validating both enabled and disabled states:

#### Basic Stubbing

```js
// ✅ Force feature to be enabled
Client.assume('FEATURE01').true();
const result = switcher.isItOn('FEATURE01'); // Returns: true

// ❌ Force feature to be disabled  
Client.assume('FEATURE01').false();
const result = switcher.isItOn('FEATURE01'); // Returns: false

// 🔄 Reset to normal behavior
Client.forget('FEATURE01');
const result = switcher.isItOn('FEATURE01'); // Returns: actual API/snapshot result
```

#### Advanced Stubbing with Metadata

```js
// Add custom metadata to simulate Relay responses
Client.assume('FEATURE01')
  .false()
  .withMetadata({ message: 'Feature is disabled' });

const response = await switcher.detail().isItOn('FEATURE01');
console.log(response.result);           // false
console.log(response.metadata.message); // "Feature is disabled"
```

#### Conditional Stubbing

```js
import { StrategiesType } from 'switcher-client';

// ✅ True only for specific value
Client.assume('FEATURE01')
  .true()
  .when(StrategiesType.VALUE, 'USER_1');

const resultUser1 = switcher.checkValue('USER_1').isItOn('FEATURE01');  // true
const resultUser2 = switcher.checkValue('USER_2').isItOn('FEATURE01');  // false

// ✅ True for multiple values
Client.assume('FEATURE01')
  .true()
  .when(StrategiesType.NETWORK, ['192.168.1.1', '192.168.1.2']);

const resultNetwork1 = switcher.checkNetwork('192.168.1.1').isItOn('FEATURE01');  // true
const resultNetwork2 = switcher.checkNetwork('192.168.1.3').isItOn('FEATURE01');  // false
```

### Test Mode

Enable test mode to prevent snapshot file locking during automated testing:

```js
// Add this to your test setup files
Client.testMode();
```

> **💡 Tip:** This prevents the Switcher Client from locking snapshot files even after test execution completes.

### Smoke Testing

Validate feature flag during startup to catch configuration issues early:

```ts
try {
  await Client.checkSwitchers(['FEATURE01', 'FEATURE02', 'CRITICAL_FEATURE']);
  console.log('✅ All switchers configured correctly');
} catch (error) {
  console.error('❌ Configuration issues found:', error.message);
  process.exit(1);
}
```

This feature validates using the current context and throws an exception if any Switcher Keys are not properly configured.

---

## Snapshot Management

### Loading Snapshots

Load a local copy of your configuration to eliminate latency when local mode is activated:

```js
// Basic snapshot loading
await Client.loadSnapshot();

// Load snapshot and enable auto-watching
await Client.loadSnapshot({ watchSnapshot: true });

// Fetch remote snapshot and enable auto-watching
await Client.loadSnapshot({ watchSnapshot: true, fetchRemote: true });
```

### Watching for Changes

#### Method 1: Programmatic Watching

Monitor snapshot changes and implement custom actions:

```js
Client.watchSnapshot({
  success: () => console.log('✅ In-memory snapshot updated'),
  reject: (err) => console.error('❌ Snapshot update failed:', err)
});
```

#### Method 2: Configuration-based Watching

Enable snapshot monitoring through client configuration:

```js
Client.buildContext(
  { domain, component, environment },
  {
    local: true,
    snapshotLocation: './snapshot/',
    snapshotWatcher: true  // 👁️ Enable automatic monitoring
  }
);
```

### Version Checking

Check if your snapshot is up to date with the remote domain:

```js
try {
  const versionInfo = await Client.checkSnapshot();
  console.log('Snapshot version info:', versionInfo);
} catch (error) {
  console.error('Version check failed:', error);
}
```

> **💡 Use Case:** Perfect for external processes that manage snapshot files independently.

### Auto-Update Scheduler

Run the SDK in local mode (zero latency) while keeping snapshots automatically updated:

```js
// Update every 3 seconds (3000 milliseconds)
Client.scheduleSnapshotAutoUpdate(3000, {
    success: (updated) => console.log('Snapshot updated', updated),
    reject: (err: Error) => console.log(err)
});
```

#### Alternative: Configuration-based Auto-Update

```js
Client.buildContext(
  { domain, component, environment },
  {
    local: true,
    snapshotAutoUpdateInterval: 60  // 🕐 Update every 60 seconds
  }
);
```