const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const serverDir = path.join(rootDir, 'server');
const docsDir = path.join(rootDir, 'docs');
const reportPath = path.join(docsDir, 'performance-security-tc10-tc24-run-report.md');

const secretPattern = /AIza[0-9A-Za-z_-]{35}|(?<![A-Za-z])sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{30,}|-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/;
const secretPatternText = 'AIza[0-9A-Za-z_-]{35}|(?<![A-Za-z])sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{30,}|-----BEGIN (RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || rootDir,
    env: { ...process.env, ...(options.env || {}) },
    encoding: 'utf8',
    shell: process.platform === 'win32',
    maxBuffer: 1024 * 1024 * 10,
  });

  return {
    command: `${command} ${args.join(' ')}`,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    ok: result.status === 0,
  };
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function pass(id, name, evidence) {
  return { id, name, status: 'PASS', evidence };
}

function warn(id, name, evidence) {
  return { id, name, status: 'WARN', evidence };
}

function fail(id, name, evidence) {
  return { id, name, status: 'FAIL', evidence };
}

function checkJestRateLimiter() {
  const env = {
    NODE_ENV: 'test',
    SKIP_DB_CHECK: 'true',
    CLOSE_DB_AFTER_TESTS: 'false',
    DATABASE_URL: 'postgres://user:pass@localhost:5432/planner_test',
    JWT_SECRET: 'test_jwt_secret_min_32_characters_long',
    JWT_REFRESH_SECRET: 'test_refresh_secret_min_32_chars_long',
    GEMINI_API_KEY: 'test_key',
    LLM_PROVIDER: 'mock',
    RATE_LIMIT_WINDOW_MS: '1000',
    AUTH_RATE_LIMIT_MAX: '5',
    AI_RATE_LIMIT_MAX: '20',
  };

  const result = run('npm', ['test', '--', '--runTestsByPath', 'tests/unit/rateLimiter.test.js'], {
    cwd: serverDir,
    env,
  });

  const output = `${result.stdout}\n${result.stderr}`;
  const cases = [
    ['TC-10', 'AI rate limit blocks request ke-21', /TC-10:[\s\S]*?✓|✓[\s\S]*?TC-10|PASS[\s\S]*?TC-10/],
    ['TC-11', 'Auth rate limit blocks request ke-6', /TC-11:[\s\S]*?✓|✓[\s\S]*?TC-11|PASS[\s\S]*?TC-11/],
    ['TC-12', 'HTTP 429 punya pesan retry yang jelas', /TC-12:[\s\S]*?✓|✓[\s\S]*?TC-12|PASS[\s\S]*?TC-12/],
    ['TC-15', 'Rate limit reset setelah window selesai', /TC-15:[\s\S]*?✓|✓[\s\S]*?TC-15|PASS[\s\S]*?TC-15/],
    ['TC-16', 'AI rate limit dihitung per user', /TC-16:[\s\S]*?✓|✓[\s\S]*?TC-16|PASS[\s\S]*?TC-16/],
    ['TC-17', 'Auth rate limit dihitung per IP', /TC-17:[\s\S]*?✓|✓[\s\S]*?TC-17|PASS[\s\S]*?TC-17/],
    ['TC-18', 'Header RateLimit standar tersedia', /TC-18:[\s\S]*?✓|✓[\s\S]*?TC-18|PASS[\s\S]*?TC-18/],
    ['TC-21', 'Load test ringan paralel stabil', /TC-21:[\s\S]*?✓|✓[\s\S]*?TC-21|PASS[\s\S]*?TC-21/],
    ['TC-22', 'X-Forwarded-For tidak bypass auth limiter', /TC-22:[\s\S]*?✓|✓[\s\S]*?TC-22|PASS[\s\S]*?TC-22/],
  ];

  return cases.map(([id, name, pattern]) => {
    if (result.ok && pattern.test(output)) {
      return pass(id, name, 'Jest rateLimiter.test.js passed');
    }
    return fail(id, name, `Jest failed or test name missing. Command: ${result.command}`);
  });
}

function checkTrackedSecrets() {
  const listed = run('git', ['ls-files', '-z']);
  if (!listed.ok) return fail('TC-13', 'Secret scan tracked files', 'git ls-files failed');

  const files = listed.stdout
    .split('\0')
    .filter(Boolean)
    .filter((file) => !file.endsWith('.md'))
    .filter((file) => !file.endsWith('package-lock.json'))
    .filter((file) => !file.includes('node_modules/'))
    .filter((file) => fs.existsSync(path.join(rootDir, file)));

  const matches = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
    if (secretPattern.test(content)) {
      matches.push(file);
    }
  }

  if (matches.length > 0) {
    return fail('TC-13', 'Secret scan tracked files', `Potential secret pattern in tracked files: ${matches.join(', ')}`);
  }

  const history = run('git', ['log', '--all', '--format=%h %s', '-G', secretPatternText]);
  if (history.ok && history.stdout.trim()) {
    return warn('TC-13', 'Secret scan tracked files', 'No active tracked secret found; history still has pattern matches that should be reviewed/rotated if real keys were ever committed.');
  }

  return pass('TC-13', 'Secret scan tracked files', 'No active tracked secret pattern found');
}

