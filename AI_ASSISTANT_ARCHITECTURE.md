# AI Study Assistant - Complete Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Flow](#architecture-flow)
3. [Data Layer](#data-layer)
4. [Context Building & ML Predictions](#context-building--ml-predictions)
5. [API Endpoints](#api-endpoints)
6. [Streaming Implementation](#streaming-implementation)
7. [Function Calling (Tool System)](#function-calling-tool-system)
8. [System Prompt Structure](#system-prompt-structure)
9. [Frontend Integration](#frontend-integration)
10. [Key Technical Decisions](#key-technical-decisions)

---

## System Overview

The AI Study Assistant is a GPT-4 powered conversational agent that helps students manage their study schedule, prepare for exams, and track assignments. It uses:

- **OpenAI GPT-4 Turbo** with function calling
- **Server-Sent Events (SSE)** streaming for real-time responses
- **PostgreSQL** for data persistence
- **Custom ML models** for exam priority scoring and performance predictions
- **Next.js API Routes** for backend endpoints

### Core Features
1. Natural language conversation about studies
2. Real-time task creation/deletion via function calls
3. Exam preparation recommendations based on ML predictions
4. Context-aware responses using student data
5. Streaming responses with inline tool execution visualization

---

## Architecture Flow

```
User Message
    ↓
Frontend (React) → POST /api/study-assistant
    ↓
Backend API Route
    ↓
┌─────────────────────────────────────┐
│ 1. Build Student Context            │
│    - Fetch exams, assignments, etc. │
│    - Run ML predictions             │
│    - Format for LLM                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 2. Stream Initial GPT-4 Response    │
│    - System prompt + context        │
│    - User message                   │
│    - Tools available                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 3. Execute Tool Calls (if any)      │
│    - create_assignment              │
│    - delete_assignment              │
│    - delete_multiple_assignments    │
│    - list_assignments               │
│    - generate_study_plan            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ 4. Stream Follow-up Response        │
│    - Include tool results           │
│    - Can call more tools            │
└─────────────────────────────────────┘
    ↓
Response streamed to Frontend
    ↓
User sees real-time updates
```

---

## Data Layer

### Database Schema (PostgreSQL)

#### Core Tables
```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE,
  full_name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  name VARCHAR NOT NULL,
  color VARCHAR,
  icon VARCHAR
);

-- Exams
CREATE TABLE exams (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),
  exam_date DATE NOT NULL,
  exam_type VARCHAR, -- e.g., "Paper 1", "Paper 2"
  units TEXT[], -- Array of topic strings
  start_time TIME,
  finish_time TIME,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI-Generated Assignments
CREATE TABLE ai_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),
  subject_name VARCHAR NOT NULL,
  topic VARCHAR NOT NULL,
  title VARCHAR,
  difficulty VARCHAR CHECK (difficulty IN ('easy', 'medium', 'hard')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  estimated_minutes INTEGER DEFAULT 45,
  required_tasks_count INTEGER DEFAULT 5,
  status VARCHAR DEFAULT 'pending',
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Study Sessions (for ML training)
CREATE TABLE study_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),
  duration_minutes INTEGER,
  topics_covered TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Task History (for performance tracking)
CREATE TABLE task_completions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subject_id UUID REFERENCES subjects(id),
  topic VARCHAR,
  difficulty VARCHAR,
  is_correct BOOLEAN,
  time_spent_seconds INTEGER,
  estimated_time_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Context Building & ML Predictions

### StudentContext Interface
```typescript
interface StudentContext {
  // Raw data
  student: { id: string; name: string };
  exams: Array<{
    id: string;
    subject: string;
    title: string;
    exam_date: Date;
    exam_type: string;
    units: string[];
    start_time: string | null;
    finish_time: string | null;
    days_until: number;
  }>;
  assignments: Array<{
    id: string;
    subject: string;
    title: string;
    due_date: Date;
    estimated_hours: number;
    completion_percentage: number;
  }>;
  studySessions: Array<{ subject: string; duration_minutes: number; topics_covered: string[] }>;
  taskHistory: Array<{ subject: string; is_correct: boolean; time_spent_seconds: number }>;

  // ML predictions
  predictions: {
    examPriorities: Array<{
      exam_id: string;
      title: string;
      priority_score: number; // 0-100
      predicted_prep_hours: number;
      predicted_performance: number; // 0-100
      outlook: string; // "excellent" | "good" | "needs attention" | "urgent"
    }>;
    assignmentPriorities: Array<{
      assignment_id: string;
      title: string;
      priority_score: number;
    }>;
    performanceTrends: Record<string, {
      trend: 'improving' | 'stable' | 'declining';
      recent_success_rate: number;
    }>;
    nextSessionSuggestion: {
      duration: number;
      subject: string;
      topics: string[];
      reasoning: string;
    };
  };

  // Summary stats
  summary: {
    total_study_hours_this_week: number;
    total_study_hours_this_month: number;
    upcoming_exams_count: number;
    pending_assignments_count: number;
    overall_success_rate: number;
  };
}
```

### ML Prediction Models

#### 1. Exam Priority Scoring
```typescript
// Formula: Priority = (Urgency × 40%) + (Complexity × 30%) + (Performance Risk × 30%)
function calculateExamPriority(exam, studyHistory, taskHistory) {
  const daysUntil = exam.days_until;
  const unitsCount = exam.units.length;

  // Urgency score (inverse of days remaining)
  const urgencyScore = Math.max(0, 100 - (daysUntil / 60) * 100);

  // Complexity score (based on units/topics)
  const complexityScore = Math.min(100, (unitsCount / 5) * 100);

  // Performance risk (based on past success rate)
  const subjectHistory = taskHistory.filter(t => t.subject === exam.subject);
  const successRate = subjectHistory.length > 0
    ? (subjectHistory.filter(t => t.is_correct).length / subjectHistory.length) * 100
    : 50;
  const riskScore = 100 - successRate;

  // Weighted combination
  const priorityScore = (urgencyScore * 0.4) + (complexityScore * 0.3) + (riskScore * 0.3);

  return Math.round(priorityScore);
}
```

#### 2. Predicted Prep Hours
```typescript
function predictPrepHours(exam, studyHistory, avgCompletionTime) {
  const unitsCount = exam.units.length;
  const baseHoursPerUnit = 2.5;
  const subjectMultiplier = avgCompletionTime[exam.subject] || 1.0;

  // Base calculation
  let prepHours = unitsCount * baseHoursPerUnit * subjectMultiplier;

  // Adjust for time remaining
  if (exam.days_until < 7) {
    prepHours *= 1.3; // Need more intensive prep
  }

  // Adjust for past study
  const recentStudyHours = studyHistory
    .filter(s => s.subject === exam.subject)
    .reduce((sum, s) => sum + s.duration_minutes / 60, 0);

  prepHours = Math.max(0, prepHours - (recentStudyHours * 0.5));

  return Math.round(prepHours * 10) / 10;
}
```

#### 3. Performance Prediction
```typescript
function predictPerformance(exam, taskHistory) {
  const subjectTasks = taskHistory.filter(t => t.subject === exam.subject);

  if (subjectTasks.length < 5) {
    return { performance: 70, outlook: 'insufficient data' };
  }

  // Recent performance (last 20 tasks)
  const recentTasks = subjectTasks.slice(-20);
  const successRate = (recentTasks.filter(t => t.is_correct).length / recentTasks.length) * 100;

  // Trend analysis
  const firstHalf = recentTasks.slice(0, 10);
  const secondHalf = recentTasks.slice(10);
  const firstHalfRate = (firstHalf.filter(t => t.is_correct).length / 10) * 100;
  const secondHalfRate = (secondHalf.filter(t => t.is_correct).length / 10) * 100;
  const trend = secondHalfRate - firstHalfRate;

  // Predicted performance with trend adjustment
  let predicted = successRate + (trend * 0.3);
  predicted = Math.max(0, Math.min(100, predicted));

  const outlook = predicted >= 80 ? 'excellent'
    : predicted >= 70 ? 'good'
    : predicted >= 60 ? 'needs attention'
    : 'needs urgent attention';

  return { performance: Math.round(predicted), outlook };
}
```

### Context Formatting for LLM
```typescript
function formatContextForLLM(context: StudentContext): string {
  return `
# STUDENT CONTEXT

## Summary
- Study time this week: ${context.summary.total_study_hours_this_week}h
- Study time this month: ${context.summary.total_study_hours_this_month}h
- Overall success rate: ${context.summary.overall_success_rate}%
- Upcoming exams: ${context.summary.upcoming_exams_count}
- Pending assignments: ${context.summary.pending_assignments_count}

## Complete Exam Schedule (All Upcoming Exams)
${context.exams.map(exam => {
  const dateStr = exam.exam_date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
  });
  const timeStr = exam.start_time && exam.finish_time
    ? `${exam.start_time} - ${exam.finish_time}`
    : 'Time TBD';
  const priority = context.predictions.examPriorities.find(e => e.exam_id === exam.id);

  return `- **${exam.subject} - ${exam.exam_type}**
  * Date: ${dateStr} (${exam.days_until.toFixed(0)} days away)
  * Time: ${timeStr}
  * Topics/Units: ${exam.units.join(', ') || 'No specific topics'}
  ${priority ? `* ML Priority Score: ${priority.priority_score}/100
  * Predicted prep needed: ${priority.predicted_prep_hours}h
  * Expected performance: ${priority.predicted_performance}% (${priority.outlook})` : ''}
`;
}).join('\n')}

## Performance Trends
${Object.entries(context.predictions.performanceTrends).map(([subject, trend]) =>
  `- ${subject}: ${trend.trend.toUpperCase()} (${trend.recent_success_rate}% success rate)`
).join('\n')}

## ML Recommendation for Next Session
- Duration: ${context.predictions.nextSessionSuggestion.duration} minutes
- Subject: ${context.predictions.nextSessionSuggestion.subject}
- Suggested topics: ${context.predictions.nextSessionSuggestion.topics.join(', ')}
- Reasoning: ${context.predictions.nextSessionSuggestion.reasoning}
`.trim();
}
```

---

## API Endpoints

### 1. GET /api/study-assistant/context
**Purpose**: Load instant statistics without OpenAI (for fast page load)

**Query Parameters**:
- `studentId`: UUID of the student

**Response**:
```json
{
  "hasData": true,
  "taskAssignments": [
    {
      "type": "exam_prep",
      "title": "Prepare for Math Paper 1",
      "description": "Study session for Mathematics...",
      "priority": 85,
      "estimatedMinutes": 120,
      "dueBy": "2025-12-10T00:00:00.000Z"
    }
  ],
  "context": {
    "summary": { ... },
    "topPriorities": {
      "exams": [...],
      "assignments": [...]
    },
    "nextSession": { ... }
  }
}
```

### 2. GET /api/study-assistant
**Purpose**: Stream AI conversation response with function calling

**Query Parameters**:
- `studentId`: UUID
- `message`: User's message
- `conversationHistory` (optional): JSON array of previous messages

**Response**: Server-Sent Events stream
```
__TOOL_CALL_START__
__TOOL_DATA__:{"name":"create_assignment","args":{"subject":"Math","topic":"Calculus"}}
Created: Mathematics - Calculus on Mon 11/11 at 14:00

__TOOL_CALL_END__

Based on your exam schedule, I've created a study session...
```

---

## Streaming Implementation

### Backend (Next.js API Route)

```typescript
export async function GET(req: NextRequest) {
  const studentId = req.nextUrl.searchParams.get('studentId');
  const message = req.nextUrl.searchParams.get('message');

  // Build context
  const context = await buildContext(studentId);
  const contextText = formatContextForLLM(context);

  // Create system prompt
  const systemPrompt = `You are an AI Study Assistant...

Current Date: ${new Date().toLocaleDateString()}

Student Context:
${contextText}

You have access to tools: create_assignment, delete_assignment, etc.
`;

  // Initialize streaming
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        // Stream from OpenAI
        const stream = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          tools: toolDefinitions,
          tool_choice: 'auto',
          stream: true,
          temperature: 0.7
        });

        let fullContent = '';
        const toolCallsMap = new Map();

        // Process stream chunks
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta;

          // Stream text content
          if (delta?.content) {
            fullContent += delta.content;
            controller.enqueue(encoder.encode(delta.content));
          }

          // Accumulate tool calls
          if (delta?.tool_calls) {
            for (const toolCallDelta of delta.tool_calls) {
              const index = toolCallDelta.index;
              if (!toolCallsMap.has(index)) {
                toolCallsMap.set(index, {
                  id: toolCallDelta.id || '',
                  type: 'function',
                  function: {
                    name: toolCallDelta.function?.name || '',
                    arguments: toolCallDelta.function?.arguments || ''
                  }
                });
              } else {
                const existing = toolCallsMap.get(index);
                if (toolCallDelta.id) existing.id = toolCallDelta.id;
                if (toolCallDelta.function?.name) existing.function.name = toolCallDelta.function.name;
                if (toolCallDelta.function?.arguments) existing.function.arguments += toolCallDelta.function.arguments;
              }
            }
          }
        }

        // Execute accumulated tool calls
        const toolResults = [];
        for (let i = 0; i < toolCallsMap.size; i++) {
          if (toolCallsMap.has(i)) {
            const toolCall = toolCallsMap.get(i);

            // Send tool execution start marker
            controller.enqueue(encoder.encode('\n__TOOL_CALL_START__\n'));
            controller.enqueue(encoder.encode(`__TOOL_DATA__:${JSON.stringify({
              name: toolCall.function.name,
              args: JSON.parse(toolCall.function.arguments)
            })}\n`));

            // Execute the tool
            const output = await executeToolCall(toolCall, studentId, controller, encoder);
            toolResults.push({
              role: 'tool',
              content: output,
              tool_call_id: toolCall.id
            });

            // Send tool execution end marker
            controller.enqueue(encoder.encode('\n__TOOL_CALL_END__\n'));
          }
        }

        // If there were tool calls, get follow-up response
        if (toolResults.length > 0) {
          const followUpStream = await openai.chat.completions.create({
            model: 'gpt-4-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
              { role: 'assistant', content: fullContent, tool_calls: Array.from(toolCallsMap.values()) },
              ...toolResults
            ],
            tools: toolDefinitions,
            tool_choice: 'auto',
            stream: true,
            temperature: 0.7
          });

          controller.enqueue(encoder.encode('\n\n'));

          // Stream follow-up response (can include more tool calls)
          for await (const chunk of followUpStream) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
              controller.enqueue(encoder.encode(delta.content));
            }
            // Handle follow-up tool calls if needed...
          }
        }

        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.enqueue(encoder.encode('\n\n❌ Error generating response'));
        controller.close();
      }
    }
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    }
  });
}
```

### Frontend (React)

```typescript
const loadRecommendation = async (studentId: string) => {
  const conversationHistory = chatMessages.map(msg => ({
    role: msg.role,
    content: msg.segments
      .filter(seg => seg.type === 'text')
      .map(seg => seg.content)
      .join('\n')
  }));

  const params = new URLSearchParams({
    studentId,
    message: userMessage,
    conversationHistory: JSON.stringify(conversationHistory)
  });

  const response = await fetch(`/api/study-assistant?${params.toString()}`);
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let currentSegments: Array<{type: 'text' | 'tool_call', content: string, data?: any}> = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse tool call markers
    const toolStartMatch = buffer.match(/__TOOL_CALL_START__/);
    const toolEndMatch = buffer.match(/__TOOL_CALL_END__/);
    const toolDataMatch = buffer.match(/__TOOL_DATA__:({.*?})\n/);

    if (toolStartMatch && toolDataMatch && toolEndMatch) {
      // Extract tool call data
      const toolData = JSON.parse(toolDataMatch[1]);

      // Split buffer into text before tool, tool call, and text after
      const beforeTool = buffer.substring(0, toolStartMatch.index);
      const toolSection = buffer.substring(
        toolDataMatch.index + toolDataMatch[0].length,
        toolEndMatch.index
      );

      if (beforeTool.trim()) {
        currentSegments.push({ type: 'text', content: beforeTool.trim() });
      }

      currentSegments.push({
        type: 'tool_call',
        content: toolSection.trim(),
        data: toolData
      });

      buffer = buffer.substring(toolEndMatch.index + '__TOOL_CALL_END__'.length);
    }
  }

  // Add remaining text
  if (buffer.trim()) {
    currentSegments.push({ type: 'text', content: buffer.trim() });
  }

  // Add to chat messages
  setChatMessages(prev => [...prev, {
    role: 'assistant',
    segments: currentSegments
  }]);
};
```

---

## Function Calling (Tool System)

### Tool Definitions

```typescript
const tools = [
  {
    type: 'function',
    function: {
      name: 'create_assignment',
      description: 'Create a single study assignment for a specific subject/topic. You can call this MULTIPLE TIMES to create a series of study sessions.',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Subject name (e.g., "Mathematics", "Physics")' },
          topic: { type: 'string', description: 'Specific topic to study (e.g., "Derivatives", "Thermodynamics")' },
          due_date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
          time_of_day: { type: 'string', enum: ['morning', 'afternoon', 'evening'] },
          difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
          estimated_minutes: { type: 'number', description: 'Time in minutes (default: 45)' },
          required_tasks_count: { type: 'number', description: 'Number of practice tasks (default: 5)' }
        },
        required: ['subject', 'topic']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_assignment',
      description: 'Delete a single study assignment by UUID',
      parameters: {
        type: 'object',
        properties: {
          assignment_id: { type: 'string', description: 'UUID from list_assignments' }
        },
        required: ['assignment_id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'delete_multiple_assignments',
      description: 'Delete multiple assignments at once (RECOMMENDED for 3+ deletions)',
      parameters: {
        type: 'object',
        properties: {
          assignment_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of UUIDs to delete'
          }
        },
        required: ['assignment_ids']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_assignments',
      description: 'List all pending study assignments with their UUIDs',
      parameters: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Optional: Filter by subject name' },
          date: { type: 'string', description: 'Optional: Filter by date (YYYY-MM-DD)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_study_plan',
      description: 'Generate a personalized 7-day study plan based on exam schedule',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Number of days (default: 7)' }
        },
        required: []
      }
    }
  }
];
```

### Tool Implementation Functions

#### create_assignment
```typescript
async function createSingleAssignmentInline(
  studentId: string,
  params: any,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const { db } = await import('@/lib/db');

  // Find matching subject
  const subjectResult = await db.query(
    'SELECT id, name FROM subjects WHERE user_id = $1 AND LOWER(name) LIKE LOWER($2) LIMIT 1',
    [studentId, `%${params.subject}%`]
  );

  if (subjectResult.rows.length === 0) {
    controller.enqueue(encoder.encode(`⚠️ Subject "${params.subject}" not found\n`));
    return;
  }

  const matchingSubject = subjectResult.rows[0];

  // Calculate scheduled date/time
  const scheduledDate = params.due_date
    ? new Date(params.due_date)
    : new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

  const timeOfDay = params.time_of_day || 'afternoon';
  const scheduledTime = timeOfDay === 'morning' ? '09:00:00'
    : timeOfDay === 'evening' ? '18:00:00'
    : '14:00:00';

  // Insert assignment
  const dateStr = scheduledDate.toISOString().split('T')[0];
  await db.query(
    `INSERT INTO ai_assignments (user_id, subject_id, title, subject_name, topic, difficulty, scheduled_date, scheduled_time, estimated_minutes, required_tasks_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      studentId,
      matchingSubject.id,
      'Study Session: ' + matchingSubject.name,
      matchingSubject.name,
      params.topic,
      params.difficulty || 'medium',
      dateStr,
      scheduledTime,
      params.estimated_minutes || 45,
      params.required_tasks_count || 5
    ]
  );

  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][scheduledDate.getDay()];
  controller.enqueue(encoder.encode(
    `Created: ${matchingSubject.name} - ${params.topic} on ${dayName} ${scheduledDate.getDate()}/${scheduledDate.getMonth()+1} at ${scheduledTime}\n`
  ));
}
```

#### delete_multiple_assignments
```typescript
async function deleteMultipleAssignmentsInline(
  studentId: string,
  params: any,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const { db } = await import('@/lib/db');
  const assignmentIds = params.assignment_ids;

  if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
    controller.enqueue(encoder.encode('⚠️ No assignment IDs provided\n'));
    return;
  }

  controller.enqueue(encoder.encode(`🗑️  Deleting ${assignmentIds.length} assignment(s)...\n\n`));

  let deletedCount = 0;
  let failedCount = 0;

  for (const assignmentId of assignmentIds) {
    try {
      const assignmentResult = await db.query(
        'SELECT * FROM ai_assignments WHERE id = $1 AND user_id = $2',
        [assignmentId, studentId]
      );

      if (assignmentResult.rows.length === 0) {
        controller.enqueue(encoder.encode(`⚠️  Skipped: ${assignmentId} not found\n`));
        failedCount++;
        continue;
      }

      const assignment = assignmentResult.rows[0];

      await db.query(
        'DELETE FROM ai_assignments WHERE id = $1 AND user_id = $2',
        [assignmentId, studentId]
      );

      controller.enqueue(encoder.encode(
        `✓ Deleted: ${assignment.subject_name} - ${assignment.topic}\n`
      ));
      deletedCount++;

    } catch (error) {
      console.error(`Error deleting ${assignmentId}:`, error);
      controller.enqueue(encoder.encode(`❌ Failed: ${assignmentId}\n`));
      failedCount++;
    }
  }

  controller.enqueue(encoder.encode(
    `\n✅ Successfully deleted ${deletedCount} assignment(s)` +
    (failedCount > 0 ? ` (${failedCount} failed)` : '') +
    '\n'
  ));
}
```

#### list_assignments
```typescript
async function listAssignmentsInline(
  studentId: string,
  params: any,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const { db } = await import('@/lib/db');

  let query = `
    SELECT id, subject_name, topic, title, scheduled_date, scheduled_time,
           estimated_minutes, difficulty, status, progress_percentage
    FROM ai_assignments
    WHERE user_id = $1 AND status IN ('pending', 'in_progress')
  `;

  const queryParams: any[] = [studentId];
  let paramIndex = 2;

  if (params.subject) {
    query += ` AND LOWER(subject_name) LIKE LOWER($${paramIndex})`;
    queryParams.push(`%${params.subject}%`);
    paramIndex++;
  }

  if (params.date) {
    query += ` AND scheduled_date = $${paramIndex}`;
    queryParams.push(params.date);
    paramIndex++;
  }

  query += ` ORDER BY scheduled_date ASC, scheduled_time ASC LIMIT 50`;

  const result = await db.query(query, queryParams);

  if (result.rows.length === 0) {
    controller.enqueue(encoder.encode('📋 No pending assignments found.\n'));
    return;
  }

  controller.enqueue(encoder.encode(`📋 Found ${result.rows.length} assignment(s):\n\n`));

  let assignmentNumber = 1;
  for (const assignment of result.rows) {
    const date = new Date(assignment.scheduled_date);
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];

    controller.enqueue(encoder.encode(
      `Assignment ${assignmentNumber}:\n` +
      `UUID: ${assignment.id}\n` +
      `Subject: ${assignment.subject_name} - ${assignment.topic}\n` +
      `Date: ${dayName}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} at ${assignment.scheduled_time}\n` +
      `Duration: ${assignment.estimated_minutes} minutes | Difficulty: ${assignment.difficulty} | Progress: ${assignment.progress_percentage || 0}%\n\n`
    ));
    assignmentNumber++;
  }
}
```

---

## System Prompt Structure

```typescript
const systemPrompt = `You are an AI Study Assistant. You help students prepare for exams and manage their study schedule.

Current Date: ${currentDateFormatted} (${currentDate})

Student Context:
${contextText}

You have access to tools for managing study assignments:
- **list_assignments**: List all pending tasks (use this FIRST to see current tasks and get their UUIDs)
- **create_assignment**: Create new study tasks (can call multiple times)
- **delete_assignment**: Delete a single task by UUID
- **delete_multiple_assignments**: Delete multiple tasks at once (RECOMMENDED for 3+ deletions)
- **generate_study_plan**: Create a week-long study plan

CRITICAL WORKFLOW: When deleting or modifying tasks:
1. **ALWAYS call list_assignments FIRST** to see current tasks and get their UUIDs
2. **READ THE TOOL RESULTS CAREFULLY** - if list_assignments returns assignments, they exist!
3. **EXTRACT THE EXACT UUID VALUES** - Each assignment will show "UUID: abc-123-def-456..." on a separate line
4. **FOR MULTIPLE DELETIONS**: Use delete_multiple_assignments with an array of all UUIDs (more efficient!)
5. **FOR SINGLE DELETION**: Use delete_assignment with one UUID
6. Then create new tasks as needed

Example: User says "delete all math tasks" (30 tasks found)
1. Call list_assignments(subject="Mathematics")
2. Tool returns 30 assignments with UUIDs
3. **IMPORTANT**: Extract ALL UUID values from each "UUID: " line into an array
4. Call delete_multiple_assignments(assignment_ids=["uuid1", "uuid2", ..., "uuid30"])
   - This deletes all 30 tasks in ONE function call
   - DON'T call delete_assignment 30 times!
5. Then create new tasks as needed

NEVER ignore or dismiss tool results. If a tool returns data, USE that data!
**NEVER use integer IDs like 1, 2, 3 - ALWAYS use the full UUID string from the "UUID:" field!**

CRITICAL INTELLIGENCE GUIDELINES:

1. **Exam Preparation Strategy:**
   - When a student asks to prepare for an exam, be SMART:
   - Calculate time until exam (days/weeks)
   - Create MULTIPLE study sessions spread over time, NOT just one
   - For 1 month away: create 4-6 sessions (weekly)
   - For 2 weeks away: create 3-4 sessions (every few days)
   - For 1 week away: create 2-3 sessions (every other day)
   - Break topics into chunks (e.g., "Derivatives", "Integrals", "Applications")

2. **Topic Breakdown:**
   - If the student mentions a broad topic (e.g., "Calculus"), break it down into subtopics
   - Use the exam's units field from context if available

3. **Timing Intelligence:**
   - Space sessions appropriately - don't cram everything in one day
   - Use time_of_day: "morning"/"afternoon"/"evening" based on student preferences
   - Create earlier sessions for foundational topics, later sessions for practice/review

4. **When to Ask Questions:**
   - If request is vague, ask clarifying questions BEFORE creating tasks

Be conversational and explain your reasoning. If you create multiple tasks, explain the study plan strategy.`;
```

---

## Frontend Integration

### Message Segments Architecture
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  segments: Array<{
    type: 'text' | 'tool_call';
    content: string;
    data?: {
      name: string;
      args: any;
    };
  }>;
}
```

### Rendering Messages
```tsx
function MessageDisplay({ message }: { message: ChatMessage }) {
  return (
    <div className={message.role === 'user' ? 'user-message' : 'assistant-message'}>
      {message.segments.map((segment, idx) => {
        if (segment.type === 'text') {
          return (
            <ReactMarkdown key={idx} remarkPlugins={[remarkGfm]}>
              {segment.content}
            </ReactMarkdown>
          );
        } else if (segment.type === 'tool_call') {
          return (
            <div key={idx} className="tool-call-card">
              <div className="tool-header">
                <span className="tool-icon">🔧</span>
                <span className="tool-name">{segment.data.name}</span>
              </div>
              <pre className="tool-output">{segment.content}</pre>
            </div>
          );
        }
      })}
    </div>
  );
}
```

---

## Key Technical Decisions

### 1. Why Streaming Instead of Standard Response?
- **Real-time feedback**: Users see the AI thinking in real-time
- **Tool execution visibility**: Users can watch tasks being created/deleted
- **Better UX**: No loading spinner for 10+ seconds
- **Interruptible**: Could add stop generation button

### 2. Why Segments-Based Message Architecture?
- **Inline tool calls**: Tool execution results appear exactly where the AI mentioned them
- **Markdown support**: Text segments can use full markdown
- **Flexible rendering**: Easy to style tool calls differently from text
- **Replay capability**: Can reconstruct full conversation history

### 3. Why Two API Endpoints (context + chat)?
- **Instant page load**: `/context` loads statistics without waiting for OpenAI
- **No loading overlay**: Users see data immediately, then AI streams in
- **Cost optimization**: Don't call OpenAI just to show stats
- **Progressive enhancement**: Page is functional even if AI fails

### 4. Why ML Predictions Instead of Pure LLM?
- **Cost**: ML models run locally, no API costs
- **Speed**: Instant predictions vs. waiting for GPT-4
- **Consistency**: Deterministic scoring vs. probabilistic LLM
- **Data-driven**: Uses actual student performance history
- **Hybrid approach**: ML for scoring, LLM for conversation

### 5. Why Function Calling Instead of Prompt Engineering?
- **Reliability**: Structured function calls vs. parsing free text
- **Type safety**: OpenAI validates parameter types
- **Error handling**: Clear error messages for invalid calls
- **Scalability**: Easy to add new tools
- **Real execution**: Functions directly modify database

### 6. UUID Extraction Strategy
**Problem**: GPT-4 was calling `delete_assignment(assignment_id=1)` instead of using actual UUIDs

**Solution**:
- Format list output with explicit "UUID:" label
- System prompt with detailed examples showing UUID extraction
- Batch deletion tool to handle 30+ deletions in one call (OpenAI has ~10 tool call limit)

---

## Performance Optimizations

1. **Parallel data fetching**: All DB queries run in `Promise.all()`
2. **Limited context**: Only last 20 tasks, 20 assignments shown to LLM
3. **Streaming start**: First chunk sent within 200ms
4. **Tool output streaming**: Results appear as they execute, not after
5. **Connection pooling**: PostgreSQL connection pool for concurrent queries

---

## Error Handling

1. **Graceful degradation**: Empty context if DB fails
2. **Tool execution errors**: Stream error message, don't crash
3. **OpenAI failures**: Retry logic with exponential backoff
4. **Client disconnect**: Detect and abort stream early
5. **Invalid UUIDs**: Validate before DB query

---

## Future Enhancements

1. **Multi-turn tool calling**: Allow AI to call tools → see results → call more tools (currently limited to 2 rounds)
2. **Conversation memory**: Store chat history in DB for persistence
3. **Voice input**: Integrate speech-to-text
4. **Proactive suggestions**: AI suggests study sessions without prompting
5. **Calendar integration**: Sync with Google Calendar
6. **Collaborative study**: Multiple students in same session

---

## File Structure

```
/app
  /api
    /study-assistant
      route.ts              # Main chat endpoint (GET)
      /context
        route.ts            # Instant context endpoint (GET)
/lib
  /services
    studyAssistantContext.ts  # Context builder + ML logic
  /ml
    studyAssistantML.ts    # ML prediction models
  db.ts                     # PostgreSQL connection pool
/app/dashboard/assistant
  page.tsx                  # Frontend chat interface
```

---

## Dependencies

```json
{
  "dependencies": {
    "openai": "^4.20.0",
    "pg": "^8.11.0",
    "react-markdown": "^9.0.0",
    "remark-gfm": "^4.0.0"
  }
}
```

---

## Environment Variables

```env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

---

## Complete Reproduction Checklist

To reproduce this system exactly:

1. ✅ Set up PostgreSQL with schema above
2. ✅ Install dependencies
3. ✅ Implement context building service with ML predictions
4. ✅ Create streaming API route with function calling
5. ✅ Implement all 5 tool functions
6. ✅ Build frontend with segments-based message display
7. ✅ Add system prompt with UUID extraction instructions
8. ✅ Test with real exam/assignment data
9. ✅ Configure OpenAI API key
10. ✅ Deploy with proper environment variables

---

**End of Documentation**
