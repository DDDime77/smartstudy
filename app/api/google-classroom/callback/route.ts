import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    console.log('🔵 [OAuth Callback] ====== Starting OAuth callback ======');
    console.log('🔵 [OAuth Callback] Request URL:', request.url);

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    console.log('🔵 [OAuth Callback] Has authorization code:', !!code);
    console.log('🔵 [OAuth Callback] Has error:', !!error);

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=${encodeURIComponent('OAuth authorization failed')}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard?error=' + encodeURIComponent('No authorization code received'), request.url)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.redirect(
        new URL('/dashboard?error=' + encodeURIComponent('OAuth configuration missing'), request.url)
      );
    }

    console.log('🔵 [OAuth Callback] Initializing OAuth2 client...');
    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    console.log('🔵 [OAuth Callback] Exchanging authorization code for tokens...');
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('✅ [OAuth Callback] Tokens received successfully');

    console.log('🔵 [OAuth Callback] Fetching user info...');
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    console.log('✅ [OAuth Callback] User info:', {
      email: userInfo.data.email,
      name: userInfo.data.name
    });

    console.log('🔵 [OAuth Callback] Fetching Google Classroom courses...');
    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
    const coursesResponse = await classroom.courses.list({
      pageSize: 100
    });

    const courses = coursesResponse.data.courses || [];
    console.log('✅ [OAuth Callback] Fetched', courses.length, 'courses from Google Classroom');
    console.log('📚 [OAuth Callback] Course details:', courses.map(c => ({
      id: c.id,
      name: c.name,
      section: c.section,
      description: c.descriptionHeading
    })));

    console.log('🔵 [OAuth Callback] Preparing redirect...');
    // Always use production URL unless explicitly in development with localhost
    const baseUrl = process.env.NODE_ENV === 'development' &&
                    (process.env.NEXT_PUBLIC_API_URL?.includes('localhost') ||
                     process.env.NEXT_PUBLIC_API_URL?.includes('127.0.0.1'))
      ? 'http://localhost:4000'
      : 'https://sshours.cfd';

    const redirectUrl = new URL('/?classroom=success', baseUrl);
    console.log('🔵 [OAuth Callback] Redirect URL:', redirectUrl.toString());
    console.log('🔵 [OAuth Callback] Base URL:', baseUrl);
    console.log('🔵 [OAuth Callback] Environment:', process.env.NODE_ENV);
    console.log('🔵 [OAuth Callback] API URL:', process.env.NEXT_PUBLIC_API_URL);

    const response = NextResponse.redirect(redirectUrl);

    console.log('🔵 [OAuth Callback] Setting cookies...');
    response.cookies.set('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });
    console.log('✅ [OAuth Callback] Set google_tokens cookie');

    response.cookies.set('google_courses', JSON.stringify(courses), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60
    });
    console.log('✅ [OAuth Callback] Set google_courses cookie with', courses.length, 'courses');

    console.log('🎉 [OAuth Callback] ====== OAuth callback complete, redirecting ======');
    return response;

  } catch (error) {
    console.error('Error in OAuth callback:', error);
    // Always use production URL unless explicitly in development with localhost
    const baseUrl = process.env.NODE_ENV === 'development' &&
                    (process.env.NEXT_PUBLIC_API_URL?.includes('localhost') ||
                     process.env.NEXT_PUBLIC_API_URL?.includes('127.0.0.1'))
      ? 'http://localhost:4000'
      : 'https://sshours.cfd';
    return NextResponse.redirect(
      new URL('/?error=' + encodeURIComponent('Failed to complete OAuth flow'), baseUrl)
    );
  }
}
