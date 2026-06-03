const path = require('path');

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const p of envPaths) {
  require('dotenv').config({ path: p });
}

const llmProvider = process.env.LLM_PROVIDER || 'gemini';

const ollamaBaseUrl = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/+$/, '');
const ollamaModel = (process.env.OLLAMA_MODEL || '').trim();

const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
if (llmProvider === 'gemini') {
  required.push('GEMINI_API_KEY');
}
for (const key of required) {
  if (!process.env[key]) {
    process.stderr.write(`Missing required env: ${key}\n`);
    process.exit(1);
  }
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173')
  .split(',').map(s => s.trim());

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiry: '15m',
  jwtRefreshExpiry: '7d',
  llmProvider,
  geminiKey: (process.env.GEMINI_API_KEY || '').trim(),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  geminiPaidKey: (process.env.GEMINI_PAID_API_KEY || '').trim(),
  geminiPaidModel: process.env.GEMINI_PAID_MODEL || 'gemini-3.1-flash-lite',
  glmKey: (process.env.GLM_API_KEY || '').trim(),
  glmModel: process.env.GLM_MODEL || 'glm-4.7-flash',
  glmBaseUrl: process.env.GLM_BASE_URL || 'https://api.z.ai/api/paas/v4/chat/completions',
  ollamaBaseUrl,
  ollamaModel,
  hasFallback: !!(
    (process.env.GEMINI_PAID_API_KEY || '').trim() ||
    (process.env.GLM_API_KEY || '').trim() ||
    (process.env.OPENROUTER_API_KEY || '').trim()
  ),
  openrouterKey: (process.env.OPENROUTER_API_KEY || '').trim() || null,
  openrouterModel: process.env.OPENROUTER_MODEL || 'qwen/qwen3-next-80b-a3b-instruct:free',
  redisUrl: process.env.REDIS_URL,
  allowedOrigins,
  metricsApiKey: process.env.METRICS_API_KEY || '',
  adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'auth-aiweb',
};
