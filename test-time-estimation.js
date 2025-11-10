/**
 * Test script for AI-based exam preparation time estimation
 */

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function estimateStudyTime(params) {
  const {
    subject,
    paperType,
    units,
    daysUntilExam,
    availableHours,
    gradeLevel,
    educationSystem,
    educationProgram
  } = params;

  const systemPrompt = `You are an expert educational advisor specializing in exam preparation time estimation.

Your task is to estimate the TOTAL number of hours a student needs to prepare for an upcoming exam, based on the following factors:

STUDENT CONTEXT:
- Education System: ${educationSystem}
- Education Program: ${educationProgram}
- Grade Level: ${gradeLevel}

EXAM DETAILS:
- Subject: ${subject}
- Paper Type: ${paperType}
- Units/Topics to Cover: ${units.join(', ')}
- Days Until Exam: ${daysUntilExam}
- Available Study Hours: ${availableHours} hours

ESTIMATION GUIDELINES:

1. **Subject Complexity**: Consider the inherent difficulty of the subject
2. **Paper Type Weight**: Different exam papers require different preparation intensity
   - Paper 1 (MCQ/Short answer): Usually less intensive
   - Paper 2 (Essay/Long form): More intensive, requires deeper understanding
   - Paper 3 (Data analysis): Moderate, requires practice with problem-solving
   - Internal Assessment: Very intensive, requires research and writing
   - Extended Essay: Most intensive, requires extensive research

3. **Unit Coverage**: Estimate hours per unit based on:
   - Breadth of content in each unit
   - Typical difficulty level for this subject and grade
   - Prior knowledge assumption (student has attended classes)

4. **Education System Context**:
   - IB: Typically requires deeper conceptual understanding
   - A-Level: Requires detailed content knowledge
   - American: Varies by AP vs Standard

5. **Grade Level**: Higher grades = more complex content = more time

6. **Realistic Time Allocation**:
   - Account for learning, review, practice, and consolidation
   - Include time for practice exams/past papers
   - Consider diminishing returns (don't over-estimate)

OUTPUT FORMAT:
Provide your response as a JSON object with:
{
  "estimatedHours": <number>,
  "breakdown": {
    "<unit1>": <hours>,
    "<unit2>": <hours>,
    ...
  },
  "reasoning": "<brief explanation of your estimation>",
  "recommendation": "<whether the available hours are sufficient, too much, or too little>"
}

Be realistic and evidence-based. Consider that the student has already been attending classes.`;

  const userPrompt = `Estimate the study hours needed for this exam preparation.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const response = JSON.parse(completion.choices[0].message.content);
    return response;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw error;
  }
}

// Test with the example: Economics IB Grade 12, Macroeconomics unit, 15 hours available
async function runTest() {
  console.log('🧪 Testing AI-based time estimation...\n');

  const testParams = {
    subject: 'Economics',
    paperType: 'Paper 2',
    units: ['Macroeconomics'],
    daysUntilExam: 14,
    availableHours: 15,
    gradeLevel: '12',
    educationSystem: 'IB',
    educationProgram: 'IB Diploma Programme'
  };

  console.log('📋 Input Parameters:');
  console.log(JSON.stringify(testParams, null, 2));
  console.log('\n⏳ Calling OpenAI API...\n');

  const result = await estimateStudyTime(testParams);

  console.log('📊 AI Estimation Result:');
  console.log(JSON.stringify(result, null, 2));
  console.log('\n');

  // Display in a more readable format
  console.log('═══════════════════════════════════════════════════════');
  console.log('📈 EXAM PREPARATION TIME ESTIMATION');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`\n📚 Subject: ${testParams.subject} (${testParams.paperType})`);
  console.log(`🎓 Level: ${testParams.educationSystem} ${testParams.educationProgram}, Grade ${testParams.gradeLevel}`);
  console.log(`📖 Units: ${testParams.units.join(', ')}`);
  console.log(`📅 Days Until Exam: ${testParams.daysUntilExam}`);
  console.log(`⏰ Available Hours: ${testParams.availableHours}`);
  console.log('\n───────────────────────────────────────────────────────');
  console.log(`\n✨ ESTIMATED HOURS NEEDED: ${result.estimatedHours} hours`);
  console.log('\n📋 Breakdown by Unit:');
  Object.entries(result.breakdown).forEach(([unit, hours]) => {
    console.log(`   • ${unit}: ${hours} hours`);
  });
  console.log(`\n💡 Reasoning:\n   ${result.reasoning}`);
  console.log(`\n🎯 Recommendation:\n   ${result.recommendation}`);
  console.log('\n═══════════════════════════════════════════════════════\n');

  // Calculate comparison
  const difference = testParams.availableHours - result.estimatedHours;
  const percentage = ((testParams.availableHours / result.estimatedHours) * 100).toFixed(1);

  console.log('📊 Analysis:');
  if (difference > 0) {
    console.log(`   ✅ You have ${difference} extra hours (${percentage}% of needed time)`);
  } else if (difference < 0) {
    console.log(`   ⚠️  You need ${Math.abs(difference)} more hours (only ${percentage}% of needed time available)`);
  } else {
    console.log(`   ✅ Perfect match! Available hours match estimated needs`);
  }
  console.log('\n');
}

runTest().catch(console.error);
