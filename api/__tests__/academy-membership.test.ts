import { describe, it, expect, vi } from 'vitest';
import handler from '../academy-membership/index.js';

const result = () => {
  const response: { statusCode: number; payload: unknown; headers: Record<string,string> } = {statusCode: 200, payload: null, headers: {}};
  const res = {
    setHeader(k: string, v: string) { response.headers[k] = v; return this; },
    status(code: number) { response.statusCode = code; return this; },
    json(data: unknown) { response.payload = data; return this; },
  };
  return { response, res };
};
describe('CORE Academy B2C membership fails closed until verified configuration', () => {
  it('never advertises a live checkout without the dedicated billing settings', async () => {
    vi.stubEnv('ACADEMY_MEMBERSHIP_ENABLED', 'false');
    const { response, res } = result();
    await handler({ method:'GET', query:{action:'config'}, headers:{} } as never, res as never);
    expect(response.statusCode).toBe(200);
    expect(response.payload).toMatchObject({ready:false,amount:5500,currency:'jpy',interval:'month'});
    vi.unstubAllEnvs();
  });
  it('does not open a paid checkout if membership is not ready', async () => {
    vi.stubEnv('ACADEMY_MEMBERSHIP_ENABLED', 'false');
    const { response, res } = result();
    await handler({ method:'POST', query:{action:'checkout'}, headers:{origin:'https://www.core-ai.jp'}, body:{} } as never, res as never);
    expect(response.statusCode).toBe(503);
    expect(response.payload).toMatchObject({error:'MEMBERSHIP_NOT_READY'});
    vi.unstubAllEnvs();
  });
});
