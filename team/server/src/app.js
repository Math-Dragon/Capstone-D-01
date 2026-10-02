const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { requestLogger } = require('./middleware/requestLogger');
const { responseEnricher } = require('./middleware/responseEnricher');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/authenticate');
const { authLimiter, aiLimiter, generalLimiter, oauthTokenLimiter } = require('./middleware/rateLimiter');
const { metricsAuth } = require('./middleware/metricsAuth');

const healthRoutes = require('./routes/health');
const metricsRoutes = require('./routes/metrics');
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const goalRoutes = require('./routes/goals');
const taskRoutes = require('./routes/tasks');
const calendarRoutes = require('./routes/calendar');
const aiRoutes = require('./routes/ai');
const progressRoutes = require('./routes/progress');
const adaptiveRoutes = require('./routes/adaptive');
const coachRoutes = require('./routes/coach');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');
const exportRoutes = require('./routes/export');

const app = express();
app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    if (config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    const err = new Error(`Origin ${origin} is not allowed by CORS`);
    err.statusCode = 403;
    err.code = 'CORS_ORIGIN_DENIED';
    return callback(err);
  },
  credentials: true,
}));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      imgSrc: ['\'self\'', 'data:', 'blob:'],
      fontSrc: ['\'self\'', 'https:', 'data:'],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      scriptSrc: ['\'self\''],
    },
  },
}));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);
app.use(responseEnricher);

app.use('/health', healthRoutes);
app.use('/metrics', metricsAuth, metricsRoutes);
// Mounted before /api/auth so the OAuth2 token endpoint gets its own rate-limit budget
// (and form-urlencoded parsing) instead of inheriting the auth limiter.
app.use('/api/auth/oauth', express.urlencoded({ extended: false }), oauthTokenLimiter, oauthRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/goals', generalLimiter, goalRoutes);
app.use('/api/tasks', generalLimiter, taskRoutes);
app.use('/api/calendar', generalLimiter, calendarRoutes);
app.use('/api/ai', authenticate, aiLimiter, aiRoutes);
app.use('/api/progress', generalLimiter, progressRoutes);
app.use('/api/adaptive', authenticate, generalLimiter, adaptiveRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', authenticate, generalLimiter, webhookRoutes);
app.use('/api/export', generalLimiter, exportRoutes);

app.use(errorHandler);

module.exports = app;
