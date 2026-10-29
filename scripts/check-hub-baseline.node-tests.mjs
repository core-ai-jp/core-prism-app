import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import { checkBaseline, routes, validateBase } from './check-hub-baseline.mjs';

test('rejects unsafe or ambiguous origins before any requests', () => {
  for (const value of ['http://example.com', 'https://a:b@example.com', 'https://example.com/path', 'https://example.com?token=secret', 'file:///tmp/a']) {
    assert.throws(() => validateBase(value));
  }
});

test('actual local server observes only five unauthenticated public GETs', async () => {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push([req.method, req.url, req.headers.authorization, req.headers.cookie]);
    const expected = routes.find(([path]) => path === req.url)?.[1];
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<title>${expected}</title><meta name="viewport" content="width=device-width">`);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const report = await checkBaseline(`http://127.0.0.1:${server.address().port}`);
    assert.ok(report.results.every(row => row.status === 'pass'));
    assert.deepEqual(seen, routes.map(([path]) => ['GET', path, undefined, undefined]));
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('rejects 200 fallback pages, JSON, missing viewport, unavailable server and redirection', async () => {
  const cases = [
    [() => new Response('<title>Login</title>', { headers: { 'content-type': 'text/html' } }), 'WRONG_PAGE_TITLE'],
    [() => Response.json({ ok: true }), 'NOT_HTML'],
    [() => new Response('<title>株式会社CORE |</title>', { headers: { 'content-type': 'text/html' } }), 'MISSING_VIEWPORT'],
    [() => new Response('', { status: 503 }), 'HTTP_503'],
    [() => new Response('', { status: 302 }), 'HTTP_302'],
    [() => { throw new Error('private remote response'); }, 'FETCH_FAILED'],
  ];
  for (const [fetcher, code] of cases) {
    const report = await checkBaseline('https://example.invalid', fetcher);
    assert.equal(report.results[0].code, code);
    assert.ok(!JSON.stringify(report).includes('private remote response'));
  }
});

test('rejects other existing CORE entry pages, including corporate HTML at pricing', async () => {
  for (const [path, expected] of routes) {
    for (const [, other] of routes.filter(([, title]) => title !== expected)) {
      const report = await checkBaseline('https://example.invalid', () => new Response(
        `<title>${other}</title><meta name="viewport" content="width=device-width">`,
        { headers: { 'content-type': 'text/html' } },
      ));
      assert.equal(report.results.find(row => row.path === path).code, 'WRONG_PAGE_TITLE');
    }
  }
});
