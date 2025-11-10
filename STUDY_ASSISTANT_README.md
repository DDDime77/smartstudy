# Study Assistant Documentation

## Overview

The Study Assistant is an AI-powered feature that combines **lightweight ML models** with **LLM orchestration** to provide personalized study recommendations, task prioritization, and academic guidance.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Study Assistant Flow                      │
│                                                               │
│  Student Data (DB) → ML Models (Predictions) → LLM (GPT-4)  │
│         ↓                     ↓                      ↓        │
│   [Exams, Goals,      [Priority Scores,      [Natural Lang.  │
│    Sessions, Tasks]    Time Estimates,        Recommendations,│
│                        Performance Trends]    Task Assignments]│
└─────────────────────────────────────────────────────────────┘
```

### Components

1. **Lightweight ML Models** (`/lib/ml/studyAssistantML.ts`)
   - PersonalizedTimeEstimator: Predicts task completion time
   - PerformanceTrendAnalyzer: Detects improving/declining performance
   - PriorityScorer: Ranks exams and assignments by urgency
   - StudySessionOptimizer: Suggests optimal study sessions

2. **Context Aggregation** (`/lib/services/studyAssistantContext.ts`)
   - Pulls all student data from database
   - Runs ML models on the data
   - Formats comprehensive context for LLM

3. **LLM Integration** (`/app/api/study-assistant/route.ts`)
   - Takes ML-enriched context
   - Uses GPT-4 to generate natural language recommendations
   - Assigns specific tasks based on priorities

4. **Frontend** (`/app/dashboard/assistant/page.tsx`)
   - Displays AI recommendations
   - Shows prioritized tasks
   - Provides chat interface

## Database Schema

### New Tables

#### `exams`
Stores upcoming exams and assessments
```sql
- id: UUID (primary key)
- student_id: UUID (foreign key)
- subject: VARCHAR(255)
- title: VARCHAR(255)
- exam_date: TIMESTAMP
- weight: DECIMAL(5,2) -- percentage of final grade
- status: VARCHAR(50) -- upcoming, in_progress, completed
```

#### `assignments`
Tracks homework and assignments
```sql
- id: UUID
- student_id: UUID
- subject: VARCHAR(255)
- title: VARCHAR(255)
- due_date: TIMESTAMP
- estimated_hours: DECIMAL(4,2)
- priority: VARCHAR(50) -- low, medium, high, urgent
- completion_percentage: INTEGER
- status: VARCHAR(50) -- pending, in_progress, completed, overdue
```

#### `student_goals`
Stores academic goals (e.g., "Get A in Calculus")
```sql
- id: UUID
- student_id: UUID
- subject: VARCHAR(255)
- goal_type: VARCHAR(100) -- grade, mastery, completion_rate
- target_value: VARCHAR(100) -- "A", "90%", "15 hours/week"
- current_value: VARCHAR(100)
- progress_percentage: INTEGER
```

#### `assistant_recommendations`
Caches AI recommendations
```sql
- id: UUID
- student_id: UUID
- recommendation_type: VARCHAR(100) -- task, study_session, review, break
- title: VARCHAR(255)
- priority_score: DECIMAL(5,2)
- reasoning: TEXT
- suggested_date: TIMESTAMP
```

## How ML Works

### 1. Time Estimation
**Algorithm**: Exponentially Weighted Moving Average
**Input**: Student's past task completion times
**Output**: Personalized time estimate for new tasks

```typescript
// Example: Student typically takes 1.5x longer than AI estimates
const baseEstimate = 10; // minutes
const personalizedEstimate = 10 * 1.5 = 15; // minutes
```

### 2. Performance Trend Analysis
**Algorithm**: Linear Regression on Success Rate
**Input**: Last 20 task attempts
**Output**: Trend (improving/stable/declining)

```typescript
// Example:
// Tasks 1-10: 60% success rate
// Tasks 11-20: 80% success rate
// Slope = +0.1 → "improving"
```

### 3. Priority Scoring
**Algorithm**: Multi-factor scoring (0-100)
**Factors**:
- Urgency (40 points): Days until exam/assignment
- Importance (30 points): Weight in final grade
- Preparation Gap (30 points): Predicted prep time vs. actual prep time

```typescript
// Example:
// Exam in 2 days (urgent=35) + 30% of grade (weight=9) + 5h prep gap (gap=25)
// Total priority = 69/100
```

### 4. Session Optimization
**Algorithm**: Spaced Repetition + Performance-Based Selection
**Input**: Study history, upcoming exams, performance by topic
**Output**: Recommended subject, topics, and duration

```typescript
// Example:
// Calculus exam in 5 days + 45% success rate in calculus
// → Recommend: 45-min session on weak calculus topics
```

## API Endpoints

### POST `/api/study-assistant`
Get AI recommendations and task assignments

**Request**:
```json
{
  "studentId": "uuid",
  "query": "What should I focus on today?" // optional
}
```

**Response**:
```json
{
  "recommendation": "Based on your performance...",
  "taskAssignments": [
    {
      "type": "exam_prep",
      "title": "Prepare for Calculus Midterm",
      "priority": 85,
      "estimatedMinutes": 120,
      "dueBy": "2025-11-15"
    }
  ],
  "context": {
    "summary": { ... },
    "topPriorities": { ... }
  }
}
```

### GET `/api/study-assistant?studentId=X&message=Y`
Chat with assistant (streaming)

**Returns**: Streaming text response

## Usage Example

### 1. Create Exam
```typescript
import { ExamsService } from '@/services/db/Exams.service';

