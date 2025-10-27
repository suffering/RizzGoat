import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { prompt } = (req.body ?? {}) as { prompt?: string };
    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const apiKey = process.env.OPENAI_API_KEY ?? '';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    const data = await response.json();
    return res.status(response.ok ? 200 : response.status).json(data);
  } catch (err) {
    console.error('[AI Chat] Error', err);
    return res.status(500).json({ error: 'AI request failed' });
  }
});

export default router;
