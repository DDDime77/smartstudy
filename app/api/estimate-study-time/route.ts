/**
 * AI-based Study Time Estimation API
 * Uses GPT-4 to estimate realistic study hours needed for exam preparation
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const {
      subject,
      paperType,
      units,
      daysUntilExam,
      availableHours,
      gradeLevel,
      educationSystem,
      educationProgram,
    } = await req.json();

    // Validate required fields
    if (!subject || !paperType || !units || !daysUntilExam || !gradeLevel || !educationSystem) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate units array
    if (!Array.isArray(units) || units.length === 0) {
      return NextResponse.json(
        { error: 'Units must be a non-empty array' },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an expert educational advisor specializing in exam preparation time estimation.

Your task is to estimate the TOTAL number of hours a student needs to prepare for an upcoming exam, based on the following factors:

STUDENT CONTEXT:
- Education System: ${educationSystem}
- Education Program: ${educationProgram || educationSystem}
- Grade Level: ${gradeLevel}

EXAM DETAILS:
- Subject: ${subject}
- Paper Type: ${paperType}
- Units/Topics to Cover: ${units.join(', ')}
- Days Until Exam: ${daysUntilExam}
- Available Study Hours: ${availableHours || 'Not specified'} hours

ESTIMATION GUIDELINES:

1. **Subject Complexity**: Consider the inherent difficulty of the subject
2. **Paper Type Weight**: Different exam papers require different preparation intensity
   - Paper 1 (MCQ/Short answer): Usually less intensive
   - Paper 2 (Essay/Long form): More intensive, requires deeper understanding
   - Paper 3 (Data analysis): Moderate, requires practice with problem-solving
   - Internal Assessment/IA: Very intensive, requires research and writing
   - Extended Essay: Most intensive, requires extensive research
   - Coursework/NEA: Similar to IA, project-based

3. **Unit Coverage**: Estimate hours per unit based on:
   - Breadth of content in each unit
   - Typical difficulty level for this subject and grade
   - Prior knowledge assumption (student has attended classes)
   - Need for practice problems/past papers

4. **Education System Context**:
   - IB: Typically requires deeper conceptual understanding, essay writing
   - A-Level: Requires detailed content knowledge and application
   - American (AP): Varies by AP vs Standard, focuses on breadth and application

5. **Grade Level**: Higher grades = more complex content = more time needed

6. **Realistic Time Allocation**:
   - Account for learning, review, practice, and consolidation
   - Include time for practice exams/past papers
   - Consider diminishing returns (don't over-estimate)
   - Assume student has been attending classes (not learning from scratch)
   - Be realistic about what can be achieved

7. **Important**:
   - Do NOT simply multiply units by a fixed number
   - Consider the actual content depth and complexity
   - Account for overlap between units
   - Consider exam format requirements (essays, problem-solving, etc.)

OUTPUT FORMAT:
Provide your response as a JSON object with EXACTLY this structure:
{
  "estimatedHours": <number>,
  "breakdown": {
    "<unit1>": <hours>,
    "<unit2>": <hours>
  },
  "reasoning": "<brief 2-3 sentence explanation>",
  "recommendation": "<one sentence about whether available hours are sufficient>"
}

CRITICAL: Respond ONLY with valid JSON. No markdown, no code blocks, just the JSON object.`;

    const userPrompt = `Estimate the study hours needed for this exam preparation.`;

    console.log('🤖 Calling OpenAI for time estimation...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 10000,
    });

    const responseContent = completion.choices[0].message.content;

    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    let result;
    try {
      result = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', responseContent);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate response structure
    if (
      typeof result.estimatedHours !== 'number' ||
      typeof result.breakdown !== 'object' ||
      typeof result.reasoning !== 'string' ||
      typeof result.recommendation !== 'string'
    ) {
      console.error('Invalid response structure:', result);
      throw new Error('AI response missing required fields');
    }

    // Ensure estimatedHours is reasonable (between 2 and 200 hours)
    if (result.estimatedHours < 2 || result.estimatedHours > 200) {
      console.warn('AI estimated unreasonable hours:', result.estimatedHours);
      result.estimatedHours = Math.max(2, Math.min(200, result.estimatedHours));
    }

    console.log('✅ AI estimation successful:', result.estimatedHours, 'hours');

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Study time estimation error:', error);

    // Return detailed error for debugging
    return NextResponse.json(
      {
        error: 'Failed to estimate study time',
        details: error.message || 'Unknown error',
        fallback: true,
      },
      { status: 500 }
    );
  }
}
