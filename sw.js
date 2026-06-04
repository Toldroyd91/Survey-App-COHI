const CACHE_NAME = 'survey-app-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './logo.jpg',
  './sap-pamphlet.jpg',
  './planning-pamphlet.jpg',
  './cavity-pamphlet.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
