const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;

const { Switcher } = require('../src/index');
const fs = require('fs');

describe('E2E test - Switcher offline - Watch Snapshot:', function () {
  const domain = 'Business';
  const component = 'business-service';
  let devJSON;

  const initContext = async (environment) => {
    fs.writeFileSync(`generated-snapshots/${environment}.json`, JSON.stringify(devJSON, null, 4));

    Switcher.buildContext({ domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      offline: true,
      regexSafe: false
    });

    await Switcher.loadSnapshot();
  };

  const updateSwitcher = (environment, status) => {
    const copyOfDevJSON = JSON.parse(JSON.stringify(devJSON));
    copyOfDevJSON.data.domain.group[0].config[0].activated = status;
    fs.writeFileSync(`generated-snapshots/${environment}.json`, JSON.stringify(copyOfDevJSON, null, 4));
  };
  
  const invalidateJSON = (environment) => {
    fs.writeFileSync(`generated-snapshots/${environment}.json`, '[INVALID]');
  };

  this.beforeAll(function() {
    if (!fs.existsSync('generated-snapshots/')) {
      fs.mkdirSync('generated-snapshots/', { recursive: true });
    }

    const dataBuffer = fs.readFileSync('./snapshot/dev.json');
    devJSON = JSON.parse(dataBuffer.toString());
    devJSON.data.domain.group[0].config[0].activated = true;
  });

  this.afterEach(function() {
    Switcher.unloadSnapshot();
  });

  this.afterAll(function() {
    fs.unlinkSync('generated-snapshots/watch1.json');
    fs.unlinkSync('generated-snapshots/watch2.json');
    fs.unlinkSync('generated-snapshots/watch3.json');
    Switcher.unloadSnapshot();
  });

  it('should read from snapshot - without watching', function (done) {
    this.timeout(10000);

    initContext('watch1').then(() => {
      const switcher = Switcher.factory();
      switcher.isItOn('FF2FOR2030').then((val1) => {
        assert.isTrue(val1);
        updateSwitcher('watch1', false);

        switcher.isItOn('FF2FOR2030').then((val2) => {
          assert.isTrue(val2);
          done();
        });
      });
    });
  });
  
  it('should read from updated snapshot', function (done) {
    this.timeout(10000);

    initContext('watch2').then(() => {
      const switcher = Switcher.factory();
      Switcher.watchSnapshot(() => {
        switcher.isItOn('FF2FOR2030').then((val) => {
          assert.isFalse(val);
          done();
        });
      });
      
      setTimeout(() => {
        switcher.isItOn('FF2FOR2030').then((val) => {
          assert.isTrue(val);
          updateSwitcher('watch2', false);
        });
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
        switcher.isItOn('FF2FOR2030').then((val) => {
          assert.isTrue(val);
          invalidateJSON('watch3');
        });
      }, 1000);
    });
  });

});