import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`VaultVerse MERN Security Server listening on port ${PORT}`);
      console.log(`API Health: http://localhost:${PORT}/api/health`);
      console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`=======================================================`);
    });

    const shutdown = async (signal) => {
      console.log(`\nReceived ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Failed to start VaultVerse server:', err.message);
    process.exit(1);
  }
}

startServer();