await ExamsService.create({
  student_id: 'user-id',
  subject: 'Calculus',
  title: 'Midterm Exam',
  exam_date: new Date('2025-11-20'),
  weight: 30 // 30% of final grade
});
```

### 2. Create Goal
```typescript
import { GoalsService } from '@/services/db/Goals.service';

await GoalsService.create({
  student_id: 'user-id',
  subject: 'Calculus',
  goal_type: 'grade',
  target_value: 'A',
  current_value: 'B+',
  deadline: new Date('2025-12-15')
});
```

### 3. Get Recommendations
The assistant automatically analyzes all data and provides recommendations when the page loads.

## Adding MCPs (Future Enhancement)

MCPs (Model Context Protocol) can extend the assistant with external data sources.

### Example: Google Calendar Integration

1. **Install MCP Server**:
```bash
npm install -g @modelcontextprotocol/server-google-calendar
```

2. **Configure** (create `.mcp/config.json`):
```json
{
  "mcpServers": {
    "google-calendar": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-google-calendar"],
      "env": {
        "GOOGLE_CLIENT_ID": "your-client-id",
        "GOOGLE_CLIENT_SECRET": "your-secret"
      }
    }
  }
}
```

3. **Use in Assistant**:
```typescript
// In studyAssistantContext.ts
import { MCPClient } from '@modelcontextprotocol/client';

const mcpClient = new MCPClient();
const calendarEvents = await mcpClient.call('google-calendar', 'list-events', {
  startDate: new Date(),
  endDate: addDays(new Date(), 30)
});

// Merge with existing exams
const allExams = [...exams, ...calendarEvents.map(e => ({
  title: e.summary,
  exam_date: e.start,
  subject: 'Unknown' // or parse from event
}))];
```

### Useful MCPs for Study Assistant

1. **Calendar** (`@modelcontextprotocol/server-google-calendar`)
   - Auto-import exam dates
   - Sync assignment deadlines

2. **File System** (`@modelcontextprotocol/server-filesystem`)
   - Analyze uploaded study materials
   - Extract topics from PDFs

3. **Web Search** (`@modelcontextprotocol/server-brave-search`)
   - Find study resources
   - Recommend Khan Academy videos

4. **LMS Integration** (custom MCP)
   - Connect to Canvas/Moodle
   - Auto-import assignments and grades

## Benefits of This Architecture

### Why Lightweight ML + LLM?

1. **Fast**: ML models run in <100ms, no GPU needed
2. **Cheap**: ML is free, only pay for LLM calls
3. **Interpretable**: Can debug ML predictions easily
4. **Accurate**: ML provides data-driven insights, LLM provides natural language

### Why Not Just LLM?

❌ **Pure LLM Issues**:
- Hallucinations in numerical predictions
- Expensive to call repeatedly
- No learning from user data
- Can't do complex calculations reliably

✅ **ML + LLM Advantages**:
- ML handles calculations (time, priority, trends)
- LLM handles natural language and reasoning
- Best of both worlds

### Why Not Just ML?

❌ **Pure ML Issues**:
- Can't explain recommendations naturally
- Fixed output format
- No conversational ability

✅ **ML + LLM Advantages**:
- ML provides accurate predictions
- LLM explains them naturally
- Can chat with users

## Performance Considerations

### Caching Strategy

1. **ML Predictions**: Cache for 1 hour
```typescript
// ml_predictions table with expires_at
```

2. **Context**: Cache for 5 minutes
```typescript
const cached = await redis.get(`context:${studentId}`);
if (cached && cached.timestamp > Date.now() - 5*60*1000) {
  return cached.data;
}
```

3. **LLM Responses**: Don't cache (personalized)

### Cost Optimization

**Current Cost** (per student per day):
- ML models: $0 (runs on your server)
- GPT-4 calls: ~$0.03 (assuming 3 calls/day at ~500 tokens each)
- **Total**: ~$1/month per active student

**At Scale** (1000 students):
- ML: Still $0
- GPT-4: ~$1000/month
- Consider switching to GPT-3.5-turbo (~$100/month) or local LLM

## Future Enhancements

1. **Soft Prompts** (if you self-host LLM)
   - Train subject-specific soft prompts
   - Reduce token usage
   - More consistent output

2. **Reinforcement Learning**
   - Track if students follow recommendations
   - Adjust ML models based on outcomes

3. **Collaborative Filtering**
   - "Students like you found topic X challenging"
   - Recommend study partners

4. **Predictive Alerts**
   - "Your calculus performance suggests you might struggle with the exam"
   - "You're on track to miss your goal deadline"

## Troubleshooting

### "ML predictions are inaccurate"
→ Need more data. ML models require 10-20 data points per subject to be accurate.

### "LLM recommendations are generic"
→ Add more context to the system prompt. Include specific student struggles.

### "Assistant is slow"
→ Check if ML models are running efficiently. Consider caching more aggressively.

### "Recommendations don't match priorities"
→ Adjust priority scoring algorithm weights in `PriorityScorer` class.

## Testing

```bash
# Test ML models
npm run test lib/ml/studyAssistantML.test.ts

# Test context aggregation
npm run test lib/services/studyAssistantContext.test.ts

# Test API
curl -X POST http://localhost:3000/api/study-assistant \
  -H "Content-Type: application/json" \
  -d '{"studentId":"test-id"}'
```

## License

Part of SmartStudy application.
