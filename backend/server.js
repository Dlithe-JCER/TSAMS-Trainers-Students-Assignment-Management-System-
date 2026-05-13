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
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to Neon PostgreSQL and initialize schema
await connectDB();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/trainers', trainersRouter);
app.use('/api/submissions', submissionsRouter);
app.use('/api/classrooms', classroomsRouter);
app.use('/api/toc', tocRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/students', studentsRouter);
app.use('/api/sessions', sessionsRouter);

app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', db: 'Neon PostgreSQL' });
});

// Serve frontend static build
const distPath = path.resolve(__dirname, '../frontend/dist');
app.use(express.static(distPath, { index: false }));

// SPA fallback — serves index.html for all non-API routes
app.get('*', (req, res, next) => {
  const indexFile = path.join(distPath, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) {
      console.error('sendFile error:', err.message);
      res.status(503).send('Frontend not available. Build may not have completed.');
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
