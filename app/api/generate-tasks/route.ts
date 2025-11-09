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
    const prompt = `You are an expert ${studySystem || 'IB'} ${subject} teacher.

Generate a comprehensive set of study tasks on the topic: "${topic}".
Difficulty: ${difficulty}.

REQUIREMENTS:
1. Create 5-8 diverse tasks that test different skills and understanding levels
2. Include a mix of question types: conceptual, analytical, problem-solving, and application-based
3. Adjust the complexity and depth according to the ${difficulty} difficulty level
4. Make tasks relevant to real-world applications where possible
5. For ${studySystem || 'IB'} curriculum: align with assessment objectives and command terms

OUTPUT FORMAT:
- Use proper **Markdown** formatting with headers, lists, and emphasis
- Use LaTeX notation for all mathematical formulas:
  * Inline math: \\(ax + b = 0\\)
  * Display math: $$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$
- Structure each task clearly with a task number, description, and any necessary context
- Start with a brief introduction about the topic
- End with a note about the expected approach or skills being tested

Generate the practice tasks now.`;

    // Use o4-mini Responses API with streaming
    const stream = await client.responses.create({
      model: 'o4-mini',
      stream: true,
      instructions: 'You are a helpful tutor that returns clean Markdown only, no extra chatter.',
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
