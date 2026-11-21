/* Triplanner — bağımsız sürüm: Supabase ile giriş, eşitleme, paylaşım ve fotoğraflar.
   Uygulama kodu (app-*.js) Claude içindeki sürümle aynıdır; window.TPB varsa bu katmanı kullanır. */
(function(){
"use strict";
var h = React.createElement;
var cfg = window.TP_CONFIG || {};
var ready = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase && window.supabase.createClient);
var sb = ready ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
  auth: {flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "triplanner-auth"}
}) : null;

var B = window.TPB = {ready: ready, loaded: false, session: null, client: sb};
var listeners = [];
function emit(){ listeners.forEach(function(f){ f(); }); }
function A(){ return window.TPA; }
function rerender(){ var a = A(); if(a && a.render) a.render(); }
function uid(){ return B.session ? B.session.user.id : null; }
function myEmail(){ return B.session ? String(B.session.user.email || "").toLowerCase() : ""; }

/* ---------- Oturum ---------- */
var LS_TRIPS = "triplanner-v3", LS_PENDING = "triplanner-pending", LS_UID = "triplanner-uid", LS_SIGNED = "triplanner-signed";
function clearLocal(){ [LS_TRIPS, LS_PENDING, LS_UID, LS_SIGNED].forEach(function(k){ try{ localStorage.removeItem(k); }catch(e){} }); }
function adoptSession(s){
  var had = !!B.session;
  B.session = s || null;
  if(s){
    var prev = null; try{ prev = localStorage.getItem(LS_UID); }catch(e){}
    if(prev && prev !== s.user.id){
      /* bu cihazda başka biri oturum açmıştı: onun gezileri ekranda kalmasın */
      clearLocal();
      var a = A(); if(a){ a.S.app = {order: [], trips: {}}; a.S.cur = null; }
    }
    try{ localStorage.setItem(LS_UID, s.user.id); }catch(e){}
    if(location.search && /[?&](code|error)=/.test(location.search)){
      try{ history.replaceState(null, "", location.pathname + location.hash); }catch(e){}
    }
  }
  if(!!B.session !== had) emit();
}
B.signIn = function(){
  if(!sb) return Promise.reject(new Error("Kurulum eksik"));
  return sb.auth.signInWithOAuth({provider: "google", options: {redirectTo: location.origin + location.pathname, queryParams: {prompt: "select_account"}}})
    .then(function(r){ if(r.error) throw r.error; });
};
B.signOut = function(){
  var done = function(){ clearLocal(); location.replace(location.pathname); };
  if(!sb){ done(); return; }
  sb.auth.signOut().then(done, done);
};
B.start = function(onIn){
  if(!sb){ emit(); return; }
  var started = false;
  function go(){ if(B.session && !started){ started = true; onIn(); } }
  sb.auth.onAuthStateChange(function(ev, s){
    /* Supabase bu geri çağrıda başka istek beklenmesini istemez; işi bir sonraki tura bırak */
    setTimeout(function(){ adoptSession(s); go(); }, 0);
  });
  sb.auth.getSession().then(function(r){ adoptSession(r.data && r.data.session); B.checked = true; emit(); go(); }, function(){ B.checked = true; emit(); });
  /* Android'de Google girişi ayrı bir pencerede bitebilir: uygulamaya dönünce oturumu yeniden oku */
  document.addEventListener("visibilitychange", function(){
    if(document.visibilityState === "visible" && !B.session) sb.auth.getSession().then(function(r){ adoptSession(r.data && r.data.session); go(); });
  });
};

