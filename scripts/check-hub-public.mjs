// Read-only readiness monitor. Never submits a form, runs jobs or calls a paid API.
import { pathToFileURL } from 'node:url';
import { readFile } from 'node:fs/promises';
import { validateBase } from './check-hub-baseline.mjs';
export async function checkHubPublic(origin, fetcher = fetch) {
  const base = validateBase(origin);
  const routes = JSON.parse(await readFile(new URL('./hubRoutes.json', import.meta.url)));
  const results = [];
  for (const { path } of routes) {
    try {
      const response = await fetcher(base + path, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(10000) });
      const html = await response.text();
      const pass = response.status === 200 && /text\/html/i.test(response.headers.get('content-type') || '') && html.includes('CORE') && html.includes('name="viewport"') && html.includes('rel="canonical" href="https://www.core-ai.jp' + path + '"');
      results.push({ path, pass, status: response.status });
    } catch { results.push({ path, pass: false, status: 'FETCH_FAILED' }); }
  }
  for (const [action, expected] of [['config', 200], ['metrics', 401]]) {
    try {
      const response = await fetcher(base + '/api/hub?action=' + action, { redirect: 'error', credentials: 'omit', signal: AbortSignal.timeout(10000) });
      const data = await response.json();
      const pass = response.status === expected && (action !== 'config' || (typeof data.enabled === 'boolean' && Object.keys(data).every(k => ['enabled', 'mail', 'policy'].includes(k))));
      results.push({ path: '/api/hub?action=' + action, pass, status: response.status });
    } catch { results.push({ path: '/api/hub?action=' + action, pass: false, status: 'FETCH_FAILED' }); }
  }
  return { base, at: new Date().toISOString(), scope: 'public-read-only', results };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
 const report = await checkHubPublic(process.argv[2]);
 console.log(JSON.stringify(report, null, 2));
 if (report.results.some(r => !r.pass)) process.exitCode = 1;
}
