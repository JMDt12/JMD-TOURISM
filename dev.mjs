/**
 * Runs the API and the Vite dev server together.
 *
 * `cmd & cmd` does not work in PowerShell, which is the default shell on
 * Windows, so this spawns both children itself and shuts them down as a pair.
 */
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const children = [
  ['server', spawn(npm, ['run', 'dev', '--workspace=server'], { stdio: 'inherit', shell: true })],
  ['client', spawn(npm, ['run', 'dev', '--workspace=client'], { stdio: 'inherit', shell: true })],
];

const stop = () => children.forEach(([, c]) => c.kill());
process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });

for (const [name, child] of children) {
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n${name} exited with code ${code}; stopping the other process.`);
      stop();
      process.exit(code);
    }
  });
}
