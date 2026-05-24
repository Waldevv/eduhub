import express from 'express';
import cors from 'cors';
import coursesRouter from './routes/courses';
import unitsRouter from './routes/units';
import blocksRouter from './routes/blocks';
import quizzesRouter from './routes/quizzes';
import authRouter from './routes/auth';
import discordRouter from './routes/discord';
import studentRouter from './routes/student';
import teacherRouter from './routes/teacher';
import { startBot } from './lib/discord-bot';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/courses', coursesRouter);
app.use('/api/units', unitsRouter);
app.use('/api/blocks', blocksRouter);
app.use('/api/quizzes', quizzesRouter);
app.use('/api/auth', authRouter);
app.use('/api/discord', discordRouter);
app.use('/api/student', studentRouter);
app.use('/api/teacher', teacherRouter);

app.listen(PORT, () => {
  console.log(`EduHub API running on http://localhost:${PORT}`);
  startBot();
});
