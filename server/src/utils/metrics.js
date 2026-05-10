const promClient = require('prom-client');

promClient.collectDefaultMetrics();

const register = promClient.register;

const httpRequestCount = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpLatency = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

const aiRequestCount = new promClient.Counter({
  name: 'ai_requests_total',
  help: 'Total AI service requests',
  labelNames: ['type', 'status'],
});

module.exports = { register, httpRequestCount, httpLatency, aiRequestCount };
