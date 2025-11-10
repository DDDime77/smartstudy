/**
 * Shared utility functions for assignment creation
 */

export async function createSingleAssignmentInline(
  studentId: string,
  params: any,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const { db } = await import('@/lib/db');

  const subjectsResult = await db.query(
    'SELECT * FROM subjects WHERE user_id = $1',
    [studentId]
  );
  const subjects = subjectsResult.rows;

  const matchingSubject = subjects.find((s: any) =>
    s.name.toLowerCase().includes(params.subject.toLowerCase()) ||
    params.subject.toLowerCase().includes(s.name.toLowerCase())
  );

  if (!matchingSubject) {
    controller.enqueue(encoder.encode('⚠️ Could not find subject "' + params.subject + '"\n'));
    return;
  }

  const profileResult = await db.query(
    'SELECT * FROM user_profiles WHERE user_id = $1',
    [studentId]
  );
  const profile = profileResult.rows[0];
  let availability = profile?.preferred_study_times || [];

  if (!availability || availability.length === 0) {
    availability = [
      { day: 1, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 2, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 3, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 4, slots: [{ start: '16:00', end: '18:00' }] },
      { day: 5, slots: [{ start: '16:00', end: '18:00' }] },
    ];
  }

  const today = new Date();
  let scheduledDate: Date | null = null;
  let scheduledTime: string | null = null;

  if (params.due_date) {
    scheduledDate = new Date(params.due_date);
    const dayOfWeek = scheduledDate.getDay();
    const dayAvailability = availability.find((a: any) => a.day === dayOfWeek);

    if (params.time_of_day) {
      const timeMap: any = { 'morning': '09:00', 'afternoon': '14:00', 'evening': '18:00' };
      scheduledTime = timeMap[params.time_of_day] || '16:00';
    } else if (dayAvailability && dayAvailability.slots && dayAvailability.slots.length > 0) {
      scheduledTime = dayAvailability.slots[0].start;
    } else {
      scheduledTime = '16:00';
    }
  } else {
    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + dayOffset);
      const dayOfWeek = targetDate.getDay();

      const dayAvailability = availability.find((a: any) => a.day === dayOfWeek);

      if (dayAvailability && dayAvailability.slots && dayAvailability.slots.length > 0) {
        scheduledDate = targetDate;
        scheduledTime = dayAvailability.slots[0].start;
        break;
      }
    }
  }

  if (!scheduledDate || !scheduledTime) {
    controller.enqueue(encoder.encode('⚠️ Could not find an available time slot\n'));
    return;
  }

  const dateStr = scheduledDate.toISOString().split('T')[0];
  const difficulty = params.difficulty || 'medium';
  const estimatedMinutes = params.estimated_minutes || 45;
  const requiredTasksCount = params.required_tasks_count || 5;
  const title = 'Study Session: ' + matchingSubject.name;

  await db.query(
    'INSERT INTO ai_assignments (user_id, subject_id, title, subject_name, topic, difficulty, scheduled_date, scheduled_time, estimated_minutes, required_tasks_count) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [
      studentId,
      matchingSubject.id,
      title,
      matchingSubject.name,
      params.topic,
      difficulty,
      dateStr,
      scheduledTime,
      estimatedMinutes,
      requiredTasksCount
    ]
  );

  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][scheduledDate.getDay()];
  controller.enqueue(encoder.encode(
    'Created: ' + matchingSubject.name + ' - ' + params.topic + ' on ' + dayName + ' ' + scheduledDate.getDate() + '/' + (scheduledDate.getMonth()+1) + ' at ' + scheduledTime + '\n'
  ));
}
