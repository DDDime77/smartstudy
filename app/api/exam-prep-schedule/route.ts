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
    const totalEstimatedHours = calculation.estimatedHoursNeeded || calculation.totalAvailableHours;

    // Divide hours by difficulty level: 1/3 for each
    const hoursPerDifficulty = totalEstimatedHours / 3;

    // Calculate number of sessions per difficulty
    // Easy: 45 min avg, Medium: 60 min avg, Hard: 75 min avg
    const easySessions = Math.round((hoursPerDifficulty * 60) / 45);
    const mediumSessions = Math.round((hoursPerDifficulty * 60) / 60);
    const hardSessions = Math.round((hoursPerDifficulty * 60) / 75);
    const totalSessions = easySessions + mediumSessions + hardSessions;

    console.log('📊 Task Distribution Calculation:');
    console.log(`  Total Estimated Hours: ${totalEstimatedHours.toFixed(1)}h`);
    console.log(`  Hours per difficulty: ${hoursPerDifficulty.toFixed(1)}h`);
    console.log(`  Easy sessions (45min avg): ${easySessions}`);
    console.log(`  Medium sessions (60min avg): ${mediumSessions}`);
    console.log(`  Hard sessions (75min avg): ${hardSessions}`);
    console.log(`  Total sessions: ${totalSessions}`);

    // PRE-CALCULATE EXACT DATES FOR EQUAL DISTRIBUTION
    const daysUntilExam = calculation.daysUntil;
    const dayInterval = daysUntilExam / totalSessions;
    const scheduledDates: string[] = [];

    for (let i = 0; i < totalSessions; i++) {
      const dayOffset = Math.floor(dayInterval * i);
      const sessionDate = new Date(currentDate);
      sessionDate.setDate(sessionDate.getDate() + dayOffset);
      scheduledDates.push(sessionDate.toISOString().split('T')[0]);
    }

    console.log('📅 Pre-calculated Equal Distribution:');
    console.log(`  Day interval: ${dayInterval.toFixed(2)} days`);
    scheduledDates.forEach((date, i) => {
      console.log(`  Session ${i + 1}: ${date}`);
    });

    // AI system prompt for exam prep scheduling
    const systemPrompt = `You are an AI Study Scheduler helping a student prepare for an upcoming exam.

Exam Details:
- Subject: ${subject_name}
- Exam Type: ${exam_type}
- Days Until Exam: ${calculation.daysUntil}
- Units to Cover:
${unitsText}

Schedule Analysis:
- Total Estimated Hours Needed: ${Math.round(totalEstimatedHours)}h
- Hours allocated per difficulty: ${Math.round(hoursPerDifficulty)}h each

YOUR TASK:
Create ${totalSessions} study sessions (${easySessions} easy + ${mediumSessions} medium + ${hardSessions} hard).

CRITICAL DIFFICULTY DISTRIBUTION REQUIREMENT:
You MUST create EXACTLY:
- ${easySessions} sessions with difficulty="easy"
  * Duration: 30-45 minutes each
  * Total time for all easy sessions: ~${Math.round(hoursPerDifficulty)}h

- ${mediumSessions} sessions with difficulty="medium"
  * Duration: 50-65 minutes each
  * Total time for all medium sessions: ~${Math.round(hoursPerDifficulty)}h

- ${hardSessions} sessions with difficulty="hard"
  * Duration: 70-90 minutes each
  * Total time for all hard sessions: ~${Math.round(hoursPerDifficulty)}h

REQUIREMENTS:
1. **Difficulty Progression**:
   - Start with EASY sessions (${easySessions} sessions) for foundational topics
   - Then MEDIUM sessions (${mediumSessions} sessions) for core practice
   - End with HARD sessions (${hardSessions} sessions) for advanced practice and exam prep
   - You MUST specify difficulty AND estimated_minutes explicitly in EVERY create_assignment call

2. **Topic Distribution**: Break down the ${units.length} unit(s) into specific study sessions
   - Use the ACTUAL unit names provided (e.g., "${units[0]}")
   - Keep topic names CONCISE (under 80 characters)
   - DO NOT use generic terms like "Unit 1" or "Exam Preparation"
   - Create focused sessions on specific topics/concepts within each unit
   - Easy: "Intro: [Topic]", "Basics: [Concept]"
   - Medium: "Practice: [Topic]", "Apply: [Concept]"
   - Hard: "Advanced: [Topic]", "Mastery: [Concept]", "Final Review"

3. **Call create_assignment ${totalSessions} times** (EXACT COUNT REQUIRED)
   - Each call creates ONE study session
   - MUST include: subject, topic, difficulty, estimated_minutes
   - DO NOT include: due_date, time_of_day (dates will be assigned automatically)
   - Focus on TOPICS and DIFFICULTY PROGRESSION
   - Vary the topics across units
   - Progress from easy → medium → hard

CRITICAL: Generate ${totalSessions} sessions in order: ${easySessions} easy, then ${mediumSessions} medium, then ${hardSessions} hard.

Now generate the study plan by calling create_assignment for each session. Be specific with topics, difficulty levels, AND estimated_minutes!`;

    // Import createSingleAssignmentInline from study-assistant
    const { createSingleAssignmentInline } = await import('../study-assistant/utils');

    // Define create_assignment tool
    const tools = [
      {
        type: 'function',
        function: {
          name: 'create_assignment',
          description: 'Create a single study assignment for exam preparation. Call this multiple times to create a series of study sessions. Dates will be assigned automatically in equal distribution.',
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
              difficulty: {
                type: 'string',
                enum: ['easy', 'medium', 'hard'],
                description: 'Difficulty level (REQUIRED)'
              },
              estimated_minutes: {
                type: 'number',
                description: 'Estimated time in minutes (REQUIRED)'
              },
              required_tasks_count: {
                type: 'number',
                description: 'Number of practice tasks (optional, defaults based on difficulty)'
              }
            },
            required: ['subject', 'topic', 'difficulty', 'estimated_minutes']
          }
        }
      }
    ];

    // Create AI request
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Generate ${totalSessions} study sessions NOW. Call create_assignment ${totalSessions} times with specific topics from the provided units. Include difficulty and estimated_minutes in each call. Start with ${easySessions} easy sessions, then ${mediumSessions} medium sessions, then ${hardSessions} hard sessions.`
      }
    ];

    console.log('🤖 Calling OpenAI with', totalSessions, 'sessions to generate');

    const initialStream = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages,
      tools: tools as any,
      tool_choice: 'auto',
      parallel_tool_calls: true,
      temperature: 0.7,
      max_tokens: 4000, // GPT-4 Turbo limit is 4096, using 4000 to be safe
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
          let sessionIndex = 0; // Track which session we're creating

          // Helper to execute tool call
          const executeToolCall = async (toolCall: any) => {
            console.log('Executing tool:', toolCall.function.name, toolCall.function.arguments);

            controller.enqueue(encoder.encode('\n__TOOL_CALL_START__\n'));

            const args = JSON.parse(toolCall.function.arguments);

            if (toolCall.function.name === 'create_assignment') {
              // INJECT pre-calculated date and time_of_day
              if (sessionIndex < scheduledDates.length) {
                args.due_date = scheduledDates[sessionIndex];

                // Determine time_of_day based on difficulty
                if (args.difficulty === 'easy') {
                  args.time_of_day = 'morning';
                } else if (args.difficulty === 'medium') {
                  args.time_of_day = 'afternoon';
                } else {
                  args.time_of_day = 'evening';
                }

                console.log(`📅 Session ${sessionIndex + 1}: Assigning date ${args.due_date} (${args.time_of_day})`);
                sessionIndex++;
              }

              controller.enqueue(encoder.encode(`__TOOL_DATA__:${JSON.stringify({
                name: toolCall.function.name,
                args,
                topic: args.topic
              })}\n`));

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

  } catch (error: any) {
    console.error('Exam prep schedule API error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return new Response(JSON.stringify({
      error: 'Failed to generate schedule',
      details: error?.message || 'Unknown error'
    }), {
      status: 500,
    });
  }
}
