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

    // Prompt for o4-mini Responses API
    const prompt = `You are an expert educational content generator specializing in creating practice tasks and exercises for students.

CONTEXT:
- Study System: ${studySystem || 'IB (International Baccalaureate)'}
- Subject: ${subject}
- Topic: ${topic}
- Difficulty Level: ${difficulty}

TASK:
Generate practice tasks and exercises aligned with the ${studySystem || 'IB'} curriculum for ${subject}, specifically focusing on the topic "${topic}" at ${difficulty} difficulty level.

REQUIREMENTS:
1. Create 5-8 diverse tasks that test different skills and understanding levels
2. Include a mix of question types: conceptual, analytical, problem-solving, and application-based
3. Adjust the complexity and depth according to the ${difficulty} difficulty level
4. Make tasks relevant to real-world applications where possible
5. Provide clear, unambiguous task descriptions
6. For IB curriculum: align with assessment objectives and command terms

OUTPUT FORMAT:
- Use proper markdown formatting with headers, lists, and emphasis
- IMPORTANT: For mathematical formulas, use ONLY these specific delimiters:
  * Inline math: Single dollar signs like $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$
  * Display math (centered): Double dollar signs like $$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$
  * Do NOT use \\[...\\] or \\(...\\) delimiters - use ONLY $ and $$ delimiters
- Structure each task clearly with a task number, description, and any necessary context
- For mathematics, physics, or chemistry: include proper LaTeX formatting for equations, symbols, and expressions
- Start with a brief introduction about the topic
- End with a note about the expected approach or skills being tested

Please generate the practice tasks now.`;

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
