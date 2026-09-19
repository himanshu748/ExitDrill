import { NextRequest, NextResponse } from 'next/server';
export function proxy(request: NextRequest) {
  // Development tooling uses a different script runtime; the shipped preview uses strict nonces.
  if (process.env.NODE_ENV !== 'production') return NextResponse.next();
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const policy = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'nonce-${nonce}'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', policy);
  return response;
}
export const config = { matcher: ['/((?!v1|_next/static|_next/image|favicon.ico).*)'] };
