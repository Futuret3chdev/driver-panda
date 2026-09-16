import { cors } from '../lib/api-money.js';

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  res.status(200).json({
    ok: true,
    name: 'Driver Panda API',
    ecosystem: 'MT ECO SYSTEM',
    developedBy: ['Futuret3ch', 'T3x', 'MemeTorrent'],
    version: '1.0.0',
    platforms: ['uber', 'dasher', 'panda']
  });
}
