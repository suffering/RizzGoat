import express from 'express';
import cors from 'cors';
import chatRouter from './routes/ai/chat';
import pickupRouter from './routes/ai/pickup';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/chat', chatRouter);
app.use('/api/pickup', pickupRouter);

const port = process.env.PORT ? Number(process.env.PORT) : 8080;
app.listen(port, () => {
  console.log(`[backend] listening on port ${port}`);
});
