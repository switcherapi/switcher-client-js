import { assert } from 'chai';
import { writeFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'fs';

import { Switcher } from '../src/index.js';

describe('E2E test - Switcher local - Watch Snapshot:', function () {
  const domain = 'Business';
  const component = 'business-service';
  let devJSON;

  const initContext = async (environment) => {
    writeFileSync(`generated-snapshots/${environment}.json`, JSON.stringify(devJSON, null, 4));

    Switcher.buildContext({ domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      local: true,
      regexSafe: false
    });

    await Switcher.loadSnapshot();
  };

  const updateSwitcher = (environment, status) => {
    const copyOfDevJSON = JSON.parse(JSON.stringify(devJSON));
    copyOfDevJSON.data.domain.group[0].config[0].activated = status;
    writeFileSync(`generated-snapshots/${environment}.json`, JSON.stringify(copyOfDevJSON, null, 4));
  };
  
  const invalidateJSON = (environment) => {
    writeFileSync(`generated-snapshots/${environment}.json`, '[INVALID]');
  };

  this.beforeAll(function() {
    if (!existsSync('generated-snapshots/')) {
      mkdirSync('generated-snapshots/', { recursive: true });
    }

    const dataBuffer = readFileSync('./snapshot/dev.json');
    devJSON = JSON.parse(dataBuffer.toString());
    devJSON.data.domain.group[0].config[0].activated = true;
  });

  this.afterEach(function() {
    Switcher.unloadSnapshot();
  });

  this.afterAll(function() {
    unlinkSync('generated-snapshots/watch1.json');
    unlinkSync('generated-snapshots/watch2.json');
    unlinkSync('generated-snapshots/watch3.json');
    Switcher.unloadSnapshot();
  });

  it('should read from snapshot - without watching', function (done) {
    this.timeout(10000);

    initContext('watch1').then(async () => {
      const switcher = Switcher.factory();
      const result1 = await switcher.isItOn('FF2FOR2030');
      assert.isTrue(result1);

      updateSwitcher('watch1', false);
      const result2 = await switcher.isItOn('FF2FOR2030');
      assert.isTrue(result2);
      done();
    });
  });
  
  it('should read from updated snapshot', function (done) {
    this.timeout(10000);

    initContext('watch2').then(() => {
      const switcher = Switcher.factory();
      Switcher.watchSnapshot(async () => {
        const result = await switcher.isItOn('FF2FOR2030');
        assert.isFalse(result);
        done();
      });

      setTimeout(async () => {
        const result = await switcher.isItOn('FF2FOR2030');
        assert.isTrue(result);
        updateSwitcher('watch2', false);
      }, 1000);
    });
  });

  it('should NOT read from updated snapshot - invalid JSON', function (done) {
    this.timeout(10000);

    initContext('watch3').then(() => {
      const switcher = Switcher.factory();
      Switcher.watchSnapshot(undefined, (err) => {
        assert.equal(err.message, 'Something went wrong: It was not possible to load the file at generated-snapshots/');
        done();
      });

      setTimeout(() => {
        switcher.isItOn('FF2FOR2030').then(handleValue);
      }, 1000);
    });

    function handleValue(result) {
      assert.isTrue(result);
      invalidateJSON('watch3');
    }
  });

  it('should NOT allow to watch snapshot - Switcher test is enabled', function (done) {
    Switcher.testMode();

    let errorMessage;
    Switcher.watchSnapshot(undefined, (err) => {
      errorMessage = err.message;
    });
    
    assert.equal(errorMessage, 'Watch Snapshot cannot be used in test mode or without a snapshot location');
    done();
    Switcher.testMode(false);
  });

});