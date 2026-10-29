// Read-only readiness monitor. Never submits a form, runs jobs or calls a paid API.
import { readFile } from 'node:fs/promises';
import { validateBase } from './check-hub-baseline.mjs';
const base = validateBase(process.argv[2]);
const routes = JSON.parse(await readFile(new URL('./hubRoutes.json', import.meta.url)));
const results = [];
for (const { path } of routes) {
  try {
    const response = await fetch(base + path, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(10000) });
    const html = await response.text();
    const pass = response.status === 200 && /text\/html/i.test(response.headers.get('content-type') || '') && html.includes('CORE') && html.includes('name="viewport"') && html.includes('rel="canonical"');
    results.push({ path, pass, status: response.status });
  } catch { results.push({ path, pass: false, status: 'FETCH_FAILED' }); }
}
for (const [action, expected] of [['config', 200], ['metrics', 401]]) {
  try {
    const response = await fetch(base + '/api/hub?action=' + action, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    const pass = response.status === expected && (action !== 'config' || (typeof data.enabled === 'boolean' && Object.keys(data).every(k => ['enabled', 'mail', 'policy'].includes(k))));
    results.push({ path: '/api/hub?action=' + action, pass, status: response.status });
  } catch { results.push({ path: '/api/hub?action=' + action, pass: false, status: 'FETCH_FAILED' }); }
}
console.log(JSON.stringify({ base, at: new Date().toISOString(), scope: 'public-read-only', results }, null, 2));
if (results.some(r => !r.pass)) process.exitCode = 1;
