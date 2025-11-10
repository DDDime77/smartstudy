/**
 * Exam Preparation Schedule API
 * Generates intelligent study tasks for exam preparation using AI
 */

import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const {
      student_id,
      exam_id,
      subject_id,
      subject_name,
      exam_type,
      exam_date,
      units,
      calculation,
      busy_slots,
    } = await req.json();

    // Validate required parameters
    if (!student_id || !exam_id || !subject_name) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: student_id, exam_id, or subject_name' }), {
        status: 400,
      });
    }

    const studentId = student_id;

    // Format units list for AI
    const unitsText = units && units.length > 0
      ? units.map((u: string, i: number) => `${i + 1}. ${u}`).join('\n')
      : 'No specific units provided';

    // Format busy schedule for AI
    const busyScheduleText = busy_slots && busy_slots.length > 0
      ? busy_slots.map((slot: any) => {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          if (slot.recurring) {
            return `- ${days[slot.day_of_week]}: ${slot.start_time} - ${slot.end_time} (${slot.activity_type})`;
          }
          return `- ${slot.specific_date}: ${slot.start_time} - ${slot.end_time} (${slot.activity_type})`;
        }).join('\n')
      : 'No busy schedule provided';

    const today = new Date();
    const currentDate = today.toISOString().split('T')[0];

    // Calculate difficulty distribution: 1/3 easy, 1/3 medium, 1/3 hard
    const totalSessions = calculation.recommendedSessions;
    const easySessions = Math.floor(totalSessions / 3);
    const mediumSessions = Math.floor(totalSessions / 3);
    const hardSessions = totalSessions - easySessions - mediumSessions;

    // AI system prompt for exam prep scheduling
    const systemPrompt = `You are an AI Study Scheduler helping a student prepare for an upcoming exam.

Current Date: ${currentDate}

Exam Details:
- Subject: ${subject_name}
- Exam Type: ${exam_type}
- Exam Date: ${exam_date}
- Days Until Exam: ${calculation.daysUntil}
- Units to Cover:
${unitsText}

Schedule Analysis:
- Total Available Hours: ${Math.round(calculation.totalAvailableHours)}h
- Estimated Hours Needed: ${Math.round(calculation.estimatedHoursNeeded)}h
- Recommended Sessions: ${totalSessions}
- Average Session Duration: ${Math.round(calculation.hoursPerSession * 60)} minutes

Student's Busy Schedule (avoid these times):
${busyScheduleText}

YOUR TASK:
Create ${totalSessions} study sessions spread intelligently across the next ${calculation.daysUntil} days to prepare for this exam.

CRITICAL DIFFICULTY DISTRIBUTION REQUIREMENT:
You MUST create EXACTLY:
- ${easySessions} sessions with difficulty="easy" (foundational review, basic concepts)
- ${mediumSessions} sessions with difficulty="medium" (core practice, application)
- ${hardSessions} sessions with difficulty="hard" (advanced problems, exam-level practice)

REQUIREMENTS:
1. **Difficulty Progression**:
   - Start with EASY sessions (${easySessions} sessions) for foundational topics
   - Then MEDIUM sessions (${mediumSessions} sessions) for core practice
   - End with HARD sessions (${hardSessions} sessions) for advanced practice and exam prep
   - You MUST specify difficulty explicitly in EVERY create_assignment call
   - Final session (1-2 days before exam) should be "hard" difficulty

2. **Topic Distribution**: Break down the ${units.length} unit(s) into specific study sessions
   - Use the ACTUAL unit names provided (e.g., "${units[0]}")
   - DO NOT use generic terms like "Unit 1" or "Exam Preparation"
   - Create focused sessions on specific topics/concepts within each unit
   - Easy: "Introduction to [Topic]", "Basic [Concept]"
   - Medium: "Applying [Topic]", "Practice Problems: [Concept]"
   - Hard: "Advanced [Topic]", "Exam-Level Questions", "Final Review"

3. **Time Distribution**: Space sessions evenly leading up to the exam
   - Days until exam: ${calculation.daysUntil}
   - Create ${totalSessions} sessions
   - Suggested distribution: ${
     calculation.daysUntil <= 7
       ? 'every 1-2 days (intensive prep)'
       : calculation.daysUntil <= 14
       ? 'every 2-3 days (regular prep)'
       : 'every 3-5 days (extended prep)'
   }

4. **Session Structure**:
   - Each session: ~${Math.round(calculation.hoursPerSession * 60)} minutes
   - Easy sessions: 5 tasks, shorter duration (30-45 min)
   - Medium sessions: 6-7 tasks, moderate duration (45-60 min)
   - Hard sessions: 8-10 tasks, longer duration (60-90 min)

5. **Scheduling Logic**:
   - Avoid the busy schedule times listed above
   - Use time_of_day: 'morning'/'afternoon'/'evening' appropriately
   - Space sessions out - don't cluster them
   - Final session should be 1-2 days before exam

6. **Call create_assignment multiple times** (${totalSessions} times total)
   - Each call creates ONE session
   - MUST include difficulty parameter in EVERY call
   - Vary the topics across units
   - Progress from easy → medium → hard

EXAMPLE (if units were ["Kinematics", "Dynamics"], 6 sessions: 2 easy, 2 medium, 2 hard):
- Session 1: topic="Kinematics - Basic Concepts", difficulty="easy", due_date="${currentDate}", time_of_day="afternoon", required_tasks_count=5
- Session 2: topic="Dynamics - Introduction to Forces", difficulty="easy", due_date="<+2 days>", time_of_day="morning", required_tasks_count=5
- Session 3: topic="Kinematics - Practice Problems", difficulty="medium", due_date="<+4 days>", time_of_day="evening", required_tasks_count=7
- Session 4: topic="Dynamics - Applications", difficulty="medium", due_date="<+6 days>", time_of_day="afternoon", required_tasks_count=6
- Session 5: topic="Advanced Kinematics & Dynamics", difficulty="hard", due_date="<+8 days>", time_of_day="morning", required_tasks_count=8
- Session 6: topic="Final Exam Review", difficulty="hard", due_date="<exam_date - 1>", time_of_day="afternoon", required_tasks_count=10

Now generate the study plan by calling create_assignment for each session. Be specific with topics, dates, AND difficulty levels.`;

    // Import createSingleAssignmentInline from study-assistant
    const { createSingleAssignmentInline } = await import('../study-assistant/utils');

    // Define create_assignment tool
    const tools = [
      {
        type: 'function',
        function: {
          name: 'create_assignment',
          description: 'Create a single study assignment for exam preparation. Call this multiple times to create a series of study sessions.',
          parameters: {
            type: 'object',
            properties: {
              subject: {
                type: 'string',
                description: 'The subject name'
              },
              topic: {
                type: 'string',
                description: 'Specific topic from the exam units (use actual unit names, not generic terms)'
              },
              due_date: {
                type: 'string',
                description: 'Date in YYYY-MM-DD format'
              },
              time_of_day: {
                type: 'string',
                enum: ['morning', 'afternoon', 'evening'],
                description: 'Time preference'
              },
              difficulty: {
                type: 'string',
                enum: ['easy', 'medium', 'hard'],
                description: 'Difficulty level'
              },
              estimated_minutes: {
                type: 'number',
                description: 'Estimated time in minutes'
              },
              required_tasks_count: {
                type: 'number',
                description: 'Number of practice tasks'
              }
            },
            required: ['subject', 'topic']
          }
        }
      }
    ];

    // Create AI request
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Generate ${calculation.recommendedSessions} study sessions for the ${exam_type} exam on ${exam_date}. Use the create_assignment tool for each session.`
      }
    ];

    const initialStream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      tools: tools as any,
      tool_choice: 'auto',
      parallel_tool_calls: true,
      temperature: 0.7,
      stream: true,
    });

    // Create streaming response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = '';
          const toolCallsMap = new Map<number, any>();
          let lastProcessedIndex = -1;

          // Helper to execute tool call
          const executeToolCall = async (toolCall: any) => {
            console.log('Executing tool:', toolCall.function.name, toolCall.function.arguments);

            controller.enqueue(encoder.encode('\n__TOOL_CALL_START__\n'));

            const args = JSON.parse(toolCall.function.arguments);
            controller.enqueue(encoder.encode(`__TOOL_DATA__:${JSON.stringify({
              name: toolCall.function.name,
              args,
              topic: args.topic
            })}\n`));

            if (toolCall.function.name === 'create_assignment') {
              await createSingleAssignmentInline(studentId, args, controller, encoder);
            }

            controller.enqueue(encoder.encode('\n__TOOL_CALL_END__\n'));
          };

          // Stream response and execute tools
          for await (const chunk of initialStream) {
            const delta = chunk.choices[0]?.delta;

            if (delta?.content) {
              fullContent += delta.content;
              controller.enqueue(encoder.encode(delta.content));
            }

            if (delta?.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                const index = toolCallDelta.index;

                // Execute completed tool calls
                if (index > lastProcessedIndex + 1 && toolCallsMap.has(lastProcessedIndex + 1)) {
                  const completedToolCall = toolCallsMap.get(lastProcessedIndex + 1);
                  await executeToolCall(completedToolCall);
                  lastProcessedIndex++;
                }

                // Accumulate current tool call
                if (!toolCallsMap.has(index)) {
                  toolCallsMap.set(index, {
                    id: toolCallDelta.id || '',
                    type: 'function',
                    function: {
                      name: toolCallDelta.function?.name || '',
                      arguments: toolCallDelta.function?.arguments || ''
                    }
                  });
                } else {
                  const existing = toolCallsMap.get(index);
                  if (toolCallDelta.id) existing.id = toolCallDelta.id;
                  if (toolCallDelta.function?.name) existing.function.name = toolCallDelta.function.name;
                  if (toolCallDelta.function?.arguments) existing.function.arguments += toolCallDelta.function.arguments;
                }
              }
            }
          }

          // Execute remaining tool calls
          for (let i = lastProcessedIndex + 1; i < toolCallsMap.size; i++) {
            if (toolCallsMap.has(i)) {
              const completedToolCall = toolCallsMap.get(i);
              await executeToolCall(completedToolCall);
            }
          }

          controller.close();
        } catch (error) {
          console.error('Exam prep scheduling error:', error);
          controller.enqueue(encoder.encode('\n❌ Error generating study plan. Please try again.\n'));
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Exam prep schedule API error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate schedule' }), {
      status: 500,
    });
  }
}
