import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next') || '/marketplace';
  const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/marketplace';

  if (!code) return NextResponse.redirect(new URL('/auth/login?error=oauth', url.origin));

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/auth/login?error=oauth', url.origin));

  const { data: { user } } = await supabase.auth.getUser();
  const isGoogle = !!user?.identities?.some((identity: any) => identity.provider === 'google');
  if (user && isGoogle) {
    const { data: profile } = await supabase.from('profiles').select('full_name,campus,location').eq('id', user.id).maybeSingle();
    if (!profile?.full_name || !profile?.campus || !profile?.location) {
      const complete = new URL('/auth/complete-profile', url.origin);
      complete.searchParams.set('next', next);
      return NextResponse.redirect(complete);
    }
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
