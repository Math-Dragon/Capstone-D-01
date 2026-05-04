const path = require('path');

const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const p of envPaths) {
  require('dotenv').config({ path: p });
}

const llmProvider = process.env.LLM_PROVIDER || 'gemini';

const required = ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
if (llmProvider !== 'mock') {
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
  llmProvider2: process.env.LLM_PROVIDER_V2 || null,
  geminiKey: (process.env.GEMINI_API_KEY || '').trim(),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  openrouterKey: (process.env.OPENROUTER_API_KEY || '').trim() || null,
  openrouterModel: (process.env.OPENROUTER_MODEL || '').trim() || null,
  redisUrl: process.env.REDIS_URL,
  allowedOrigins,
  metricsApiKey: process.env.METRICS_API_KEY || '',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID || 'auth-aiweb',
};