/* ---------- Veritabanı: uygulamanın beklediği belge arayüzü ---------- */
var owners = {};          /* gezi id -> {owner, email} */
B.ownerOf = function(id){ return owners[id] || null; };
B.isOwner = function(id){ var o = owners[id]; return !o || o.owner === uid(); };
function mapErr(e){
  var c = e && e.code, err = new Error(e && e.message || "Hata");
  if(c === "42501" || c === "PGRST301" || c === "23505") err.code = "permission_denied";
  else if(c === "53400" || c === "54000") err.code = "quota_exceeded";
  else if(e && (e.name === "TypeError" || /fetch|network/i.test(e.message || ""))) err.code = "unavailable";
  return err;
}
function makeDb(){
  var subs = [], timer = null, chan = null, inflight = false, again = false;
  function fetchAll(){
    if(inflight){ again = true; return; }
    inflight = true;
    sb.from("trips").select("id,data,sort,owner,owner_email").then(function(r){
      inflight = false;
      if(r.error){ if(again){ again = false; fetchAll(); } return; }
      owners = {};
      var docs = (r.data || []).map(function(row){
        owners[row.id] = {owner: row.owner, email: row.owner_email};
        return {id: row.id, data: function(){ return {trip: row.data, order: row.sort}; }};
      });
      var first = !B.loaded; B.loaded = true;
      subs.forEach(function(s){ s({metadata: {fromCache: false}, docs: docs}); });
      if(first){ var a = A(); if(a && a.route) a.route(); }
      rerender();
      if(again){ again = false; fetchAll(); }
    }, function(){ inflight = false; });
  }
  function soon(){ clearTimeout(timer); timer = setTimeout(fetchAll, 300); }
  function listen(){
    if(chan) return;
    chan = sb.channel("triplanner")
      .on("postgres_changes", {event: "*", schema: "public", table: "trips"}, soon)
      .on("postgres_changes", {event: "*", schema: "public", table: "trip_members"}, soon)
      .subscribe();
    document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "visible") soon(); });
    window.addEventListener("online", soon);
    setInterval(function(){ if(document.visibilityState === "visible") fetchAll(); }, 60000);
  }
  function tripDoc(id){
    return {
      set: function(v){
        var row = {data: v.trip, sort: typeof v.order === "number" ? v.order : 999, updated_at: v.updatedAt || new Date().toISOString()};
        return sb.from("trips").update(row).eq("id", id).select("id").then(function(r){
          if(r.error) throw mapErr(r.error);
          if(r.data && r.data.length) return;
          return sb.from("trips").insert(Object.assign({id: id}, row)).then(function(r2){
            if(r2.error) throw mapErr(r2.error);
            owners[id] = {owner: uid(), email: myEmail()};
          });
        }, function(e){ throw mapErr(e); });
      },
      delete: function(){
        /* sahibi değilsen gezi silinmez: sadece paylaşımdan çıkarsın */
        var q = B.isOwner(id) ? sb.from("trips").delete().eq("id", id) : sb.from("trip_members").delete().eq("trip_id", id).eq("email", myEmail());
        return q.then(function(r){ if(r.error) throw mapErr(r.error); delete owners[id]; }, function(e){ throw mapErr(e); });
      }
    };
  }
  return {
    doc: function(path){
      if(path === "meta/app") return {
        onSnapshot: function(cb){ setTimeout(function(){ cb({exists: true, data: function(){ return {initialized: true}; }}); }, 0); return function(){}; },
        set: function(){ return Promise.resolve(); }
      };
      return tripDoc(path.split("/")[1]);
    },
    collection: function(){
      return {onSnapshot: function(cb){ subs.push(cb); listen(); fetchAll(); return function(){ subs = subs.filter(function(x){ return x !== cb; }); }; }};
    }
  };
}
var dbInst = null;
B.db = function(){ if(!sb || !B.session) return Promise.resolve(null); dbInst = dbInst || makeDb(); return Promise.resolve(dbInst); };

/* ---------- Fotoğraflar: özel depo, imzalı adresler ---------- */
var signed = {}; try{ signed = JSON.parse(localStorage.getItem(LS_SIGNED) || "{}") || {}; }catch(e){ signed = {}; }
var local = {}, queue = {}, qTimer = null;
var BLANK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
var WEEK = 7 * 24 * 3600;
function saveSigned(){ try{ localStorage.setItem(LS_SIGNED, JSON.stringify(signed)); }catch(e){} }
function flushQueue(){
  qTimer = null;
  var ids = Object.keys(queue); queue = {};
  if(!ids.length || !sb || !B.session) return;
  sb.storage.from("photos").createSignedUrls(ids, WEEK).then(function(r){
    if(r.error || !r.data) return;
    var until = Date.now() + (WEEK - 3600) * 1000;
    r.data.forEach(function(x){ if(x.signedUrl && x.path) signed[x.path] = {u: x.signedUrl, e: until}; });
    saveSigned(); rerender();
  });
}
B.photoUrl = function(asset){
  if(local[asset]) return local[asset];
  var s = signed[asset];
  if(s && s.e > Date.now()) return s.u;
  queue[asset] = true;
  if(!qTimer) qTimer = setTimeout(flushQueue, 30);
  return s ? s.u : BLANK;
};
function newId(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}
B.assets = {
  upload: function(blob){
    if(!sb || !B.session) return Promise.reject(new Error("Oturum yok"));
    var id = newId();
    return sb.storage.from("photos").upload(id, blob, {contentType: blob.type || "image/jpeg", upsert: false, cacheControl: "31536000"}).then(function(r){
      if(r.error) throw r.error;
      try{ local[id] = URL.createObjectURL(blob); }catch(e){}
      return {id: id, url: local[id] || ""};
    });
  }
};

