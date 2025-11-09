import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: NextRequest) {
  try {
    // Initialize OpenAI client inside the function to avoid build-time errors
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { subject, topic, difficulty, studySystem } = await req.json();

    if (!subject || !topic || !difficulty) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, topic, difficulty' },
        { status: 400 }
      );
    }

    // Prompt for o4-mini Responses API - Generate single task with solution and answer
    const prompt = `You are an expert ${studySystem || 'IB'} ${subject} teacher creating a practice problem for students.

CONTEXT:
- Study System: ${studySystem || 'IB (International Baccalaureate)'}
- Subject: ${subject}
- Topic: ${topic}
- Difficulty Level: ${difficulty}

TASK:
Generate ONE complete practice problem with the following FOUR sections:

1. TIME_ESTIMATE section - Estimated time in minutes for a student to complete this task
2. TASK section - The actual problem/question for the student
3. SOLUTION section - Step-by-step worked solution showing the methodology
4. ANSWER section - The final answer(s) only

REQUIREMENTS:
- Align with ${studySystem || 'IB'} curriculum standards and command terms
- Adjust complexity to ${difficulty} difficulty level
- Make the problem relevant and engaging
- Solution should teach the methodology clearly
- For mathematics, physics, or chemistry: include proper LaTeX formatting

OUTPUT FORMAT - CRITICAL:
You MUST structure your output EXACTLY like this:

# TIME_ESTIMATE
[Write only a number representing minutes, e.g., "5" or "10" or "15"]

# TASK
[Write the problem statement here - what the student needs to solve]

# SOLUTION
[Write the step-by-step solution with clear explanations]

# ANSWER
[Write only the final answer(s) here]

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
- Use the section headers exactly as shown: # TIME_ESTIMATE, # TASK, # SOLUTION, # ANSWER
- Write formulas inline with text using $...$ for better readability
- Each step in the solution should be on a new line for clarity

Generate the problem now.`;

    // Use o4-mini Responses API with streaming
    const stream = await client.responses.create({
      model: 'o4-mini',
      stream: true,
      instructions: 'You are a helpful tutor. Return clean Markdown content directly. Do NOT wrap your response in markdown code fences (no ```markdown). Output the raw markdown content only.',
      input: prompt,
      reasoning: {
        effort: 'high',
      },
      max_output_tokens: 10000,
    });

    // Handle client disconnects
    req.signal.addEventListener('abort', () => {
      if (typeof (stream as any).abort === 'function') {
        (stream as any).abort();
      }
    });

    // Stream the response in real-time using Responses API events
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            // Text delta events
            if (event.type === 'response.output_text.delta') {
              const chunk = event.delta ?? '';
              if (chunk.length > 0) {
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ delta: chunk })}\n\n`)
                );
              }
            }

            // Completed event - send final marker & close
            if (event.type === 'response.completed') {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
              );
              controller.close();
            }

            // Error event from OpenAI stream
            if (event.type === 'error') {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ error: event.error })}\n\n`)
              );
              controller.close();
            }
          }
        } catch (error) {
          console.error('Streaming error:', error);
          controller.error(error);
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
