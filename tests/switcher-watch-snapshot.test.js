import { assert } from 'chai';
import { writeFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';

import { Client } from '../switcher-client.js';
import { deleteGeneratedSnapshot, getSwitcherResulUntil } from './helper/utils.js';

const domain = 'Business';
const component = 'business-service';
let devJSON;

const updateSwitcher = (environment, status) => {
  const copyOfDevJSON = JSON.parse(JSON.stringify(devJSON));
  copyOfDevJSON.data.domain.group[0].config[0].activated = status;
  writeFileSync(`generated-watch-snapshots/${environment}.json`, JSON.stringify(copyOfDevJSON, null, 4));
};

const invalidateJSON = (environment) => {
  writeFileSync(`generated-watch-snapshots/${environment}.json`, '[INVALID]');
};

const beforeAll = () => {
  if (!existsSync('generated-watch-snapshots/')) {
    mkdirSync('generated-watch-snapshots/', { recursive: true });
  }

  const dataBuffer = readFileSync('./tests/snapshot/dev.json');
  devJSON = JSON.parse(dataBuffer.toString());
  devJSON.data.domain.group[0].config[0].activated = true;
};

const afterAll = () => {
  for (let i = 1; i <= 4; i++) {
    const filePath = `generated-watch-snapshots/watch${i}.json`;
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  Client.unloadSnapshot();
  setTimeout(() => deleteGeneratedSnapshot('./generated-watch-snapshots'), 0);
};

const afterEach = () => {
  Client.unloadSnapshot();
};

describe('E2E test - Switcher local - Watch Snapshot (watchSnapshot):', function () {
  this.beforeAll(beforeAll);
  this.afterAll(afterAll);
  this.afterEach(afterEach);

  const initContext = async (environment) => {
    if (!existsSync('generated-watch-snapshots/')) {
      mkdirSync('generated-watch-snapshots/', { recursive: true });
    }

    writeFileSync(`generated-watch-snapshots/${environment}.json`, JSON.stringify(devJSON, null, 4));

    Client.buildContext({ domain, component, environment }, {
      snapshotLocation: 'generated-watch-snapshots/',
      local: true,
      regexSafe: false
    });

    await Client.loadSnapshot();
  };

  it('should read from snapshot - without watching', function (done) {
    this.timeout(10000);

    initContext('watch1').then(async () => {
      const switcher = Client.getSwitcher();
      const result1 = switcher.isItOn('FF2FOR2030');
      assert.isTrue(result1);

      updateSwitcher('watch1', false);
      const result2 = switcher.isItOn('FF2FOR2030');
      assert.isTrue(result2);
      done();
    });
  });
  
  it('should read from updated snapshot', function (done) {
    this.timeout(10000);

    initContext('watch2').then(() => {
      const switcher = Client.getSwitcher();
      Client.watchSnapshot({
        success: async () => {
          const result = switcher.isItOn('FF2FOR2030');
          assert.isFalse(result);
          done();
        }
      });

      setTimeout(async () => {
        const result = switcher.isItOn('FF2FOR2030');
        assert.isTrue(result);
        updateSwitcher('watch2', false);
      }, 1000);
    });
  });

  it('should NOT read from updated snapshot - invalid JSON', function (done) {
    this.timeout(10000);

    initContext('watch3').then(() => {
      const switcher = Client.getSwitcher();
      Client.watchSnapshot({
        reject: (err) => {
          assert.equal(err.message, 'Something went wrong: It was not possible to load the file at generated-watch-snapshots/');
          done();
        }
      });

      setTimeout(() => {
        const result = switcher.isItOn('FF2FOR2030');
        assert.isTrue(result);
        invalidateJSON('watch3');
      }, 1000);
    });
  });

  it('should NOT allow to watch snapshot - Switcher test is enabled', function (done) {
    Client.testMode();

    let errorMessage;
    Client.watchSnapshot({ reject: (err) => errorMessage = err.message });
    
    assert.equal(errorMessage, 'Watch Snapshot cannot be used in test mode or without a snapshot location');
    done();
    Client.testMode(false);
  });

});

describe('E2E test - Switcher local - Watch Snapshot (context):', function () {
  this.beforeAll(beforeAll);
  this.afterAll(afterAll);
  this.afterEach(afterEach);

  const initContext = async (environment) => {
    if (!existsSync('generated-watch-snapshots/')) {
      mkdirSync('generated-watch-snapshots/', { recursive: true });
    }

    writeFileSync(`generated-watch-snapshots/${environment}.json`, JSON.stringify(devJSON, null, 4));

    Client.buildContext({ domain, component, environment }, {
      snapshotLocation: 'generated-watch-snapshots/',
      snapshotWatcher: true,
      local: true,
      regexSafe: false
    });

    await Client.loadSnapshot();
  };
  
  it('should read from updated snapshot', async function () {
    this.timeout(10000);

    await initContext('watch4');

    const switcher = Client.getSwitcher();
    assert.isTrue(switcher.isItOn('FF2FOR2030'));
    updateSwitcher('watch4', false);

    assert.isFalse(await getSwitcherResulUntil(switcher, 'FF2FOR2030', false));
  });
});