/* ---------- Profil fotoğrafı: hazır avatar ya da yüklenen fotoğraf; seçim hesabın profil bilgisinde ---------- */
B.setPic = function(o){
  if(!sb || !B.session) return Promise.reject(new Error("Oturum yok"));
  o = o || {};
  return sb.auth.updateUser({data: {tp_avatar: o.photo ? "photo" : (o.avatar || null), tp_photo: o.photo || null}}).then(function(r){
    if(r.error) throw r.error;
    if(r.data && r.data.user && B.session) B.session = Object.assign({}, B.session, {user: r.data.user});
    rerender();
  });
};

/* ---------- Gezi sohbeti ---------- */
var chats = {};   /* gezi id -> {list, state, chan} */
function chatOf(id){ return chats[id] || (chats[id] = {list: [], state: "idle", chan: null, timer: null}); }
function mapMsg(r){ return {id: r.id, by: r.author, byName: r.author_name, body: r.body, refs: Array.isArray(r.refs) ? r.refs : [], at: r.created_at}; }
function chatLoad(id){
  var c = chatOf(id); if(!sb || !B.session) return;
  if(c.state === "loading") return; c.state = c.list.length ? c.state : "loading";
  sb.from("trip_messages").select("id,author,author_name,body,refs,created_at").eq("trip_id", id).order("created_at", {ascending: false}).limit(200).then(function(r){
    if(r.error){ c.state = /relation|does not exist|42P01|PGRST205/i.test((r.error.message || "") + (r.error.code || "")) ? "missing" : "error"; rerender(); return; }
    c.list = (r.data || []).map(mapMsg).reverse(); c.state = "ready"; rerender();
  }, function(){ c.state = "error"; rerender(); });
}
B.chat = {
  available: function(){ return !!(sb && B.session); },
  get: function(id){ return chatOf(id); },
  watch: function(id){
    var c = chatOf(id); if(!sb || !B.session || c.chan) return;
    chatLoad(id);
    c.chan = sb.channel("chat-" + id)
      .on("postgres_changes", {event: "*", schema: "public", table: "trip_messages", filter: "trip_id=eq." + id}, function(){ clearTimeout(c.timer); c.timer = setTimeout(function(){ chatLoad(id); }, 200); })
      .subscribe();
    document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "visible") chatLoad(id); });
  },
  refresh: chatLoad,
  send: function(id, body, refs){
    var w = A() && A().who ? A().who() : {name: ""};
    var c = chatOf(id), tmp = {id: "tmp" + Date.now(), by: uid(), byName: w.name, body: body, refs: refs || [], at: new Date().toISOString(), pending: true};
    c.list = c.list.concat([tmp]); rerender();
    return sb.from("trip_messages").insert({trip_id: id, author_name: (w.name || "").slice(0, 40), body: body, refs: refs || []}).then(function(r){
      if(r.error){ c.list = c.list.filter(function(m){ return m !== tmp; }); rerender(); throw mapErr(r.error); }
      chatLoad(id);
    });
  },
  remove: function(id, mid){
    var c = chatOf(id); c.list = c.list.filter(function(m){ return m.id !== mid; }); rerender();
    return sb.from("trip_messages").delete().eq("id", mid).then(function(){ chatLoad(id); });
  }
};

/* ---------- Yedek ---------- */
function download(name, text){
  var a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type: "application/json"}));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
