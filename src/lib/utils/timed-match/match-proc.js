import { parentPort } from 'node:worker_threads';
import tryMatch from './match.js';

parentPort.on('message', (e) => {
  const { values, input, sharedBuffer } = e;
  const int32Array = new Int32Array(sharedBuffer);
  const result = tryMatch(values, input);

  // Store result in shared buffer (1 for true, 0 for false)
  Atomics.store(int32Array, 0, result ? 1 : 0);
  
  // Notify the main thread that work is complete
  Atomics.notify(int32Array, 0);
});