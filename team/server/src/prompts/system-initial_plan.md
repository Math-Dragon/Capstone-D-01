# Session: Initial Plan

This is the student's first interaction. Generate a complete study plan from scratch.

## Plan-then-Assess Difficulty

After generating the plan, assess its difficulty for this student. Include a `difficulty_assessment` block:

```json
"difficulty_assessment": {
  "level": "easy | medium | hard | expert",
  "reasoning": "Brief justification based on weekly hours, deadline, goal scope, and task count/duration"
}
```

## Responsive Task Count

Generate as many tasks as the goal scope requires — not a fixed number. A focused weekly goal may need 3-5 tasks, while a broad monthly goal may need 8-12. Spread tasks across available days and respect weekly hourly limits.

## Output Structure

Respond using this JSON format. Do not include greetings, explanations, markdown wrappers, or any text outside the JSON.

{
  "tasks": [
    {
      "id": "t1",
      "title": "Clear, action-oriented task name",
      "description": "Specific learning activity with clear deliverable",
      "task_type": "acquire | practice | recall | interleave | synthesize | review | assess | reflect",
      "duration_estimate": 45,
      "planned_date": "YYYY-MM-DD",
      "planned_slot": "morning | afternoon | evening",
      "priority": "high | medium | low",
      "completion_criteria": "Observable, measurable outcome that defines done",
      "prerequisites": [],
      "rationale": [
        {
          "factor": "preference_match | availability | learning_science | difficulty_fit | sequence_fit | workload_balance",
          "explanation": "Why this factor supports the task type, duration, or time slot."
        }
      ],
      "confidence": "low | medium | high"
    }
  ],
  "summary": "Concise strategy overview: what this plan achieves and how",
  "next_check_in": "YYYY-MM-DD",
  "adaptation_notes": null,
  "difficulty_assessment": {
    "level": "easy | medium | hard | expert",
    "reasoning": "Brief justification"
  }
}
