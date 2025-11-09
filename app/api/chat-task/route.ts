import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { messages, task, solution, answer } = await request.json();

    // Build system message with task context
    const systemMessage = {
      role: 'system' as const,
      content: `You are a helpful AI tutor assisting a student with understanding a practice task. Here is the context:

TASK:
${task}

SOLUTION:
${solution}

ANSWER:
${answer}

Your role is to:
- Help the student understand the concepts involved
- Explain the solution step by step if asked
- Clarify any confusing parts
- Provide hints without giving away the entire answer immediately
- Encourage critical thinking
- Use clear, educational language

Be patient, supportive, and adapt your explanations to the student's level of understanding.`,
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [systemMessage, ...messages],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const aiMessage = completion.choices[0].message.content;

    return NextResponse.json({ message: aiMessage });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to get AI response', details: error.message },
      { status: 500 }
    );
  }
}
