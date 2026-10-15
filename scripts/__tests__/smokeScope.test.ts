import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

function runSmoke(readOnly: boolean) {
  const script = new URL('../smoke.mjs', import.meta.url).href;
  const fixture = `
    const requests = [];
    globalThis.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), method: options.method || 'GET' });
      let body = {};
      if (String(url).endsWith('/api/ai')) body = { content: [{ text: 'synthetic smoke ok' }] };
      if (String(url).endsWith('/api/stripe/checkout')) body = { url: 'https://example.test/synthetic-checkout' };
      return new Response(JSON.stringify(body), { status: 200 });
    };
    process.on('exit', () => console.log('REQUESTS:' + JSON.stringify(requests)));
    await import(${JSON.stringify(script)});
  `;
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', fixture], {
    encoding: 'utf8', timeout: 5000,
    env: { PATH: process.env.PATH, SMOKE_BASE_URL: 'https://example.test', SMOKE_ALLOW_PAID_PROBES: readOnly ? 'false' : 'true' },
  });
  const receipt = output.split('\n').find(line => line.startsWith('REQUESTS:'));
  return JSON.parse(receipt!.slice('REQUESTS:'.length)) as { url: string; method: string }[];
}

describe('Smoke verification scope', () => {
  it('read-only CI only GETs public pages, without invoking model or Stripe APIs', () => {
    expect(runSmoke(true)).toEqual([
      { url: 'https://example.test/', method: 'GET' },
      { url: 'https://example.test/iris', method: 'GET' },
    ]);
  });

  it('explicit API mode preserves all five original checks against mocked HTTP', () => {
    const calls = runSmoke(false);
    expect(calls).toHaveLength(5);
    expect(calls.slice(2)).toEqual([
      { url: 'https://example.test/api/ai', method: 'POST' },
      { url: 'https://example.test/api/stripe/checkout', method: 'POST' },
      { url: 'https://example.test/api/stripe/sync', method: 'POST' },
    ]);
  });
});
