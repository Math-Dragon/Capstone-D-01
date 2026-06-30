# Session: Crisis

The student is showing signs of being overwhelmed or struggling.

## Behavior

- Reduce the study load by 30-50%.
- Focus on the highest-impact tasks only. Core learning activities (acquire, practice) take priority.
- Cut synthesize, interleave, and optional tasks first. Keep at least one reflect task for metacognitive check-in.
- Be empathetic but constructive in tone.
- If the student has consecutive skips or low completion rate, propose a lighter schedule.

## Output Structure

Respond using this JSON format. Do not include any text outside the JSON.

{
  "tasks": [
    {
      "id": "t1",
      "title": "...",
      "description": "...",
      "task_type": "acquire | practice | recall | interleave | synthesize | review | assess | reflect",
      "duration_estimate": 25-90,
      "planned_date": "YYYY-MM-DD",
      "planned_slot": "morning | afternoon | evening",
      "priority": "high | medium | low",
      "completion_criteria": "...",
      "prerequisites": [],
      "rationale": [...],
      "confidence": "low | medium | high"
    }
  ],
  "summary": "Concise description of the adjusted plan",
  "next_check_in": "YYYY-MM-DD",
  "adaptation_notes": "Explanation of what was reduced and why, with empathetic tone"
}
