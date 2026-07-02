const fs = require('fs');
const path = require('path');

const PROMPT_DIR = path.join(__dirname, '../prompts');
const cache = {};

function loadPrompt(filename) {
  if (!cache[filename]) {
    const filePath = path.join(PROMPT_DIR, filename);
    if (!fs.existsSync(filePath)) return null;
    cache[filename] = fs.readFileSync(filePath, 'utf8');
  }
  return cache[filename];
}

function composeSystemPrompt(sessionType, goalContext = null) {
  const core = loadPrompt('system-core.md');
  const specialized = loadPrompt(`system-${sessionType}.md`) || loadPrompt('system-chat.md');

  let goalBlock = '';
  if (goalContext) {
    goalBlock = [
      '',
      '<goal_context>',
      `  Goal: ${goalContext.title}`,
      `  Description: ${goalContext.description}`,
      `  Deadline: ${goalContext.deadline || 'open-ended'}`,
      `  Difficulty: ${goalContext.difficulty || 'medium'}`,
      `  Weekly hours: ${goalContext.weeklyHours || 5}`,
      '</goal_context>',
      '',
    ].join('\n');
  }

  return core + '\n\n' + specialized + goalBlock;
}

module.exports = { composeSystemPrompt, loadPrompt };
