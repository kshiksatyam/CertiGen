import { NextResponse } from 'next/server';

export function middleware(request) {
  // First-pass route allowlist / security checks
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
};
