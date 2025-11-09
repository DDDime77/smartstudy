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

    // Combined prompt for o1-mini (doesn't use system messages)
    const fullPrompt = `You are an expert educational content generator specializing in creating practice tasks and exercises for students.

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
- Use LaTeX notation for all mathematical formulas:
  * Inline math: enclosed in $ symbols (e.g., $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$)
  * Display math: enclosed in $$ symbols (e.g., $$\\int_{0}^{\\infty} e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$)
- Structure each task clearly with a task number, description, and any necessary context
- For mathematics, physics, or chemistry: include proper LaTeX formatting for equations, symbols, and expressions
- Start with a brief introduction about the topic
- End with a note about the expected approach or skills being tested

Please generate the practice tasks now.`;

    // Use o1-mini with high reasoning effort (no streaming support)
    const completion = await client.chat.completions.create({
      model: 'o1-mini',
      messages: [
        { role: 'user', content: fullPrompt }
      ],
      reasoning_effort: 'high',
      max_completion_tokens: 10000,
    });

    const content = completion.choices[0]?.message?.content || '';

    // Return as JSON since o1-mini doesn't support streaming
    return NextResponse.json({
      content,
      done: true
    });
  } catch (error: any) {
    console.error('Error generating tasks:', error);
    return NextResponse.json(
      { error: 'Failed to generate tasks', details: error.message },
      { status: 500 }
    );
  }
}
