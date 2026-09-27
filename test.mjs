/**
 * Runs the whole test suite: builds the jsdom-compatible bundle, then the
 * route render checks and the end-to-end booking journey.
 *
 * Requires the API to be running on :4000 (npm run dev:server).
 */
import { spawn } from 'node:child_process';

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const c = spawn(cmd, args, { stdio: 'inherit', shell: true });
    c.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(' ')} failed`))));
  });

try {
  await fetch('http://localhost:4000/api/health');
} catch {
  console.error('The API is not running. Start it with: npm run dev:server');
  process.exit(1);
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
await run(npx, ['vite', 'build', '--config', 'client/vite.smoke.config.js', '--logLevel', 'warn']);
await run('node', ['smoke.mjs']);
await run('node', ['smoke-booking.mjs']);
await run('node', ['smoke-guards.mjs']);
