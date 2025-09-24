const CACHE_NAME = 'mistake-collection-v1.0.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// 安裝 Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker 安裝中...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('快取已開啟');
        return cache.addAll(urlsToCache);
      })
  );
});

// 啟用 Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker 已啟用');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('刪除舊快取:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 攔截網路請求
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果快取中有該資源，直接返回
        if (response) {
          return response;
        }
        
        // 否則從網路獲取
        return fetch(event.request).then(response => {
          // 檢查是否為有效回應
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // 複製回應以便快取
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        }).catch(() => {
          // 網路請求失敗時的回退處理
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// 處理背景同步
self.addEventListener('sync', event => {
  console.log('背景同步事件:', event.tag);
  
  if (event.tag === 'sync-questions') {
    event.waitUntil(syncQuestions());
  }
});

// 同步錯題資料
function syncQuestions() {
  // 這裡可以實現資料同步邏輯
  return Promise.resolve();
}

// 處理推送通知
self.addEventListener('push', event => {
  console.log('收到推送通知');
  
  const options = {
    body: event.data ? event.data.text() : '您有新的錯題待處理',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: '查看錯題',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: '關閉',
        icon: '/icons/icon-96x96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('錯題集提醒', options)
  );
});

// 處理通知點擊
self.addEventListener('notificationclick', event => {
  console.log('通知被點擊:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/?action=collection')
    );
  } else if (event.action === 'close') {
    // 只關閉通知
  } else {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// 處理應用程式更新
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});