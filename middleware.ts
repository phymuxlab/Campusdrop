import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const protectedMatchers = ['/sell','/profile','/settings','/favourites','/messages','/notifications','/my-listings','/admin'];
const isProtected = (path: string) => protectedMatchers.some(route => path === route || path.startsWith(`${route}/`));

export async function middleware(request: NextRequest) {
  if (!isProtected(request.nextUrl.pathname)) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers || {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  response.headers.set('Cache-Control', 'private, no-store');
  if (error || !data?.claims) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/login';
    url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(url);
  }

  if (request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/')) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.claims.sub).maybeSingle();
    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/profile';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }
  return response;
}

export const config = { matcher: ['/sell/:path*','/profile/:path*','/settings/:path*','/favourites/:path*','/messages/:path*','/notifications/:path*','/my-listings/:path*','/admin/:path*'] };
