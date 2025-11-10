import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const coursesCookie = cookieStore.get('google_courses');

    if (!coursesCookie) {
      return NextResponse.json(
        { error: 'No courses found. Please authenticate with Google Classroom first.' },
        { status: 401 }
      );
    }

    const courses = JSON.parse(coursesCookie.value);

    const formattedCourses = courses.map((course: any) => ({
      id: course.id,
      name: course.name || 'Untitled Course',
      section: course.section || null,
      description: course.descriptionHeading || null,
      suggested_level: null,
      suggested_category: null
    }));

    return NextResponse.json(formattedCourses);

  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
