import { cors } from '../../lib/api-money.js';

const platforms = [
  { id: 'uber', name: 'Uber', kind: 'Rides & Eats', storeUrl: 'https://apps.apple.com/app/uber-driver/id1131342792' },
  { id: 'dasher', name: 'Dasher', kind: 'DoorDash', storeUrl: 'https://apps.apple.com/app/doordash-dasher/id719972451' },
  { id: 'panda', name: 'Hello Panda', kind: 'HungryPanda courier', storeUrl: 'https://apps.apple.com/app/deliverypanda/id1318740475' }
];

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  res.status(200).json({ platforms });
}
