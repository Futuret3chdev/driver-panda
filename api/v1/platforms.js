import { cors } from '../../lib/api-money.js';

const platforms = [
  {
    id: 'uber',
    name: 'Uber',
    kind: 'Rides & Eats',
    scheme: 'uberdriver://',
    storeUrl: 'https://apps.apple.com/app/uber-driver/id1131342792',
    playUrl: 'https://play.google.com/store/apps/details?id=com.ubercab.driver'
  },
  {
    id: 'dasher',
    name: 'Dasher',
    kind: 'DoorDash',
    scheme: 'doordashdasher://',
    storeUrl: 'https://apps.apple.com/app/doordash-dasher/id719972451',
    playUrl: 'https://play.google.com/store/apps/details?id=com.doordash.driverapp'
  },
  {
    id: 'panda',
    name: 'Hello Panda',
    kind: 'HungryPanda courier',
    scheme: 'deliverypanda://',
    storeUrl: 'https://apps.apple.com/app/deliverypanda/id1318740475',
    playUrl: 'https://play.google.com/store/apps/details?id=com.hungrypanda.driver'
  }
];

export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  res.status(200).json({ platforms });
}
