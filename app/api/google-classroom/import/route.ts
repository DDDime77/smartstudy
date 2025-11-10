import { NextRequest, NextResponse } from 'next/server';

// Imported courses have course_id and course_name
interface ImportCourse {
  course_id?: string;
  course_name?: string;
  current_grade: string;
  target_grade: string;
  level: string | null;
  category: string | null;
}

// Manual subjects have id and name
interface ManualSubject {
  id?: string;
  name?: string;
  current_grade: string;
  target_grade: string;
  level?: string | null;
  category?: string | null;
  color?: string;
}

type ImportItem = ImportCourse | ManualSubject;

export async function POST(request: NextRequest) {
  try {
    const items: ImportItem[] = await request.json();

    console.log('🟢 [Import API] ====== Received import request ======');
    console.log('🟢 [Import API] Number of items:', items.length);
    console.log('🟢 [Import API] Items:', items);

    if (!Array.isArray(items) || items.length === 0) {
      console.error('🔴 [Import API] No items provided or invalid format');
      return NextResponse.json(
        { error: 'No courses or subjects provided' },
        { status: 400 }
      );
    }

    // Map both imported courses and manual subjects to the same format
    const subjects = items.map((item, index) => {
      // Handle imported course (has course_name) or manual subject (has name)
      const name = 'course_name' in item && item.course_name ? item.course_name :
                   'name' in item && item.name ? item.name :
                   `Subject ${index + 1}`;

      const subject: any = {
        name,
        level: item.level || null,
        category: item.category || null,
        current_grade: item.current_grade,
        target_grade: item.target_grade,
      };

      // Preserve color for manual subjects
      if ('color' in item && item.color) {
        subject.color = item.color;
      }

      console.log(`✅ [Import API] Mapped subject ${index + 1}: ${name}`, subject);
      return subject;
    });

    console.log('🎉 [Import API] Successfully mapped', subjects.length, 'subjects');
    console.log('📚 [Import API] Subject list:', subjects);

    return NextResponse.json({ subjects });

  } catch (error) {
    console.error('🔴 [Import API] Error importing courses/subjects:', error);
    return NextResponse.json(
      { error: 'Failed to import courses/subjects' },
      { status: 500 }
    );
  }
}
