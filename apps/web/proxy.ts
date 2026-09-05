import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const refreshCookieName = 'vrompt_refresh_token';

export function proxy(request: NextRequest) {
  if (request.cookies.has(refreshCookieName)) {
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