B.exportAll = function(){
  var a = A(), app = a.S.app, d = new Date();
  var stamp = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  download("triplanner-yedek-" + stamp + ".json", JSON.stringify({kind: "triplanner", version: 1, order: app.order, trips: app.trips}, null, 1));
};
B.importFile = function(file){
  var a = A(), D = window.TPD;
  return file.text().then(function(text){
    var raw = JSON.parse(text), list = [];
    if(raw && raw.trips && typeof raw.trips === "object"){
      var order = Array.isArray(raw.order) ? raw.order : Object.keys(raw.trips);
      order.forEach(function(k){ if(raw.trips[k]) list.push(raw.trips[k]); });
    } else if(raw && raw.days) list.push(raw);
    var n = 0, firstId = null;
    list.slice(0, 20).forEach(function(r){
      var id = D.uid("t"), t = D.normalizeTrip(r, id); if(!t) return;
      t.id = id; a.S.app.trips[id] = t; a.S.app.order.push(id); a.sync.markCreated(id); a.commit(id); n++; firstId = firstId || id;
    });
    if(!n) throw new Error("Bu dosyada gezi bulunamadı.");
    a.S.dialog = null; a.go("tarihler", "", firstId);
    a.flash(n === 1 ? "Gezi yedekten yüklendi." : n + " gezi yedekten yüklendi.");
    return n;
  });
};

