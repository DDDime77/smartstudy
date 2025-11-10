/**
 * Quick test to verify the AI estimation API endpoint works correctly
 */

async function testEstimationAPI() {
  console.log('🧪 Testing AI Estimation API Endpoint...\n');

  const testPayload = {
    subject: 'Economics',
    paperType: 'Paper 2',
    units: ['Macroeconomics', 'Microeconomics'],
    daysUntilExam: 14,
    availableHours: 30,
    gradeLevel: '12',
    educationSystem: 'IB',
    educationProgram: 'IB Diploma Programme'
  };

  console.log('📋 Request Payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('\n⏳ Calling API...\n');

  try {
    const response = await fetch('http://localhost:4000/api/estimate-study-time', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('📡 Response Status:', response.status, response.statusText);

    const data = await response.json();

    if (response.ok) {
      console.log('\n✅ SUCCESS! AI Estimation Result:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n═══════════════════════════════════════════════════');
      console.log('📊 SUMMARY');
      console.log('═══════════════════════════════════════════════════');
      console.log(`Estimated Hours: ${data.estimatedHours}`);
      console.log(`Available Hours: ${testPayload.availableHours}`);
      console.log(`Difference: ${testPayload.availableHours - data.estimatedHours} hours`);
      console.log('\nBreakdown:');
      Object.entries(data.breakdown).forEach(([unit, hours]) => {
        console.log(`  • ${unit}: ${hours} hours`);
      });
      console.log(`\n💡 Reasoning: ${data.reasoning}`);
      console.log(`\n🎯 Recommendation: ${data.recommendation}`);
      console.log('═══════════════════════════════════════════════════\n');
    } else {
      console.error('\n❌ ERROR Response:');
      console.error(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

testEstimationAPI();
