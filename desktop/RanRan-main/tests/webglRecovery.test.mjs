import assert from 'node:assert/strict';
import { test } from 'node:test';
import { watchWebGLContext } from '../src/utils/webglRecovery.ts';

class Canvas extends EventTarget { isConnected = true; }
function setup(t) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const canvas = new Canvas();
  const calls = [];
  const dispose = watchWebGLContext(canvas, {
    lost: () => calls.push('lost'), restored: () => calls.push('restored'), expired: () => calls.push('expired'),
  });
  t.after(dispose);
  return { canvas, calls, dispose };
}
const lose = canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
const restore = canvas => canvas.dispatchEvent(new Event('webglcontextrestored'));

test('restoration cancels fallback and allows a later independent loss', t => {
  const { canvas, calls } = setup(t);
  assert.equal(lose(canvas), false, 'preventDefault allows browser restoration');
  t.mock.timers.tick(700); restore(canvas);
  t.mock.timers.tick(3000);
  assert.deepEqual(calls, ['lost', 'restored']);
  lose(canvas); t.mock.timers.tick(2500);
  assert.deepEqual(calls, ['lost', 'restored', 'lost', 'expired']);
});
test('repeated loss events do not extend the recovery deadline', t => {
  const { canvas, calls } = setup(t);
  lose(canvas); t.mock.timers.tick(1500); lose(canvas); t.mock.timers.tick(1000);
  assert.deepEqual(calls, ['lost', 'expired']);
});
test('cinema detachment during recovery cannot fail the scene', t => {
  const { canvas, calls } = setup(t);
  lose(canvas); canvas.isConnected = false; t.mock.timers.tick(3000);
  assert.deepEqual(calls, ['lost']);
});
test('cleanup cancels pending fallback and ignores delayed R3F disposal events', t => {
  const { canvas, calls, dispose } = setup(t);
  lose(canvas); dispose();
  lose(canvas); restore(canvas); t.mock.timers.tick(3000);
  assert.deepEqual(calls, ['lost']);
});
test('old canvas restoration cannot cancel the new canvas recovery', t => {
  const { canvas: oldCanvas, dispose } = setup(t);
  lose(oldCanvas); dispose(); oldCanvas.isConnected = false;
  const next = new Canvas();
  let expired = 0;
  const cleanup = watchWebGLContext(next, { lost() {}, restored() {}, expired() { expired++; } });
  t.after(cleanup);
  lose(next); restore(oldCanvas); t.mock.timers.tick(2500);
  assert.equal(expired, 1);
});
