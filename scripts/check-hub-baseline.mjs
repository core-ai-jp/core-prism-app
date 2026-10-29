// Public HTML identity checks only. No credentials, API calls, forms or redirects.
import { pathToFileURL } from 'node:url';

export const routes = [
  ['/corp', '株式会社CORE |'],
  ['/roai-score', 'CORE ROAI SCORE'],
  ['/academy/', 'CORE Academy'],
  ['/intelligence', 'CORE Intelligence'],
  // /pricing intentionally shares the Prism HTML entry; rendered pricing is a separate browser check.
  ['/pricing', 'CORE Prism'],
];

export function validateBase(raw) {
  const url = new URL(raw);
  const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Use an HTTPS origin without credentials, path, query or fragment (HTTP allowed only on localhost).');
  }
  return url.origin;
}

export async function checkBaseline(raw, fetcher = fetch) {
  const base = validateBase(raw);
  const results = [];
  for (const [path, expected] of routes) {
    try {
      const response = await fetcher(base + path, {
        method: 'GET', redirect: 'error', credentials: 'omit',
        headers: { Accept: 'text/html' }, signal: AbortSignal.timeout(10000),
      });
      if (response.status !== 200) throw new Error('HTTP_' + response.status);
      if (!/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('NOT_HTML');
      const html = await response.text();
      const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
      if (!title.includes(expected)) throw new Error('WRONG_PAGE_TITLE');
      if (!/<meta\b[^>]*name=["']viewport["']/i.test(html)) throw new Error('MISSING_VIEWPORT');
      results.push({ path, status: 'pass' });
    } catch (error) {
      // Never emit response bodies or exception messages containing remote content.
      const code = error instanceof Error && /^(HTTP_\d+|NOT_HTML|WRONG_PAGE_TITLE|MISSING_VIEWPORT)$/.test(error.message)
        ? error.message : 'FETCH_FAILED';
      results.push({ path, status: 'fail', code });
    }
  }
  return { base, checkedAt: new Date().toISOString(), scope: 'public-html-only', results };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) {
    console.error('Usage: node scripts/check-hub-baseline.mjs <origin>');
    process.exitCode = 1;
  } else {
    try {
      const report = await checkBaseline(process.argv[2]);
      console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.results.some(row => row.status !== 'pass') ? 1 : 0;
    } catch {
      console.error('Invalid origin. Supply an HTTPS origin without credentials, path or query.');
      process.exitCode = 1;
    }
  }
}
