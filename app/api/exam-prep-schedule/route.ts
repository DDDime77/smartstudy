/**
 * Exam Preparation Schedule API
 * Generates intelligent study tasks for exam preparation using AI
 */

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { cookies } from 'next/headers';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const {
      exam_id,
      subject_id,
      subject_name,
      exam_type,
      exam_date,
      units,
      calculation,
      busy_slots,
    } = await req.json();

    // Get student ID from session
    const cookieStore = await cookies();
    const sessionData = cookieStore.get('session');
    if (!sessionData) {
      return new Response(JSON.stringify({ error: 'No session found' }), {
        status: 401,
      });
    }

    const session = JSON.parse(sessionData.value);
    const studentId = session.userId;

    if (!studentId || !exam_id || !subject_name) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        status: 400,
      });
    }

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
- Recommended Sessions: ${calculation.recommendedSessions}
- Average Session Duration: ${Math.round(calculation.hoursPerSession * 60)} minutes

Student's Busy Schedule (avoid these times):
${busyScheduleText}

YOUR TASK:
Create ${calculation.recommendedSessions} study sessions spread intelligently across the next ${calculation.daysUntil} days to prepare for this exam.

REQUIREMENTS:
1. **Topic Distribution**: Break down the ${units.length} unit(s) into specific study sessions
   - Use the ACTUAL unit names provided (e.g., "${units[0]}")
   - DO NOT use generic terms like "Unit 1" or "Exam Preparation"
   - Create focused sessions on specific topics/concepts within each unit

2. **Time Distribution**: Space sessions evenly leading up to the exam
   - Days until exam: ${calculation.daysUntil}
   - Create ${calculation.recommendedSessions} sessions
   - Suggested distribution: ${
     calculation.daysUntil <= 7
       ? 'every 1-2 days (intensive prep)'
       : calculation.daysUntil <= 14
       ? 'every 2-3 days (regular prep)'
       : 'every 3-5 days (extended prep)'
   }

3. **Session Structure**:
   - Each session: ~${Math.round(calculation.hoursPerSession * 60)} minutes
   - Difficulty: Start with 'medium', end with 'hard' for final review
   - Required tasks: 5-8 tasks per session

4. **Scheduling Logic**:
   - Avoid the busy schedule times listed above
   - Use time_of_day: 'morning'/'afternoon'/'evening' appropriately
   - Space sessions out - don't cluster them
   - Final session should be 1-2 days before exam

5. **Call create_assignment multiple times** (${calculation.recommendedSessions} times total)
   - Each call creates ONE session
   - Vary the topics across units
   - Progress from foundational concepts to advanced practice

EXAMPLE (if units were ["Kinematics", "Dynamics"]):
- Session 1: topic="Kinematics - Position and Velocity", due_date="${currentDate}", time_of_day="afternoon"
- Session 2: topic="Kinematics - Acceleration and Graphs", due_date="<+2 days>", time_of_day="morning"
- Session 3: topic="Dynamics - Newton's Laws", due_date="<+4 days>", time_of_day="evening"
- Session 4: topic="Dynamics - Forces and Motion", due_date="<+6 days>", time_of_day="afternoon"
- Session 5: topic="Exam Review - Practice Problems", due_date="<exam_date - 1>", time_of_day="morning"

Now generate the study plan by calling create_assignment for each session. Be specific with topics and dates.`;

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
