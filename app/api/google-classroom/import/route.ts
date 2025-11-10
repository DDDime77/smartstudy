import { NextRequest, NextResponse } from 'next/server';

interface ImportCourse {
  course_id: string;
  course_name: string;
  current_grade: string;
  target_grade: string;
  level: string | null;
  category: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const courses: ImportCourse[] = await request.json();

    if (!Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json(
        { error: 'No courses provided' },
        { status: 400 }
      );
    }

    const subjects = courses.map(course => ({
      name: course.course_name,
      level: course.level,
      category: course.category,
      current_grade: course.current_grade,
      target_grade: course.target_grade,
    }));

    return NextResponse.json({ subjects });

  } catch (error) {
    console.error('Error importing courses:', error);
    return NextResponse.json(
      { error: 'Failed to import courses' },
      { status: 500 }
    );
  }
}
