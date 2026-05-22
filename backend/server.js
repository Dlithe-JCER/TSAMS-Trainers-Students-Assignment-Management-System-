import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';

import trainersRouter from './routes/trainers.js';
import submissionsRouter from './routes/submissions.js';
import classroomsRouter from './routes/classrooms.js';
import tocRouter from './routes/toc.js';
import summaryRouter from './routes/summary.js';
import assignmentsRouter from './routes/assignments.js';
import attendanceRouter from './routes/attendance.js';
import studentsRouter from './routes/students.js';
import sessionsRouter from './routes/sessions.js';
import collegesRouter from './routes/colleges.js';

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const app = express();

// Current directory setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists (Render / cloud envs don't persist it)
const uploadsDir = path.join(__dirname, 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads folder — registered before routes so it never hits the 404 handler
app.use('/uploads', express.static(uploadsDir));

// Connect Database
await connectDB();

// API Routes
app.use('/api/trainers', trainersRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/classrooms', classroomsRouter);
app.use('/api/toc', tocRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/students', studentsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/colleges', collegesRouter);

// Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running successfully',
    database: 'Neon PostgreSQL',
  });
});

// Default Route
app.get('/', (req, res) => {
  res.send('Backend API is running...');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(500).json({
    success: false,
    message: 'Something went wrong',
    error:
      process.env.NODE_ENV === 'production'
        ? err.message
        : err.stack,
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

