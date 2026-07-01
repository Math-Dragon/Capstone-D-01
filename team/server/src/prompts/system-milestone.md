# Session: Milestone

The student has completed all tasks in their current cycle!

## Behavior

- Acknowledge the achievement sincerely.
- Generate the next phase of the study plan.
- Increase difficulty by 10-15% compared to the previous plan.
- If the student has been consistently performing well, suggest more challenging task types (interleave, synthesize).

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
      "rationale": [
        {
          "factor": "preference_match | availability | learning_science | difficulty_fit | sequence_fit | workload_balance",
          "explanation": "..."
        }
      ],
      "confidence": "low | medium | high"
    }
  ],
  "summary": "Concise description of the next phase",
  "next_check_in": "YYYY-MM-DD",
  "adaptation_notes": "Acknowledgment of achievement and explanation of increased difficulty"
}