function checkAiCostDocumentation() {
  const doc = read('docs/performance-security-rate-limiting.md');
  const hasModel = doc.includes('gemini-2.5-flash-lite');
  const hasPricing = doc.includes('https://ai.google.dev/gemini-api/docs/pricing');
  const hasInputCost = doc.includes('USD 0.10');
  const hasOutputCost = doc.includes('USD 0.40');

  if (hasModel && hasPricing && hasInputCost && hasOutputCost) {
    return pass('TC-14', 'Dokumentasi biaya AI per 100 request', 'Pricing model, source, and per-100 request examples documented');
  }
  return fail('TC-14', 'Dokumentasi biaya AI per 100 request', 'Cost documentation is incomplete');
}

function checkRedisRateLimiter() {
  const rateLimiter = read('server/src/middleware/rateLimiter.js');
  const app = read('server/src/app.js');
  const ci = read('.github/workflows/ci.yml');

  const hasRedisStore = rateLimiter.includes('RedisStore') && rateLimiter.includes('prefix: `rl:${opts.prefix}:`');
  const aiAfterAuth = app.includes("app.use('/api/ai', authenticate, aiLimiter, aiRoutes)");
  const ciHasRedis = ci.includes('redis:') && ci.includes('redis://localhost:6379');

  if (hasRedisStore && aiAfterAuth && ciHasRedis) {
    return pass('TC-19', 'Redis-backed rate limiting aktif untuk non-test', 'RedisStore configured, AI limiter after auth, CI Redis service present');
  }
  return fail('TC-19', 'Redis-backed rate limiting aktif untuk non-test', 'RedisStore/auth order/CI Redis config incomplete');
}

function checkRedisDownBehavior() {
  const rateLimiter = read('server/src/middleware/rateLimiter.js');
  const logsRedisError = rateLimiter.includes('Redis Rate Limiter Error');
  const throwsError = /catch \(err\)[\s\S]*throw err/.test(rateLimiter);

  if (logsRedisError && throwsError) {
    return pass('TC-20', 'Redis down behavior fail-closed', 'Redis store error is logged and re-thrown');
  }
  return fail('TC-20', 'Redis down behavior fail-closed', 'Redis error is not clearly fail-closed');
}

function checkSecretScanCi() {
  const ci = read('.github/workflows/ci.yml');
  const hasStep = ci.includes('name: Secret scan');
  const hasPatterns = ci.includes('AIza') && ci.includes('ghp_') && ci.includes('PRIVATE KEY');

  if (hasStep && hasPatterns) {
    return pass('TC-23', 'Secret scanning di CI pipeline', 'CI has Secret scan step with common API key/private key patterns');
  }
  return fail('TC-23', 'Secret scanning di CI pipeline', 'CI secret scan step/patterns missing');
}

function checkRateLimitLogging() {
  const requestLogger = read('server/src/middleware/requestLogger.js');
  const has429Branch = requestLogger.includes('res.statusCode === 429');
  const hasWarn = requestLogger.includes('logger.warn');
  const hasFields = ['request_id', 'method', 'route', 'status_code', 'duration_ms', 'user_id', 'retry_after']
    .every((field) => requestLogger.includes(field));

  if (has429Branch && hasWarn && hasFields) {
    return pass('TC-24', 'Monitoring/logging HTTP 429', 'requestLogger logs HTTP 429 warning with operational fields');
  }
  return fail('TC-24', 'Monitoring/logging HTTP 429', 'HTTP 429 warning log fields incomplete');
}

function makeReport(results) {
  const now = new Date().toISOString();
  const rows = results.map((r) => `| ${r.id} | ${r.status} | ${r.name} | ${r.evidence.replace(/\|/g, '/')} |`).join('\n');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const warned = results.filter((r) => r.status === 'WARN').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  return `# TC-10 sampai TC-24 Run Report

Generated: ${now}

## Summary

| Status | Count |
| --- | ---: |
| PASS | ${passed} |
| WARN | ${warned} |
| FAIL | ${failed} |

## Result Detail

| TC | Status | Test | Evidence |
| --- | --- | --- | --- |
${rows}

## Command

\`\`\`bash
node scripts/run-tc10-tc24.js
\`\`\`
`;
}

function main() {
  const results = [
    ...checkJestRateLimiter(),
    checkTrackedSecrets(),
    checkAiCostDocumentation(),
    checkRedisRateLimiter(),
    checkRedisDownBehavior(),
    checkSecretScanCi(),
    checkRateLimitLogging(),
  ].sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)));

  fs.mkdirSync(docsDir, { recursive: true });
  const report = makeReport(results);
  fs.writeFileSync(reportPath, report);

  process.stdout.write(`${report}\n`);

  const hasFail = results.some((result) => result.status === 'FAIL');
  process.exit(hasFail ? 1 : 0);
}

main();
