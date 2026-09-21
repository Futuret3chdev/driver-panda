export const PLATFORMS = [
  {
    id: 'uber',
    name: 'Uber',
    short: 'Uber',
    kind: 'Rides & Eats',
    color: '#f4f4f5',
    ink: '#0b0d10',
    schemes: ['uberdriver://', 'uber://'],
    androidIntent:
      'intent://#Intent;scheme=uberdriver;package=com.ubercab.driver;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.ubercab.driver;end',
    androidPackage: 'com.ubercab.driver',
    universalUrl: 'https://drivers.uber.com/',
    openUrl: 'uberdriver://',
    storeUrl: 'https://apps.apple.com/app/uber-driver/id1131342792',
    playUrl: 'https://play.google.com/store/apps/details?id=com.ubercab.driver',
    webUrl: 'https://www.uber.com/us/en/drive/'
  },
  {
    id: 'dasher',
    name: 'Dasher',
    short: 'Dasher',
    kind: 'DoorDash',
    color: '#ff3008',
    ink: '#ffffff',
    schemes: ['doordashdasher://', 'dasher://', 'doordash://'],
    androidIntent:
      'intent://#Intent;scheme=doordashdasher;package=com.doordash.driverapp;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.doordash.driverapp;end',
    androidPackage: 'com.doordash.driverapp',
    universalUrl: 'https://www.doordash.com/dasher/download/',
    openUrl: 'doordashdasher://',
    storeUrl: 'https://apps.apple.com/app/doordash-dasher/id719972451',
    playUrl: 'https://play.google.com/store/apps/details?id=com.doordash.driverapp',
    webUrl: 'https://www.doordash.com/dasher/download/'
  },
  {
    id: 'panda',
    name: 'Hello Panda',
    short: 'Panda',
    kind: 'HungryPanda courier',
    color: '#ff7a1a',
    ink: '#1a0d00',
    schemes: ['deliverypanda://', 'hungrypanda://'],
    androidIntent:
      'intent://#Intent;scheme=deliverypanda;package=com.hungrypanda.driver;S.browser_fallback_url=https://play.google.com/store/apps/details?id=com.hungrypanda.driver;end',
    androidPackage: 'com.hungrypanda.driver',
    universalUrl: 'https://www.hungrypanda.co/riders/',
    openUrl: 'deliverypanda://',
    storeUrl: 'https://apps.apple.com/app/deliverypanda/id1318740475',
    playUrl: 'https://play.google.com/store/apps/details?id=com.hungrypanda.driver',
    webUrl: 'https://www.hungrypanda.co/riders/'
  }
];

export const platformById = Object.fromEntries(PLATFORMS.map((p) => [p.id, p]));
