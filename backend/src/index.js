import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { createProxyMiddleware } from 'http-proxy-middleware';
import usersRouter from './routes/users.js';
import classroomsRouter from './routes/classrooms.js';
import joinRequestsRouter from './routes/joinRequests.js';
import notificationsRouter from './routes/notifications.js';
import documentsRouter from './routes/documents.js';
import assignmentsRouter from './routes/assignments.js';
import quizzesRouter from './routes/quizzes.js';
import authRouter from './routes/auth.js';
 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// API routes
app.use('/api/users', usersRouter);
app.use('/api/classrooms', classroomsRouter);
app.use('/api/join-requests', joinRequestsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/assignments', assignmentsRouter);
//app.use('/api/quizzes', quizzesRouter);
app.use('/api/quizzes', (_req, res) => res.status(503).json({ error: 'Quizzes are temporarily disabled' }));
app.use('/api/auth', authRouter);
 
// Serve React app
const clientBuildPath = path.resolve(__dirname, '../../build');

let reactDevServer;

if (isDevelopment) {
  // In development, proxy non-API requests to React dev server
  reactDevServer = createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true,
    ws: true, // Enable websocket proxying for hot reload
    logLevel: 'silent'
  });

  // Proxy all non-API requests to React dev server
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    reactDevServer(req, res, next);
  });
} else {
  // In production, serve static files
  app.use(express.static(clientBuildPath));

  // For all non-API routes, send index.html (React Router support)
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).end();
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Create HTTP server to handle WebSocket upgrades
const server = http.createServer(app);

// Handle WebSocket upgrades in development
if (isDevelopment && reactDevServer) {
  server.on('upgrade', (req, socket, head) => {
    reactDevServer.upgrade(req, socket, head);
  });
}

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (isDevelopment) {
    console.log(`Frontend dev server should be running on http://localhost:3000`);
    console.log(`Access the app at http://localhost:${PORT}`);
  } else {
    console.log(`Serving production build from ${clientBuildPath}`);
  }
});
