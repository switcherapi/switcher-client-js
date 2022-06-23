const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const assert = chai.assert;

const { Switcher } = require('../src/index');
const fs = require('fs');

const updateSwitcher = (status) => {
  const dataBuffer = fs.readFileSync('./snapshot/dev.json');
  const dataJSON = JSON.parse(dataBuffer.toString());

  dataJSON.data.domain.group[0].config[0].activated = status;

  fs.mkdirSync('generated-snapshots/', { recursive: true });
  fs.writeFileSync('generated-snapshots/watch.json', JSON.stringify(dataJSON, null, 4));
};

const invalidateJSON = () => {
  fs.mkdirSync('generated-snapshots/', { recursive: true });
  fs.writeFileSync('generated-snapshots/watch.json', '[INVALID]');
};

describe('E2E test - Switcher offline - Watch Snapshot:', function () {
  const domain = 'Business';
  const component = 'business-service';
  const environment = 'watch';

  this.beforeEach(async function() {
    updateSwitcher(true);
    Switcher.buildContext({ domain, component, environment }, {
      snapshotLocation: 'generated-snapshots/',
      offline: true
    });

    await Switcher.loadSnapshot();
  });

  this.afterAll(function() {
    Switcher.unloadSnapshot();
  });

  it('should read from snapshot - without watching', function (done) {
    this.timeout(10000);

    const switcher = Switcher.factory();
    switcher.isItOn('FF2FOR2030').then((val1) => {
      assert.isTrue(val1);
      updateSwitcher(false);

      switcher.isItOn('FF2FOR2030').then((val2) => {
        assert.isTrue(val2);
        done();
      });
    });
  });
  
  it('should read from updated snapshot', function (done) {
    this.timeout(10000);

    const switcher = Switcher.factory();
    Switcher.watchSnapshot(async () => {
      assert.isFalse(await switcher.isItOn('FF2FOR2030'));
      done();
    });

    switcher.isItOn('FF2FOR2030').then((val) => {
      assert.isTrue(val);
      updateSwitcher(false);
    });
  });

  it('should NOT read from updated snapshot - invalid JSON', function (done) {
    this.timeout(10000);

    const switcher = Switcher.factory();
    Switcher.watchSnapshot(undefined, (err) => {
      assert.equal(err.message, 'Something went wrong: It was not possible to load the file at generated-snapshots/');
      done();
    });

    switcher.isItOn('FF2FOR2030').then((val) => {
      assert.isTrue(val);
      invalidateJSON();
    });
  });

});