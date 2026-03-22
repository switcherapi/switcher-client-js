import { assert } from 'chai';

import { SwitcherContext, SwitcherOptions } from '../switcher-client.js';
import { deleteGeneratedSnapshot } from './helper/utils.js';

describe('Type placeholders:', function () {

  this.afterAll(function () {
    deleteGeneratedSnapshot('./generated-snapshots');
  });

  it('should check exported types', function () {
    const switcherContext = SwitcherContext.build();
    const switcherOptions = SwitcherOptions.build();

    assert.isTrue(switcherContext instanceof SwitcherContext);
    assert.isTrue(switcherOptions instanceof SwitcherOptions);

    assert.isNotNull(switcherContext);
    assert.isNotNull(switcherOptions);
  });
});
