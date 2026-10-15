// Offline cache for the PPL Log app. Bump CACHE when the app files change.
var CACHE = 'ppl-log-v6';
var FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// App files: network first so updates arrive, cache when offline. Everything else (fonts): cache as it comes.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var sameOrigin = new URL(req.url).origin === self.location.origin;
  if (sameOrigin) {
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res;
    }).catch(function () { return caches.match(req).then(function (r) { return r || caches.match('./index.html'); }); }));
  } else {
    e.respondWith(caches.match(req).then(function (r) {
      return r || fetch(req).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); return res; });
    }));
  }
});
