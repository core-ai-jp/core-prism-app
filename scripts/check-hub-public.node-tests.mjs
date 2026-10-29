import test from 'node:test';
import assert from 'node:assert/strict';
import { checkHubPublic } from './check-hub-public.mjs';

const reply = (url, options, wrongPage = false) => {
  assert.equal(options.credentials, 'omit');
  assert.equal(options.redirect, 'error');
  const u = new URL(url);
  if (u.pathname === '/api/hub') return Response.json(
    u.searchParams.get('action') === 'config' ? { enabled: false, mail: false, policy: 'v1' } : { error: 'Unauthorized' },
    { status: u.searchParams.get('action') === 'config' ? 200 : 401 },
  );
  return new Response(`<title>CORE</title><meta name="viewport"><link rel="canonical" href="https://www.core-ai.jp${wrongPage ? '/corp' : u.pathname}">`, { headers: { 'Content-Type': 'text/html' } });
};
test('accepts matching pages and disabled intake without writing', async () => {
  const report = await checkHubPublic('https://example.test', reply);
  assert.equal(report.results.length, 16);
  assert.ok(report.results.every(r => r.pass));
});
test('rejects HTTP 200 fallback pages on every Hub route', async () => {
  const report = await checkHubPublic('https://example.test', (u, o) => reply(u, o, true));
  assert.equal(report.results.filter(r => !r.pass).length, 14);
});
test('rejects accidental public admin access and leaked config fields', async () => {
  const report = await checkHubPublic('https://example.test', (u, o) => u.includes('/api/')
    ? Response.json({ enabled: false, secret: 'synthetic' }) : reply(u, o));
  assert.equal(report.results.filter(r => !r.pass).length, 2);
});
