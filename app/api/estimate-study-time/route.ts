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

    const systemPrompt = `You are an expert educational advisor specializing in REALISTIC exam preparation time estimation.

Your task is to estimate the TOTAL number of hours a student needs to prepare for an upcoming exam.

CRITICAL CONSTRAINT: The student has ${availableHours || 'limited'} hours available until the exam. Your estimate MUST be achievable within this timeframe.

STUDENT CONTEXT:
- Education System: ${educationSystem}
- Education Program: ${educationProgram || educationSystem}
- Grade Level: ${gradeLevel}

EXAM DETAILS:
- Subject: ${subject}
- Paper Type: ${paperType}
- Units/Topics to Cover: ${units.join(', ')} (${units.length} units total)
- Days Until Exam: ${daysUntilExam}
- Available Study Hours: ${availableHours || 'Not specified'} hours

ESTIMATION GUIDELINES:

1. **REALISTIC & ACHIEVABLE**:
   - The estimate MUST fit within ${availableHours} hours (student's actual available time)
   - Target 60-80% of available time for healthy balance (leave buffer for rest/life)
   - For short timeframes (< 7 days), you can use up to 85% of available hours
   - NEVER exceed available hours - prioritize most important content

2. **Assume Prior Knowledge**:
   - Student has attended ALL classes and has basic understanding
   - This is REVIEW and PRACTICE, NOT learning from scratch
   - Focus on consolidation, practice problems, and exam technique
   - NOT building foundational knowledge

3. **Paper Type Time Requirements** (revision, not initial learning):
   - Paper 1 (MCQ/Short): 3-5 hours per unit (quick review + practice)
   - Paper 2 (Essay/Long): 4-6 hours per unit (deeper review + writing practice)
   - Paper 3 (Data/Problem): 4-6 hours per unit (problem sets + practice)
   - Internal Assessment/IA: 8-12 hours total (refinement + polishing)
   - Extended Essay: 10-15 hours total (editing + bibliography)
   - Coursework/NEA: 8-12 hours total (review + improvements)

4. **Unit Coverage Strategy**:
   - Per unit calculation for review: 2-6 hours depending on complexity
   - Account for overlap between units (don't double-count)
   - Prioritize high-weight topics over low-weight ones
   - Include 2-3 hours for full practice exams/past papers

5. **Time Efficiency**:
   - Students with good attendance need LESS time (not more)
   - Diminishing returns after certain point - more time ≠ better results
   - Quality > Quantity: focused study is more effective
   - Leave time for rest, meals, breaks (essential for retention)

6. **Calculation Method**:
   - Calculate ideal hours needed for thorough review
   - Compare to available hours
   - If ideal > available: scale down to fit (prioritize core content)
   - If ideal < available: don't inflate estimate - use the lower number
   - Final estimate should be 60-80% of available hours (85% max for urgent exams)

EXAMPLE CALCULATIONS:

Example 1: 5 units, Paper 2, 30 available hours, 10 days
- Per unit: 4 hours × 5 = 20 hours
- Practice exams: 3 hours
- Total ideal: 23 hours
- Available: 30 hours
- Recommendation: 23 hours (77% of available - perfect balance)

Example 2: 8 units, Paper 1, 20 available hours, 3 days (urgent!)
- Ideal per unit: 3 hours × 8 = 24 hours
- BUT only 20 hours available
- Scale down: Focus on 6 most important units (3 hours each = 18 hours)
- Recommendation: 17 hours (85% of available, 2 units briefly reviewed)

OUTPUT FORMAT:
Provide your response as a JSON object with EXACTLY this structure:
{
  "estimatedHours": <number between 0.6*availableHours and 0.85*availableHours>,
  "breakdown": {
    "<unit1>": <hours>,
    "<unit2>": <hours>
  },
  "reasoning": "<2-3 sentences: why this amount, how it fits available time, study approach>",
  "recommendation": "<realistic assessment: sufficient/tight/need to prioritize>"
}

CRITICAL RULES:
- estimatedHours MUST be ≤ ${availableHours ? availableHours * 0.85 : 100} (85% of available time maximum)
- estimatedHours SHOULD be around ${availableHours ? Math.round(availableHours * 0.7) : 70}h (70% target for balance)
- Focus on REVIEW not learning from scratch
- Be realistic - students have other commitments
- Respond ONLY with valid JSON. No markdown, no code blocks.`;

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
      max_tokens: 4000, // GPT-4 Turbo max is 4096, using 4000 to be safe
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

    // Ensure estimatedHours respects available time constraints
    const minHours = 2; // Absolute minimum
    const maxHours = availableHours ? availableHours * 0.85 : 200; // 85% of available or 200 max
    const targetHours = availableHours ? availableHours * 0.7 : 70; // 70% target

    let originalEstimate = result.estimatedHours;

    // Clamp to reasonable range
    if (result.estimatedHours < minHours) {
      console.warn(`AI estimated too low: ${result.estimatedHours}h, using minimum ${minHours}h`);
      result.estimatedHours = minHours;
    } else if (result.estimatedHours > maxHours) {
      console.warn(`AI estimated too high: ${result.estimatedHours}h (${availableHours}h available), capping at ${maxHours.toFixed(1)}h (85%)`);
      result.estimatedHours = Math.round(maxHours);
      result.recommendation = `Time is tight! Focus on high-priority topics. Original estimate was ${originalEstimate}h but only ${availableHours}h available.`;
    }

    console.log('✅ AI estimation successful:', result.estimatedHours, 'hours', availableHours ? `(${Math.round((result.estimatedHours / availableHours) * 100)}% of available)` : '');

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
