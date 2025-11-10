import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');

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

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    const classroom = google.classroom({ version: 'v1', auth: oauth2Client });
    const coursesResponse = await classroom.courses.list({
      pageSize: 100
    });

    const courses = coursesResponse.data.courses || [];

    const url = new URL(request.url);
    const baseUrl = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
      ? `http://${url.host}`
      : 'https://sshours.cfd';

    const response = NextResponse.redirect(
      new URL('/?classroom=success', baseUrl)
    );

    response.cookies.set('google_tokens', JSON.stringify(tokens), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    response.cookies.set('google_courses', JSON.stringify(courses), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60
    });

    return response;

  } catch (error) {
    console.error('Error in OAuth callback:', error);
    const url = new URL(request.url);
    const baseUrl = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
      ? `http://${url.host}`
      : 'https://sshours.cfd';
    return NextResponse.redirect(
      new URL('/?error=' + encodeURIComponent('Failed to complete OAuth flow'), baseUrl)
    );
  }
}
