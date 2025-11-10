import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function suggestCategory(courseName: string): string {
  const name = courseName.toLowerCase();

  if (name.includes('math') || name.includes('algebra') || name.includes('calculus') ||
      name.includes('geometry') || name.includes('trigonometry') || name.includes('statistics')) {
    return 'Mathematics';
  }

  if (name.includes('biology') || name.includes('chemistry') || name.includes('physics') ||
      name.includes('science')) {
    return 'Science';
  }

  if (name.includes('english') || name.includes('literature') || name.includes('writing') ||
      name.includes('language arts') || name.includes('reading')) {
    return 'Language Arts';
  }

  if (name.includes('history') || name.includes('geography') || name.includes('social studies') ||
      name.includes('government') || name.includes('civics') || name.includes('economics')) {
    return 'Social Studies';
  }

  if (name.includes('computer') || name.includes('programming') || name.includes('coding') ||
      name.includes('software') || name.includes('technology')) {
    return 'Computer Science';
  }

  if (name.includes('art') || name.includes('music') || name.includes('drama') ||
      name.includes('theater') || name.includes('dance')) {
    return 'Arts';
  }

  if (name.includes('physical education') || name.includes('pe') || name.includes('gym') ||
      name.includes('fitness') || name.includes('sports')) {
    return 'Physical Education';
  }

  if (name.includes('spanish') || name.includes('french') || name.includes('german') ||
      name.includes('chinese') || name.includes('language')) {
    return 'Foreign Language';
  }

  return 'Other';
}

export async function GET(request: NextRequest) {
  try {
    console.log('🟢 [Courses API] ====== Fetching courses from cookies ======');

    const cookieStore = cookies();
    const coursesCookie = cookieStore.get('google_courses');

    console.log('🟢 [Courses API] Cookie exists:', !!coursesCookie);

    if (!coursesCookie) {
      console.error('🔴 [Courses API] No courses cookie found');
      return NextResponse.json(
        { error: 'No courses found. Please authenticate with Google Classroom first.' },
        { status: 401 }
      );
    }

    console.log('🟢 [Courses API] Parsing courses from cookie...');
    const courses = JSON.parse(coursesCookie.value);
    console.log('🟢 [Courses API] Found', courses.length, 'courses in cookie');

    console.log('🟢 [Courses API] Formatting courses and adding categories...');
    const formattedCourses = courses.map((course: any) => ({
      id: course.id,
      name: course.name || 'Untitled Course',
      section: course.section || null,
      description: course.descriptionHeading || null,
      suggested_level: null,
      suggested_category: suggestCategory(course.name || '')
    }));

    console.log('✅ [Courses API] Returning', formattedCourses.length, 'formatted courses');
    console.log('📚 [Courses API] Course list:', formattedCourses.map(c => ({
      name: c.name,
      category: c.suggested_category
    })));

    return NextResponse.json(formattedCourses);

  } catch (error) {
    console.error('Error fetching courses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch courses' },
      { status: 500 }
    );
  }
}
