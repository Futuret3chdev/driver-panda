export const PLATFORMS = [
  {
    id: 'uber',
    name: 'Uber',
    short: 'Uber',
    kind: 'Rides & Eats',
    color: '#f4f4f5',
    ink: '#0b0d10',
    openUrl: 'https://apps.apple.com/app/uber-driver/id1131342792',
    storeUrl: 'https://apps.apple.com/app/uber-driver/id1131342792',
    webUrl: 'https://www.uber.com/us/en/drive/'
  },
  {
    id: 'dasher',
    name: 'Dasher',
    short: 'Dasher',
    kind: 'DoorDash',
    color: '#ff3008',
    ink: '#ffffff',
    openUrl: 'https://apps.apple.com/app/doordash-dasher/id719972451',
    storeUrl: 'https://apps.apple.com/app/doordash-dasher/id719972451',
    webUrl: 'https://www.doordash.com/dasher/download/'
  },
  {
    id: 'panda',
    name: 'Hello Panda',
    short: 'Panda',
    kind: 'HungryPanda courier',
    color: '#ff7a1a',
    ink: '#1a0d00',
    openUrl: 'https://apps.apple.com/app/deliverypanda/id1318740475',
    storeUrl: 'https://apps.apple.com/app/deliverypanda/id1318740475',
    webUrl: 'https://www.hungrypanda.co/riders/'
  }
];

export const platformById = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));
