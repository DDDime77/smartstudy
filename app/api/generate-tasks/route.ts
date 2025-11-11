import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    // Initialize OpenAI client inside the function to avoid build-time errors
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { subject, topic, difficulty, studySystem, grade } = await req.json();

    if (!subject || !topic || !difficulty) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, topic, difficulty' },
        { status: 400 }
      );
    }

    // Calculate absolute difficulty for reasoning effort
    // Grade contributes: higher grade = harder (1-6: easy, 7-9: medium, 10-12: hard)
    // Difficulty level contributes: easy/medium/hard
    const gradeNum = parseInt(grade) || 9; // Default to grade 9 if not provided
    const gradeDifficulty = gradeNum <= 6 ? 0 : gradeNum <= 9 ? 1 : 2;
    const levelDifficulty = difficulty === 'easy' ? 0 : difficulty === 'medium' ? 1 : 2;
    const absoluteDifficulty = gradeDifficulty + levelDifficulty; // 0-4 scale

    // Map absolute difficulty to reasoning effort
    // 0-1: low, 2-3: medium, 4: high
    const reasoningEffort = absoluteDifficulty <= 1 ? 'low' : absoluteDifficulty <= 3 ? 'medium' : 'high';

    // Common formatting rules for both stages
    const formattingRules = `
IMPORTANT FORMATTING RULES:
- Use proper markdown formatting
- For mathematical formulas, use ONLY these delimiters:
  * Inline math: Single dollar signs like $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
  * Display math: Double dollar signs like $$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$
  * Do NOT use \\[...\\] or \\(...\\) delimiters
  * CRITICAL: ALL mathematical expressions, variables, equations, and formulas MUST be wrapped in $ or $$ delimiters
  * Examples: Write $v = \\sqrt{\\frac{T}{\\mu}}$ NOT just v = T/μ
  * Keep entire formulas on single lines within delimiters - do NOT split formulas across multiple lines
- LaTeX SIMPLICITY RULES (CRITICAL):
  * Use \\frac NOT \\tfrac or \\dfrac
  * Use \\left( and \\right) for auto-sizing parentheses, NOT \\bigl, \\bigr, \\Bigl, \\Bigr
  * Do NOT use manual spacing commands like \\!, \\,, \\;, \\quad
  * Use simple delimiters: () [] {} - avoid complex bracket sizing
  * Keep LaTeX as simple as possible - avoid advanced TeX commands
  * Every formula must be complete within ONE pair of $ or $$ - no splitting
- Write formulas inline with text using $...$ for better readability
- Each step in the solution should be on a new line for clarity`;

    // STAGE 1: Fast task generation with GPT-4 (2-3 seconds)
    const taskPrompt = `You are an expert ${studySystem || 'IB'} ${subject} teacher creating a practice problem for students.

CONTEXT:
- Study System: ${studySystem || 'IB (International Baccalaureate)'}
- Subject: ${subject}
- Topic: ${topic}
- Grade Level: ${grade || '9-10'}
- Difficulty Level: ${difficulty}

TASK:
Generate a practice problem with TWO sections ONLY:

1. TIME_ESTIMATE section - Estimated time in minutes for a student to complete this task
2. TASK section - The actual problem/question for the student

REQUIREMENTS:
- Align with ${studySystem || 'IB'} curriculum standards and command terms
- Tailor complexity to grade ${grade || '9-10'} level (adjust vocabulary, concepts, and problem complexity appropriately)
- Adjust difficulty within that grade level to ${difficulty} level
- Make the problem relevant, engaging, and clear for grade ${grade || '9-10'} students
- For mathematics, physics, or chemistry: include proper LaTeX formatting

OUTPUT FORMAT - CRITICAL:
You MUST structure your output EXACTLY like this:

# TIME_ESTIMATE
[Write only a number representing minutes, e.g., "5" or "10" or "15"]

# TASK
[Write the problem statement here - what the student needs to solve]

${formattingRules}

Generate the problem now.`;

    // Stream the response in real-time
    const readableStream = new ReadableStream({
      async start(controller) {
        let isClosed = false;
        let fullTaskContent = '';

        try {
          // STAGE 1: Generate task quickly with GPT-4
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ status: 'generating_task' })}\n\n`)
          );

          const taskStream = await client.chat.completions.create({
            model: 'gpt-4',
            messages: [{
              role: 'user',
              content: taskPrompt
            }],
            temperature: 0.7,
            max_tokens: 4000, // GPT-4 context limit is 8192 total
            stream: true,
          });

          // Stream task content
          for await (const chunk of taskStream) {
            if (isClosed) break;

            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              fullTaskContent += content;
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ delta: content, stage: 'task' })}\n\n`)
              );
            }
          }

          // Send task complete marker
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ task_complete: true })}\n\n`)
          );

          // STAGE 2: Generate solution with o4-mini (slower, high reasoning)
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ status: 'generating_solution' })}\n\n`)
          );

          const solutionPrompt = `You are an expert ${studySystem || 'IB'} ${subject} teacher. A student has been given this practice problem:

${fullTaskContent}

TASK:
Generate the SOLUTION and ANSWER for this problem with TWO sections:

1. SOLUTION section - Step-by-step worked solution showing the methodology
2. ANSWER section - The final answer(s) only

REQUIREMENTS:
- Provide a clear, step-by-step solution that teaches the methodology
- Explain each step thoroughly
- Show all work and reasoning
- For mathematics, physics, or chemistry: include proper LaTeX formatting

OUTPUT FORMAT - CRITICAL:
You MUST structure your output EXACTLY like this:

# SOLUTION
[Write the step-by-step solution with clear explanations]

# ANSWER
[Write only the final answer(s) here]

${formattingRules}

Generate the solution now. Be thorough and educational.`;

          const solutionStream = await client.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
              role: 'user',
              content: solutionPrompt
            }],
            stream: true,
            temperature: 0.3,
            max_tokens: 8000, // GPT-4o max output tokens
          });

          // Send periodic keepalives during solution generation
          const keepaliveInterval = setInterval(() => {
            if (!isClosed) {
              try {
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ keepalive: true })}\n\n`)
                );
              } catch (e) {
                clearInterval(keepaliveInterval);
              }
            } else {
              clearInterval(keepaliveInterval);
            }
          }, 15000);

          // Stream solution content
          for await (const chunk of solutionStream) {
            if (isClosed) break;

            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ delta: content, stage: 'solution' })}\n\n`)
              );
            }
          }

          clearInterval(keepaliveInterval);

          // Close if not already closed
          if (!isClosed) {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
            );
            controller.close();
            isClosed = true;
          }
        } catch (error) {
          console.error('Streaming error:', error);
          if (!isClosed) {
            try {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`)
              );
              controller.close();
            } catch (e) {
              // Controller already closed, ignore
            }
          }
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error generating tasks:', error);
    return NextResponse.json(
      { error: 'Failed to generate tasks', details: error.message },
      { status: 500 }
    );
  }
}