/* ---------- Arayüz parçaları ---------- */
function T(){ return window.Triplanner; }
function viewTheme(){
  var v = {}; try{ v = JSON.parse(localStorage.getItem("triplanner-v4-view") || "{}") || {}; }catch(e){}
  if(v._theme) return v._theme;
  return window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/* Oturum açılmadan uygulama gösterilmez */
B.Gate = function(p){
  var st = React.useState(0);
  React.useEffect(function(){ var f = function(){ st[1](function(n){ return n + 1; }); }; listeners.push(f); return function(){ listeners = listeners.filter(function(x){ return x !== f; }); }; }, []);
  if(B.session) return p.children;
  return h(Login, {checking: ready && !B.checked});
};
function Login(p){
  var t = T(), err = React.useState(""), busy = React.useState(false);
  var params = new URLSearchParams(location.search), urlErr = params.get("error_description");
  function go(){
    busy[1](true); err[1]("");
    B.signIn().catch(function(e){ busy[1](false); err[1]("Giriş başlatılamadı: " + (e && e.message || "bilinmeyen hata")); });
  }
  return h("div", {"data-theme": viewTheme(), className: "app-root"},
    h("div", {className: "tp-shell tpb-login"},
      h("div", {className: "tpb-login__card"},
        h(t.Logo, {variant: "plain"}),
        h("h1", {className: "page-title tpb-login__title"}, "Triplanner"),
        h("p", {className: "body app-muted tpb-login__text"}, "Gezilerini gün gün planla, yol arkadaşlarınla birlikte düzenle."),
        !ready ? h("p", {className: "body-sm tpb-login__warn"}, "Kurulum bitmedi: config.js dosyasına Supabase adresi ve anahtarı yazılmalı.")
        : p.checking ? h("p", {className: "body app-muted"}, "Oturum kontrol ediliyor…")
        : h(t.Button, {variant: "primary", icon: "user", full: true, onClick: go, disabled: busy[0]}, busy[0] ? "Google'a yönlendiriliyor…" : "Google ile giriş yap"),
        err[0] || urlErr ? h("p", {className: "body-sm tpb-login__warn", role: "alert"}, err[0] || ("Giriş tamamlanamadı: " + urlErr)) : null,
        h("p", {className: "body-sm app-muted tpb-login__fine"}, "Sadece adın ve e-postan alınır. E-postan, gezini seninle paylaşanlar için kullanılır."),
        h("p", {className: "body-sm app-muted tpb-login__fine"}, h("a", {href: "gizlilik.html", className: "tp-link"}, "Gizlilik"), " · ", h("a", {href: "kosullar.html", className: "tp-link"}, "Kullanım koşulları")))));
}

/* Hesap: giriş bilgisi, çıkış, yedek */
B.firstName = function(){
  var m = B.session && B.session.user.user_metadata || {};
  var n = String(m.given_name || m.full_name || m.name || "").trim().split(/\s+/)[0] || "";
  return n.length > 24 ? "" : n;
};
B.Account = function(p){
  var t = T(), fileRef = React.useRef(null), msg = React.useState("");
  if(!B.session) return null;
  var a = A(), hasTrips = a && a.S.app.order.length > 0, compact = p && p.compact;
  return h("div", {className: "tpb-account" + (compact ? " tpb-account--compact" : "")},
    h("p", {className: "body-sm app-muted", style: {margin: 0}}, "Giriş: " + (B.session.user.email || "")),
    h("div", {className: "app-row", style: {flexWrap: "wrap", gap: "var(--space-2)"}},
      hasTrips ? h(t.Button, {variant: "ghost", size: "sm", icon: "copy", onClick: B.exportAll}, "Yedeği indir") : null,
      h(t.Button, {variant: "ghost", size: "sm", icon: "refresh", onClick: function(){ fileRef.current && fileRef.current.click(); }}, "Yedekten yükle"),
      h(t.Button, {variant: "ghost", size: "sm", icon: "lock", onClick: B.signOut}, "Çıkış yap")),
    h("input", {ref: fileRef, type: "file", accept: "application/json,.json", className: "tp-sr", "aria-label": "Yedek dosyası", onChange: function(e){
      var f = e.target.files && e.target.files[0]; e.target.value = ""; if(!f) return;
      B.importFile(f).catch(function(x){ msg[1](x && x.message && !/JSON/.test(x.message) ? x.message : "Bu dosya okunamadı."); });
    }}),
    msg[0] ? h("p", {className: "body-sm tpb-login__warn", role: "alert", style: {margin: 0}}, msg[0]) : null);
};

/* Gezi ayarlarında paylaşım */
B.Members = function(p){
  var t = T(), id = p.tripId;
  var list = React.useState(null), email = React.useState(""), err = React.useState(""), busy = React.useState(false);
  var owner = B.ownerOf(id), mine = B.isOwner(id), onServer = !!owner;
  function load(){
    sb.from("trip_members").select("email").eq("trip_id", id).order("added_at").then(function(r){ if(!r.error) list[1](r.data.map(function(x){ return x.email; })); });
  }
  React.useEffect(function(){ if(sb && onServer) load(); }, [id, onServer]);
  function add(e){
    e.preventDefault(); e.stopPropagation();
    var v = email[0].trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)){ err[1]("Geçerli bir e-posta yaz."); return; }
    if(v === myEmail()){ err[1]("Bu senin adresin."); return; }
    busy[1](true); err[1]("");
    sb.from("trip_members").insert({trip_id: id, email: v}).then(function(r){
      busy[1](false);
      if(r.error){ err[1](r.error.code === "23505" ? "Bu kişi zaten ekli." : "Eklenemedi. Bağlantını kontrol et."); return; }
      email[1](""); load();
    });
  }
  function remove(v){ sb.from("trip_members").delete().eq("trip_id", id).eq("email", v).then(function(r){ if(!r.error) load(); }); }
  var people = list[0] || [];
  return h("div", {className: "app-zone tpb-members"},
    h("h3", {className: "label app-muted", style: {margin: 0}}, "Paylaşım"),
    !onServer ? h("p", {className: "body-sm app-muted", style: {margin: 0}}, "Gezi kaydedilince burada paylaşabilirsin.")
    : !mine ? h("p", {className: "body-sm", style: {margin: 0}}, "Bu geziyi " + (owner.email || "başka biri") + " seninle paylaştı. Planları ve harcamaları birlikte düzenliyorsunuz.")
    : h("p", {className: "body-sm app-muted", style: {margin: 0}}, "E-postasını eklediğin kişiler Google hesabıyla giriş yapınca bu geziyi görür ve düzenler."),
    onServer && people.length ? h("ul", {className: "tpb-members__list"}, people.map(function(v){
      return h("li", {key: v, className: "tpb-members__row"},
        h(t.Icon, {name: "user", size: 18}), h("span", {className: "body-sm app-ellipsis", style: {flex: 1, minWidth: 0}}, v),
        mine ? h(t.IconButton, {icon: "close", label: v + " paylaşımdan çıkarılsın", size: "sm", onClick: function(){ remove(v); }}) : null);
    })) : null,
    onServer && mine ? h("div", {className: "tpb-members__add", onKeyDown: function(e){ if(e.key === "Enter"){ add(e); } }},
      h("div", {style: {flex: 1, minWidth: 0}}, h(t.TextField, {label: "E-posta", value: email[0], placeholder: "arkadas@gmail.com", inputMode: "email", onChange: function(v){ email[1](v); err[1](""); }, error: err[0] || undefined})),
      h(t.Button, {variant: "secondary", icon: "plus", onClick: add, disabled: busy[0]}, "Ekle")) : null);
};
})();
