// ==================================================
// SERVICE WORKER — офлайн-режим для расписания ИФТИС
// ==================================================

const CACHE_NAME = 'iftis-v1';

// Файлы, которые кэшируются при установке
const urlsToCache = [
  '/',
  '/index.html',
  '/teachers.html',
  '/manifest.json'
];

// ==================================================
// УСТАНОВКА — кэшируем основные файлы
// ==================================================
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Кэширование файлов:', urlsToCache);
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// ==================================================
// АКТИВАЦИЯ — удаляем старые кэши
// ==================================================
self.addEventListener('activate', event => {
  const whitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(names => {
      return Promise.all(
        names.map(name => {
          if (whitelist.indexOf(name) === -1) {
            console.log('Удаляем старый кэш:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ==================================================
// ПЕРЕХВАТ ЗАПРОСОВ — сначала сеть, потом кэш
// ==================================================
self.addEventListener('fetch', event => {
  // Пропускаем запросы не-GET (POST, PUT и т.д.)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Если запрос успешен — обновляем кэш
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Если сети нет — берём из кэша
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Если и в кэше нет — возвращаем заглушку
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});