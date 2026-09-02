import { NextRequest } from 'next/server';

import { proxy } from '@/proxy';

describe('public landing proxy', () => {
  it('redirects a refresh-cookie session to Search before rendering', () => {
    const request = new NextRequest('https://vrompt.test/', {
      headers: { cookie: 'vrompt_refresh_token=test-session' },
    });

    const response = proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://vrompt.test/search');
  });

  it('allows signed-out visitors to view the public landing page', () => {
    const response = proxy(new NextRequest('https://vrompt.test/'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
