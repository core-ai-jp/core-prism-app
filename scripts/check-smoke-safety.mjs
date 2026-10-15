// Exercise the real smoke entry point against a local server, without API credentials.
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';

async function check(status, expectedExit) {
  const requests = [];
  const server = http.createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`);
    res.writeHead(status);
    res.end('fixture');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const env = { ...process.env, SMOKE_BASE_URL: `http://127.0.0.1:${server.address().port}`, SMOKE_TIMEOUT_MS: '1000' };
    delete env.SMOKE_ALLOW_PAID_PROBES;
    delete env.SMOKE_MASTER_KEY;
    const child = spawn(process.execPath, ['scripts/smoke.mjs'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', data => { output += data; });
    child.stderr.on('data', data => { output += data; });
    const code = await new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('exit', resolve);
    });
    assert.equal(code, expectedExit, output);
    assert.deepEqual(requests, ['GET /', 'GET /iris']);
    assert.match(output, /\[SKIP\] AI and Stripe probes/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}
await check(200, 0);
await check(503, 1);
console.log('Smoke safety checks passed: page GETs only; failures still fail.');
