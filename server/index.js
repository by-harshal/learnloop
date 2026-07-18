require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const ingestRouter = require('./routes/ingest');
const generateRouter = require('./routes/generate');
const chatRouter = require('./routes/chat');
const errorHandler = require('./middleware/errorHandler');
const { startSweeper } = require('./lib/sessionStore');

const PORT = process.env.PORT || 3000;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

function createApp() {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
        },
      },
    })
  );
  app.use(cors({ origin: ALLOWED_ORIGINS }));
  app.use(express.json({ limit: '100kb' }));

  // Rate limit every AI- or network-backed route under /api. Static file serving
  // stays unlimited since it costs nothing and abuse there is harmless.
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    message: { error: 'Too many requests. Please wait a minute and try again.' },
  });
  app.use('/api', apiLimiter, ingestRouter, generateRouter, chatRouter);

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const app = createApp();
  startSweeper();
  app.listen(PORT, () => {
    console.log(`LearnLoop running on http://localhost:${PORT}`);
  });
}

module.exports = { createApp };
