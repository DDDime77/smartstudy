import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { subject, topic, difficulty, studySystem } = await req.json();

    if (!subject || !topic || !difficulty) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, topic, difficulty' },
        { status: 400 }
      );
    }

    // XML-style system prompt
    const systemPrompt = `<system>
<role>You are an expert educational content generator specializing in creating practice tasks and exercises for students.</role>

<context>
  <study_system>${studySystem || 'IB (International Baccalaureate)'}</study_system>
  <subject>${subject}</subject>
  <topic>${topic}</topic>
  <difficulty>${difficulty}</difficulty>
</context>

<instructions>
  <instruction>Generate practice tasks and exercises aligned with the ${studySystem || 'IB'} curriculum for ${subject}.</instruction>
  <instruction>Focus specifically on the topic: "${topic}"</instruction>
  <instruction>Adjust the complexity and depth according to the difficulty level: ${difficulty}</instruction>
  <instruction>Create 5-8 diverse tasks that test different skills and understanding levels.</instruction>
  <instruction>Include a mix of question types: conceptual, analytical, problem-solving, and application-based.</instruction>
</instructions>

<output_format>
  <format_type>Markdown</format_type>
  <requirements>
    <requirement>Use proper markdown formatting with headers, lists, and emphasis.</requirement>
    <requirement>Use LaTeX notation for all mathematical formulas, enclosed in $ for inline math or $$ for display math.</requirement>
    <requirement>Structure each task clearly with a task number, description, and any necessary context.</requirement>
    <requirement>For mathematics, physics, or chemistry: include proper LaTeX formatting for equations, symbols, and expressions.</requirement>
    <requirement>Start with a brief introduction about the topic.</requirement>
    <requirement>End with a note about the expected approach or skills being tested.</requirement>
  </requirements>

  <example_latex>
    Inline math: The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

    Display math:
    $$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$
  </example_latex>
</output_format>

<quality_standards>
  <standard>Ensure tasks are appropriate for ${difficulty} difficulty level.</standard>
  <standard>Make tasks relevant to real-world applications where possible.</standard>
  <standard>Provide clear, unambiguous task descriptions.</standard>
  <standard>For IB curriculum: align with assessment objectives and command terms.</standard>
</quality_standards>
</system>`;

    const userPrompt = `Generate practice tasks for studying ${subject}, specifically on the topic of "${topic}" at ${difficulty} difficulty level.`;

    // Use streaming with GPT-4 Chat Completions API
    const stream = await client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 2000,
    });

    // Create a ReadableStream to stream the response
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ delta })}\n\n`)
              );
            }

            if (chunk.choices[0]?.finish_reason === 'stop') {
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify({ done: true })}\n\n`)
              );
              controller.close();
            }
          }
        } catch (error) {
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
