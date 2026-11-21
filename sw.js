/* Triplanner çevrimdışı katmanı: uygulama dosyaları önce ağdan, olmazsa önbellekten gelir. */
var VERSION = "5bdacf2c98";
var SHELL = ["./","app-chat.js","app-core.js","app-dialogs.js","app-harcama.js","app-hazirlik.js","app-home.js","app-tarihler.js","app-ulasim.js","app.css","backend.js","bundle.css","bundle.js","config.js","data.js","gizlilik.html","icons/apple-touch-icon.png","icons/favicon-64.png","icons/icon-192.png","index.html","kosullar.html","manifest.webmanifest","tokens.css","vendor/Sortable.min.js","vendor/react-dom.production.min.js","vendor/react.production.min.js","vendor/supabase.js","web.css"];
var CACHE = "tp-shell-" + VERSION, MEDIA = "tp-media-v1", FONTS = "tp-fonts-v1";

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(SHELL); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.filter(function(k){ return k.indexOf("tp-shell-") === 0 && k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
function timeout(ms){ return new Promise(function(_, rej){ setTimeout(function(){ rej(new Error("timeout")); }, ms); }); }
function networkFirst(req){
  return caches.open(CACHE).then(function(c){
    /* tarayıcı önbelleğini atla: GitHub Pages dosyaları 10 dakika önbellekte tutuyor, güncelleme gecikmesin */
    var net = fetch(req, {cache: "no-cache"}).then(function(res){ if(res && res.ok) c.put(req, res.clone()); return res; });
    return Promise.race([net, timeout(4000)]).catch(function(){
      return c.match(req, {ignoreSearch: true}).then(function(hit){ return hit || net; });
    });
  });
}
function cacheFirst(name, req){
  return caches.open(name).then(function(c){
    return c.match(req).then(function(hit){
      return hit || fetch(req).then(function(res){ if(res && (res.ok || res.type === "opaque")) c.put(req, res.clone()); return res; });
    });
  });
}
self.addEventListener("fetch", function(e){
  var req = e.request; if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin === self.location.origin){
    if(req.mode === "navigate") { e.respondWith(networkFirst(new Request(self.registration.scope))); return; }
    e.respondWith(networkFirst(req)); return;
  }
  if(url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com"){ e.respondWith(cacheFirst(FONTS, req)); return; }
  if(/\/storage\/v1\/object\/sign\//.test(url.pathname)){ e.respondWith(cacheFirst(MEDIA, req)); return; }
});
