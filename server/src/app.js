const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');
const { authLimiter, aiLimiter } = require('./middleware/rateLimiter');
const { metricsAuth } = require('./middleware/metricsAuth');

const healthRoutes = require('./routes/health');
const metricsRoutes = require('./routes/metrics');
const authRoutes = require('./routes/auth');
const goalRoutes = require('./routes/goals');
const taskRoutes = require('./routes/tasks');
const aiRoutes = require('./routes/ai');
const progressRoutes = require('./routes/progress');
const coachRoutes = require('./routes/coach');

const app = express();
app.use(cors({ origin: config.allowedOrigins, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/metrics', metricsAuth, metricsRoutes);
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/coach', aiLimiter, coachRoutes);

app.use(errorHandler);

module.exports = app;
