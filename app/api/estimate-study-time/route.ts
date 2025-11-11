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

CRITICAL CONSTRAINT: The student can dedicate MAX 2 HOURS PER DAY for this exam preparation (they have other subjects and commitments). Available time: ${availableHours || 'limited'} hours total. Your estimate MUST fit within this limit.

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

1. **REALISTIC & ACHIEVABLE** (2-Hour Daily Limit):
   - Student can study MAX 2 hours per day for this ONE exam (they have multiple subjects)
   - Available time budget: ${daysUntilExam} days × 2h/day = ${availableHours} hours total
   - Target 60-75% of available time for sustainable studying (leave margin for life)
   - For urgent exams (< 5 days), you can use up to 80% of available hours
   - NEVER exceed available hours - quality over quantity

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

EXAMPLE CALCULATIONS (2h/day limit):

Example 1: 5 units, Paper 2, 10 days until exam
- Budget: 10 days × 2h/day = 20h available
- Per unit: 3h review × 5 = 15h
- Practice exam: 2h
- Total: 17h (85% of 20h - good balance)

Example 2: 8 units, Paper 1, 3 days until exam (urgent!)
- Budget: 3 days × 2h/day = 6h available
- Ideal: 3h × 8 units = 24h (impossible!)
- Reality: Focus on 4 highest-weight units (1h each = 4h)
- Quick review of others: 0.5h each × 4 = 2h
- Total: 4.5h (75% of 6h - prioritized approach)

Example 3: 3 units, Paper 3, 14 days until exam
- Budget: 14 days × 2h/day = 28h available
- Per unit: 4h × 3 = 12h
- Problem sets: 3h
- Practice exams: 3h
- Total: 18h (64% of 28h - comfortable pace)

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

CRITICAL RULES (2-Hour Daily Budget):
- Maximum daily study time per subject: 2 hours
- estimatedHours MUST be ≤ ${availableHours ? Math.round(availableHours * 0.8) : 100}h (80% of ${daysUntilExam} days × 2h/day)
- estimatedHours SHOULD be around ${availableHours ? Math.round(availableHours * 0.65) : 65}h (65% target - sustainable pace)
- Remember: Student has OTHER subjects too - this is just ONE exam
- Focus on REVIEW not learning from scratch
- Quality focused study > long hours of unfocused study
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

    // Ensure estimatedHours respects 2-hour daily limit constraints
    const minHours = 2; // Absolute minimum
    const maxHours = availableHours ? availableHours * 0.8 : 200; // 80% of available (2h/day × days)
    const targetHours = availableHours ? availableHours * 0.65 : 65; // 65% target (sustainable pace)

    let originalEstimate = result.estimatedHours;

    // Clamp to reasonable range
    if (result.estimatedHours < minHours) {
      console.warn(`AI estimated too low: ${result.estimatedHours}h, using minimum ${minHours}h`);
      result.estimatedHours = minHours;
    } else if (result.estimatedHours > maxHours) {
      console.warn(`AI estimated too high: ${result.estimatedHours}h (${availableHours}h available at 2h/day), capping at ${maxHours.toFixed(1)}h (80%)`);
      result.estimatedHours = Math.round(maxHours);
      result.recommendation = `Time is tight! With 2h/day limit (${daysUntilExam} days), focus on highest-priority topics. Original estimate was ${originalEstimate}h but only ${availableHours}h available.`;
    }

    const dailyAverage = availableHours ? (result.estimatedHours / daysUntilExam).toFixed(1) : 'N/A';
    console.log('✅ AI estimation successful:', result.estimatedHours, 'hours', availableHours ? `(${Math.round((result.estimatedHours / availableHours) * 100)}% of ${availableHours}h budget, ~${dailyAverage}h/day)` : '');

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
