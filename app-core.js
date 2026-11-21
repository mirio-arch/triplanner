/* Triplanner arayüzü: durum, yönlendirme, kabuk. Bileşenler design system'den (window.Triplanner). */
(function(){
"use strict";
var D = window.TPD, T = window.Triplanner, h = React.createElement, F = React.Fragment;
var A = window.TPA = {};
A.D = D; A.T = T; A.h = h; A.F = F;

/* ================= Durum ================= */
var S = A.S = {
  app: D.loadLocal() || (window.TPB ? {order:[], trips:{}} : {order:["gurcistan"], trips:{gurcistan:D.seedGeorgia()}}),
  views: D.loadViews(),
  cur: null, page: "tarihler", sub: "",
  status: "connecting", toast: null, dialog: null, busy: {}, assets: null, assetsTried: false
};
S.cur = S.app.order[0] || null;
var listeners = [];
A.subscribe = function(fn){ listeners.push(fn); return function(){ listeners = listeners.filter(function(x){ return x !== fn; }); }; };
A.render = function(){ listeners.forEach(function(fn){ fn(); }); };

A.trip = function(){ return S.cur ? S.app.trips[S.cur] : null; };
A.view = function(){
  var t = A.trip(); if(!t) return {};
  var v = S.views[t.id] || (S.views[t.id] = {});
  if(!t.days.some(function(d){ return d.id === v.day; })) v.day = A.defaultDay(t);
  if(!v.mode) v.mode = "Kartlar";
  if(v.panel === undefined) v.panel = true;
  return v;
};
A.saveViews = function(){ D.saveViews(S.views); };
A.todayISO = function(){ var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0") + "-" + String(d.getDate()).padStart(2,"0"); };
A.todayDayId = function(t){ var iso = A.todayISO(); var d = t.days.find(function(x){ return x.date === iso; }); return d ? d.id : null; };
A.defaultDay = function(t){ return A.todayDayId(t) || (t.days[0] && t.days[0].id) || null; };
A.dayById = function(t, id){ return t.days.find(function(d){ return d.id === id; }); };
A.dayIndex = function(t, id){ return t.days.findIndex(function(d){ return d.id === id; }); };
A.dayLabel = function(t, id, long){
  if(id === "pre") return "Yola çıkmadan";
  var d = A.dayById(t, id); if(!d) return "";
  var f = D.fmtDay(d.date);
  return (A.todayDayId(t) === id ? "Bugün · " : "") + f.short + " " + (long ? f.wd : D.WDS[D.parseISO(d.date).getUTCDay()]);
};
A.dayTitle = function(t, d){ return d.title || (A.dayIndex(t, d.id) + 1) + ". gün"; };
A.whereIs = function(t, id){
  for(var i = 0; i < t.days.length; i++) if(t.days[i].items.indexOf(id) > -1) return t.days[i].id;
  if(t.removed.indexOf(id) > -1) return "removed";
  if(t.ideas.indexOf(id) > -1) return "ideas";
  return null;
};
A.listOf = function(t, key){ var d = A.dayById(t, key); return d ? d.items : t[key]; };
A.timeKey = function(s){ var m = /(\d{1,2})[:.](\d{2})/.exec(s || ""); return m ? (+m[1]) * 60 + (+m[2]) : null; };
A.moveItem = function(t, id, target, index){
  var from = A.whereIs(t, id);
  if(from){ var a = A.listOf(t, from); a.splice(a.indexOf(id), 1); }
  var arr = A.listOf(t, target), it = t.items[id];
  if(index === "time"){
    var k = A.timeKey(it.time), pos = arr.length;
    if(k !== null) for(var i = 0; i < arr.length; i++){ var o = A.timeKey(t.items[arr[i]] && t.items[arr[i]].time); if(o !== null && o > k){ pos = i; break; } }
    arr.splice(pos, 0, id);
  } else if(index == null || index > arr.length) arr.push(id); else arr.splice(index, 0, id);
  if(A.dayById(t, target)) delete it.from; else if(from && A.dayById(t, from)) it.from = from;
};

/* ================= Kaydetme ================= */
var sync = A.sync = D.Sync({
  getApp: function(){ return S.app; },
  setApp: function(next){ S.app = next; if(!S.app.trips[S.cur]) S.cur = S.app.order[0] || null; A.render(); },
  isBusy: function(id){ return id === S.cur && !!S.dialog; },
  onStatus: function(k){ S.status = k; A.render(); }
});
A.commit = function(tripId){
  var t = S.app.trips[tripId || S.cur];
  if(t) D.syncTransportExpenses(t);
  sync.schedule(tripId || S.cur); A.render();
};
A.flash = function(text, undo, label){
  clearTimeout(A._toastTimer);
  S.toast = {text: text, undo: undo, label: label, at: Date.now()};
  A._toastTimer = setTimeout(function(){ S.toast = null; A.render(); }, undo ? 6000 : 3200);
  A.render();
};
A.snapshot = function(){ var t = A.trip(); return t ? JSON.stringify(t) : null; };
A.restore = function(json){ var t = D.normalizeTrip(JSON.parse(json), S.cur); if(t){ S.app.trips[S.cur] = t; A.commit(); } };

/* ================= Yönlendirme ================= */
var PAGES = A.PAGES = ["hazirlik","tarihler","ulasim","harcamalar","galeri"];
A.PAGE_INFO = {
  hazirlik: {label:"Hazırlık", icon:"checklist"}, tarihler: {label:"Plan", icon:"calendar"}, ulasim: {label:"Ulaşım", icon:"route"},
  harcamalar: {label:"Harcamalar", icon:"wallet"}, galeri: {label:"Galeri", icon:"gallery"}
};
A.href = function(page, sub, tripId){ return "#" + (tripId || S.cur) + "-" + page + (sub ? "-" + sub : ""); };
/* Açılışta: süren ya da 30 gün içinde başlayacak gezi varsa onun planı, yoksa ana sayfa */
function startTrip(){
  var today = D.parseISO(A.todayISO()), best = null, bestN = 1e9;
  S.app.order.forEach(function(id){
    var t = S.app.trips[id]; if(!t) return;
    var s = D.parseISO(t.start), e = D.parseISO(t.end); if(!s || !e) return;
    var n = today < s ? Math.round((s - today) / 864e5) : (today <= e ? -1 : 1e9);
    if(n <= 30 && n < bestN){ best = id; bestN = n; }
  });
  return best;
}
function route(){
  var hsh = (location.hash || "").slice(1), m = /^([A-Za-z0-9]+)-(hazirlik|tarihler|ulasim|harcamalar|galeri)(?:-([a-z]+))?$/.exec(hsh);
  if(m && S.app.trips[m[1]]){ S.cur = m[1]; S.page = m[2]; S.sub = m[3] || ""; }
  else if(hsh === "home" || !S.app.order.length){ S.page = "home"; S.sub = ""; if(!S.app.trips[S.cur]) S.cur = S.app.order[0] || null; }
  else if(!hsh || !m){
    var st = startTrip();
    if(st){ S.cur = st; S.page = "tarihler"; S.sub = ""; try{ history.replaceState(null, "", A.href("tarihler", "", st)); }catch(e){} }
    else { S.page = "home"; S.sub = ""; try{ history.replaceState(null, "", location.pathname + location.search + "#home"); }catch(e){} }
  }
  if(S.page === "harcamalar" && S.sub && S.sub !== "ozet" && !D.EXP_CATS[S.sub]) S.sub = "";
  S.dialog = null;
  var t = S.page === "home" ? null : A.trip();
  document.title = t ? "Triplanner · " + t.name : "Triplanner";
  A.render();
  var body = document.querySelector("[data-scroll]"); if(body) body.scrollTop = 0;
}
A.go = function(page, sub, tripId){ var target = A.href(page, sub, tripId); if(location.hash === target) route(); else location.hash = target; };
window.addEventListener("hashchange", route);
A.route = route;

/* ================= Ekran boyu ================= */
A.useMedia = function(q){
  var mq = React.useMemo(function(){ return window.matchMedia ? window.matchMedia(q) : null; }, [q]);
  var st = React.useState(mq ? mq.matches : false);
  React.useEffect(function(){ if(!mq) return; var f = function(){ st[1](mq.matches); }; if(mq.addEventListener) mq.addEventListener("change", f); else mq.addListener(f); return function(){ if(mq.removeEventListener) mq.removeEventListener("change", f); else mq.removeListener(f); }; }, [mq]);
  return st[0];
};

/* ================= Küçük yardımcılar ================= */
A.cx = function(){ return Array.prototype.filter.call(arguments, Boolean).join(" "); };
A.Section = function(p){
  return h("section", {className: A.cx("app-card", p.className), "aria-labelledby": p.id, style: p.style},
    p.title ? h("div", {className: "app-card__head"},
      h("div", {style:{flex:"1 1 auto", minWidth:0}}, h(p.level === 3 ? "h3" : "h2", {id: p.id, className: p.small ? "heading" : "section-title", style:{margin:0}}, p.title),
        p.desc ? h("p", {className: "body-sm app-muted", style:{margin:0}}, p.desc) : null),
      p.right || null) : null,
    p.children);
};
A.PageHead = function(p){
  if(A.isPhone){
    /* telefonda sayfa adı alt menüde zaten yazıyor: başlık yalnızca ekran okuyucu için */
    var r = p.phoneRight !== undefined ? p.phoneRight : p.right;
    return h("header", {className: "app-pagehead app-pagehead--phone" + (r ? "" : " is-bare")},
      h("h1", {className: "tp-sr"}, p.title), r ? h("div", {className: "app-pagehead__phone"}, r) : null);
  }
  return h("header", {className: "app-pagehead"},
    h("div", {style:{flex:"1 1 320px", minWidth:0}},
      h("h1", {className: A.isPhone ? "heading" : "page-title", style:{margin:0}}, p.title),
      p.desc ? h("p", {className: "body app-muted", style:{margin:"var(--space-1) 0 0"}}, p.desc) : null),
    p.right ? h("div", {className: "app-pagehead__right"}, p.right) : null);
};
A.Field = function(p){ /* tarih ve sayı gibi yerel girişler, design system görünümüyle */
  var id = React.useMemo(function(){ return "f" + Math.random().toString(36).slice(2, 9); }, []);
  return h("div", {className: "tp-field"},
    h("label", {htmlFor: id, className: "label tp-field__label"}, p.label, p.optional ? h("span", {className: "tp-muted"}, " · isteğe bağlı") : null),
    h("input", {id: id, className: "tp-input body", type: p.type || "text", value: p.value == null ? "" : p.value, min: p.min, max: p.max, placeholder: p.placeholder, required: p.required, onChange: function(e){ p.onChange(e.target.value); }}),
    p.hint ? h("p", {className: "body-sm tp-muted"}, p.hint) : null);
};
A.Confirm = function(p){
  return h("div", {className: "app-confirm", role: "group", "aria-label": p.text},
    h("span", {className: "body-sm"}, p.text),
    h(T.Button, {size: "sm", variant: "danger", onClick: p.onYes}, p.yes || "Sil"),
    h(T.Button, {size: "sm", variant: "ghost", onClick: p.onNo}, "Vazgeç"));
};
A.money = function(t, amount, cur){ return D.fmtMoney(amount, cur || "TL"); };
A.tl = function(t, amount, cur){ var v = D.toTL(t, amount, cur); return v === null ? null : v; };

/* ================= Kabuk ================= */
var STATUS = {
  connecting:["Bağlanıyor", "neutral", "refresh"], saved:["Kaydedildi", "success", "check"], saving:["Kaydediliyor", "neutral", "refresh"],
  local:["Bu tarayıcıda", "neutral", "info"], offline:["Sunucuya ulaşılamadı", "warning", "warning"], readonly:["Salt okunur", "warning", "lock"],
  error:["Kaydedilemedi", "danger", "warning"], quota:["Depolama dolu", "danger", "warning"]
};
A.StatusChip = function(){
  var s = STATUS[S.status] || STATUS.local;
  var sub = S.status === "saved" ? "tüm cihazlarda" : (["local","offline","error","quota"].indexOf(S.status) > -1 ? (window.TPB ? "bu cihazda; bağlanınca gönderilir" : "bu tarayıcıda tutuluyor") : "");
  return h("div", {className: "app-status"}, h(T.Chip, {tone: s[1], icon: s[2]}, s[0]), sub ? h("span", {className: "body-sm"}, sub) : null);
};
var COLORS = ["wine","blue","green","amber","teal","violet"];
A.COLORS = COLORS;

function navCounts(t){
  var done = t.checklist.filter(function(c){ return c.done; }).length;
  var transit = Object.keys(t.items).filter(function(k){ return t.items[k].cat === "ulasim" && A.whereIs(t, k) && A.dayById(t, A.whereIs(t, k)); }).length;
  return {hazirlik: done + "/" + t.checklist.length, tarihler: t.days.filter(function(d){ return d.items.length; }).length, ulasim: transit, harcamalar: t.expenses.length || "", galeri: t.photos.length || ""};
}
A.navCounts = navCounts;

function Rail(){
  return h("nav", {className: "tp-onshell app-rail", "aria-label": "Geziler"},
    h(T.Logo, {variant: "plain", href: "#home", label: "Triplanner · Ana sayfa"}),
    h("span", {className: "app-rail__sep", "aria-hidden": "true"}),
    h("a", {href: "#home", className: "tp-trip__btn app-rail__home" + (S.page === "home" ? " is-active" : ""), "aria-label": "Ana sayfa", title: "Ana sayfa", "aria-current": S.page === "home" ? "page" : undefined}, h(T.Icon, {name: "home", size: 22})),
    S.app.order.map(function(id){
      var t = S.app.trips[id]; if(!t) return null;
      var pg = S.page === "home" ? "tarihler" : S.page;
      return h(T.TripAvatar, {key: id, initials: t.short, label: t.name, color: COLORS[t.color % 6], active: S.page !== "home" && id === S.cur, href: A.href(pg, "", id)});
    }),
    h("span", {style: {flex: 1}}),
    h(T.IconButton, {icon: "plus", label: "Yeni gezi", variant: "rail", size: "lg", round: true, onClick: function(){ S.dialog = {kind: "trip-new"}; A.render(); }}),
    h(A.AvatarButton, {size: 44}));
}
/* Profil fotoğrafı (Google) ya da baş harfler; dokununca profil */
A.me = function(){
  var B = window.TPB, u = B && B.session ? B.session.user : null, md = u ? (u.user_metadata || {}) : {};
  var name = md.full_name || md.name || (u && u.email ? u.email.split("@")[0] : "");
  return {name: name, email: u ? u.email : "", photo: md.avatar_url || md.picture || "", initials: name ? D.initials(name) : ""};
};
/* ---------- Kim ne yaptı ---------- */
A.who = function(){
  var B = window.TPB, u = B && B.session ? B.session.user : null;
  if(!u) return {by: "", name: ""};
  var n = (B.firstName && B.firstName()) || String(u.email || "").split("@")[0];
  return {by: u.id, name: D.str(n, 40)};
};
A.stamp = function(o){ var w = A.who(); if(w.by){ o.by = w.by; o.byName = w.name; } if(!o.at) o.at = new Date().toISOString(); return o; };
A.log = function(t, kind, ref, text){
  if(!t) return; var w = A.who();
  t.activity = t.activity || [];
  var a = {id: D.uid("a"), at: new Date().toISOString(), kind: kind, ref: ref || "", text: D.str(text, 160)};
  if(w.by){ a.by = w.by; a.byName = w.name; }
  t.activity.unshift(a); if(t.activity.length > 300) t.activity.length = 300;
};
A.isMine = function(by){ var w = A.who(); return !by || !w.by || by === w.by; };
A.nameOf = function(by, byName){ return A.isMine(by) ? "Sen" : (byName || "Biri"); };
/* kişiye göre sabit renk */
var PCOL = ["teal", "violet", "amber", "blue", "green", "wine"];
A.personColor = function(by){ var s = String(by || ""), n = 0; for(var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) % 997; return PCOL[n % PCOL.length]; };
A.unseen = function(t){
  if(!t || !t.activity || !t.activity.length) return 0;
  var v = A.view(), seen = v.seenAt || "";
  return t.activity.filter(function(a){ return !A.isMine(a.by) && a.at > seen; }).length;
};
A.ActivityButton = function(p){
  var t = A.trip(); if(!t || S.page === "home") return null;
  var n = A.unseen(t);
  return h("button", {type: "button", className: "app-actbtn" + (p.onShell ? " is-shell" : ""), "aria-label": "Son hareketler" + (n ? ", " + n + " yeni" : ""), title: "Son hareketler",
      onClick: function(){ S.dialog = {kind: "activity"}; A.render(); }},
    h(T.Icon, {name: "bell", size: p.size || 22}), n ? h("span", {className: "app-actbtn__n"}, n > 9 ? "9+" : n) : null);
};

/* Gezi simgesi, tıklanmayan hali (başka bir düğmenin içinde kullanmak için) */
A.shortRange = function(t){ var a = D.fmtDay(t.start), b = D.fmtDay(t.end); return a.short + " – " + b.short; };
A.TripMark = function(p){ var t = p.t; return h("span", {className: "tp-trip__btn app-tripmark", "aria-hidden": "true", style: {background: "var(--category-" + COLORS[t.color % 6] + "-strong)"}}, t.short); };
A.AvatarButton = function(p){
  var me = A.me(), sz = p.size || 40, err = React.useState(false);
  return h("button", {type: "button", className: "app-avatar", style: {width: sz, height: sz}, "aria-label": "Profil" + (me.name ? ": " + me.name : ""), title: "Profil",
      onClick: function(){ S.dialog = {kind: "profile"}; A.render(); }},
    me.photo && !err[0] ? h("img", {src: me.photo, alt: "", referrerPolicy: "no-referrer", onError: function(){ err[1](true); }})
      : (me.initials ? h("span", null, me.initials) : h(T.Icon, {name: "user", size: Math.round(sz * .5)})));
};
function Sidebar(){
  var t = A.trip();
  if(S.page === "home" || !t) return h("nav", {className: "tp-onshell app-side", "aria-label": "Ana sayfa"},
    h("div", {className: "app-side__trip"}, h("div", {style: {flex: 1, minWidth: 0}}, h("div", {className: "heading app-ellipsis"}, "Triplanner"), h("div", {className: "body-sm app-weak"}, "Gezilerin ve tatil fırsatları"))),
    A.homeSubmenu ? A.homeSubmenu() : null,
    h("div", {className: "app-side__foot"}, h(A.StatusChip)));
  var c = navCounts(t);
  var sub = A.pages[S.page] && A.pages[S.page].submenu ? A.pages[S.page].submenu(t) : null;
  return h("nav", {className: "tp-onshell app-side", "aria-label": t.name + " sayfaları"},
    h("div", {className: "app-side__trip"},
      h("div", {style:{flex:1, minWidth:0}},
        h("div", {className: "heading app-ellipsis"}, t.name),
        h("div", {className: "body-sm app-weak"}, D.fmtRange(t.start, t.end) + " · " + t.days.length + " gün")),
      h(A.ActivityButton, {size: 18}),
      h(T.IconButton, {icon: "settings", label: "Gezi ayarları", size: "sm", onClick: function(){ S.dialog = {kind: "trip-settings"}; A.render(); }})),
    h("div", {className: "app-side__nav"}, PAGES.map(function(p){
      return h(T.NavItem, {key: p, icon: A.PAGE_INFO[p].icon, label: A.PAGE_INFO[p].label, count: c[p], href: A.href(p), active: S.page === p});
    })),
    sub,
    h("div", {className: "app-side__foot"}, h(A.StatusChip)));
}
A.Submenu = function(p){
  return h("div", {className: "app-side__sub"}, (p.sections || [{title: p.title, items: p.children}]).map(function(s, i){
    return h(F, {key: i}, h("h2", {className: "label app-side__subhead", style: i ? {marginTop: "var(--space-5)"} : null}, s.title), s.items);
  }));
};

function PhoneHeader(){
  var home = S.page === "home", t = home ? null : A.trip();
  return h("header", {className: "tp-onshell app-phonehead"},
    h("a", {href: "#home", className: "app-phonehead__logo", "aria-label": "Ana sayfa"}, h(T.Logo, {variant: "plain", size: "sm"})),
    home || !t ? h("div", {className: "app-phonehead__title"}, h("span", {className: "body-strong"}, "Triplanner"), h("span", {className: "body-sm app-weak"}, "Gezilerin"))
    : h("button", {type: "button", className: "app-phonehead__trip", onClick: function(){ S.dialog = {kind: "trip-menu"}; A.render(); }, "aria-label": "Gezi değiştir: " + t.name},
      h(A.TripMark, {t: t}),
      h("span", {style:{minWidth:0, textAlign:"left", flex: 1}},
        h("span", {className: "body-strong app-ellipsis", style:{display:"block"}}, t.name),
        h("span", {className: "body-sm app-weak app-ellipsis", style:{display:"block"}}, A.shortRange(t) + " · " + t.days.length + " gün"))),
    t ? h(A.ActivityButton, {onShell: true}) : null,
    h(A.AvatarButton, {size: 44}));
}
function PhoneNav(){
  var t = A.trip(); if(!t || S.page === "home") return null;
  var c = navCounts(t);
  return h("div", {className: "tp-onshell app-phonenav"}, h(T.BottomNav, {label: "Sayfalar", items: PAGES.map(function(p){
    return {label: A.PAGE_INFO[p].label, icon: A.PAGE_INFO[p].icon, href: A.href(p), active: S.page === p, badge: p === "hazirlik" ? (t.checklist.length - t.checklist.filter(function(x){ return x.done; }).length) || undefined : undefined};
  })}));
}

/* tema */
A.dark = false;
A.toggleTheme = function(){ S.views._theme = A.dark ? "light" : "dark"; A.saveViews(); A.render(); };
A.setTheme = function(mode){ if(mode) S.views._theme = mode; else delete S.views._theme; A.saveViews(); A.render(); };

A.pages = {};
function Root(){
  var st = React.useState(0);
  React.useEffect(function(){ return A.subscribe(function(){ st[1](function(n){ return n + 1; }); }); }, []);
  var phone = A.useMedia("(max-width: 899px)");
  var sysDark = A.useMedia("(prefers-color-scheme: dark)");
  A.isPhone = phone;
  A.dark = S.views._theme ? S.views._theme === "dark" : sysDark;
  var home = S.page === "home" || !A.trip(), t = home ? null : A.trip();
  var Page = t && A.pages[S.page] ? A.pages[S.page].view : null;
  var content = home ? (A.Home ? h(A.Home) : h(A.EmptyApp)) : (Page ? h(Page, {t: t, v: A.view()}) : null);
  var overlay = A.Dialogs ? h(A.Dialogs) : null;
  var toast = S.toast ? h("div", {className: "app-toastwrap"}, h(T.Toast, {key: S.toast.at, text: S.toast.text, actionLabel: S.toast.undo ? (S.toast.label || "Geri al") : undefined, onAction: S.toast.undo ? function(){ var u = S.toast.undo; S.toast = null; u(); } : undefined})) : null;
  if(phone){
    return h("div", {"data-theme": A.dark ? "dark" : "light", className: "app-root"},
      h("div", {className: "tp-shell app-phone"}, h(PhoneHeader),
        h("div", {className: "tp-phonecard app-phonecard" + (t ? "" : " app-phonecard--flush")}, h("div", {className: "app-phonebody", "data-scroll": true}, content)),
        h(PhoneNav)), overlay, toast);
  }
  return h("div", {"data-theme": A.dark ? "dark" : "light", className: "app-root"},
    h("div", {className: "tp-shell app-desk"}, h(Rail), h(Sidebar),
      h("main", {className: "tp-shellcard app-main"}, content)), overlay, toast);
}
A.Root = Root;

A.StartChoices = function(){
  var B = window.TPB;
  function startNew(){ S.dialog = {kind: "trip-new"}; A.render(); }
  function startSeed(){ var n = D.seedGeorgia(); n.id = D.uid("t"); S.app.trips[n.id] = n; S.app.order.push(n.id); A.sync.markCreated(n.id); A.commit(n.id); A.go("tarihler", "", n.id); }
  function choice(key, onClick, lead, title, text){
    return h("button", {key: key, type: "button", className: "app-start__choice", onClick: onClick},
      lead, h("span", {className: "app-start__text"}, h("span", {className: "heading"}, title), h("span", {className: "body-sm app-muted"}, text)),
      h(T.Icon, {name: "chevron-right", size: 20, className: "app-start__chev"}));
  }
  return h("div", {className: "app-start__choices"},
    choice("new", startNew, h("span", {className: "app-start__icon"}, h(T.Icon, {name: "plus", size: 22})), "Yeni gezi", "Adını ve tarihlerini gir; her gün için bir sayfa açılır."),
    B ? choice("seed", startSeed, h("span", {className: "app-start__avatar", "aria-hidden": "true"}, "GE"), "Gürcistan Yılbaşı", "30 Ara – 3 Oca · Batum ve Kutaisi. Günlük planlar, ulaşım ve hazırlık listesi hazır.") : null);
};
A.EmptyApp = function(){
  var B = window.TPB;
  if(B && !B.loaded) return h("div", {className: "app-empty"}, h("p", {className: "body app-muted"}, "Geziler yükleniyor…"));
  var name = B && B.firstName ? B.firstName() : "", email = B && B.session ? B.session.user.email : "";
  function startNew(){ S.dialog = {kind: "trip-new"}; A.render(); }
  function startSeed(){
    var n = D.seedGeorgia(); n.id = D.uid("t"); S.app.trips[n.id] = n; S.app.order.push(n.id); A.sync.markCreated(n.id); A.commit(n.id); A.go("tarihler", "", n.id);
  }
  function choice(key, onClick, lead, title, text){
    return h("button", {key: key, type: "button", className: "app-start__choice", onClick: onClick},
      lead, h("span", {className: "app-start__text"}, h("span", {className: "heading"}, title), h("span", {className: "body-sm app-muted"}, text)),
      h(T.Icon, {name: "chevron-right", size: 20, className: "app-start__chev"}));
  }
  return h("div", {className: "app-start"},
    h("div", {className: "app-start__inner"},
      h("div", {className: "app-start__art"}, h(T.Illustration, {name: "trip"})),
      h("h1", {className: "page-title app-start__title"}, name ? "Merhaba " + name + "!" : "İlk gezini planlayalım"),
      h("p", {className: "body app-muted app-start__lead"}, name ? "İlk gezini planlayalım: boş bir geziyle başla ya da hazır planı kullan." : "Adını ve tarihlerini gir; her gün için bir sayfa açılır."),
      h("div", {className: "app-start__choices"},
        choice("new", startNew, h("span", {className: "app-start__icon"}, h(T.Icon, {name: "plus", size: 22})), "Yeni gezi", "Adını ve tarihlerini gir; her gün için bir sayfa açılır."),
        B ? choice("seed", startSeed, h("span", {className: "app-start__avatar", "aria-hidden": "true"}, "GE"), "Gürcistan Yılbaşı", "30 Ara – 3 Oca · Batum ve Kutaisi. Günlük planlar, ulaşım ve hazırlık listesi hazır.") : null),
      B ? h("div", {className: "app-start__note"},
        h(T.Icon, {name: "share", size: 18}),
        h("p", {className: "body-sm", style: {margin: 0}}, "Bir arkadaşın seni geziye eklediyse burada kendiliğinden görünür. Seni ", h("strong", null, email), " adresiyle eklemesi yeterli.")) : null),
    B ? h("div", {className: "app-start__foot"}, h(B.Account, {compact: true})) : null);
};

/* Ana içerik iskeleti: başlık, kayan gövde, sağ kart */
/* Telefonda sağ kartın yeri: kapalıyken yüzen düğme; açılınca alttan gelen,
   kenarından çekilerek küçük / yarım / tam boya getirilen bölme. */
A.PhonePane = function(p){
  var v = A.view(), boxRef = React.useRef(null), peekRef = React.useRef(null), st = React.useRef(null);
  v.panes = v.panes || {};
  var snap = ["s", "h", "f"].indexOf(v.panes[p.id]) > -1 ? v.panes[p.id] : "c";
  var size = React.useState({H: 600, S: 140}), drag = React.useState(null), leaving = React.useState(false);
  React.useEffect(function(){
    var box = boxRef.current && boxRef.current.parentNode; if(!box) return;
    function m(){ var pk = peekRef.current; size[1](function(o){ var n = {H: box.clientHeight, S: pk ? pk.offsetHeight + 30 : o.S}; return n.H === o.H && n.S === o.S ? o : n; }); }
    m(); if(!window.ResizeObserver) return;
    var ro = new ResizeObserver(m); ro.observe(box); if(peekRef.current) ro.observe(peekRef.current);
    return function(){ ro.disconnect(); };
  }, [snap === "c", snap === "s"]);
  function setSnap(x){ v.panes[p.id] = x; A.saveViews(); A.render(); }
  function close(){ leaving[1](true); setTimeout(function(){ leaving[1](false); setSnap("c"); }, 220); }
  if(snap === "c"){
    return h("button", {ref: boxRef, type: "button", className: "app-fab", onClick: function(){ setSnap("s"); }, "aria-label": p.fab.aria || p.fab.label},
      h(T.Icon, {name: p.fab.icon || "plus", size: 20}), h("span", null, p.fab.label),
      p.fab.count ? h("span", {className: "app-fab__count"}, p.fab.count) : null);
  }
  var H = size[0].H, S0 = Math.min(size[0].S, Math.round(H * .45)), heights = {s: S0, h: Math.max(S0 + 60, Math.round(H * .55)), f: H};
  var height = drag[0] ? drag[0].cur : heights[snap];
  var showFull = drag[0] ? height > S0 + 48 : snap !== "s";
  function down(e){ if(e.button !== undefined && e.button !== 0) return; st.current = {y: e.clientY, h0: heights[snap], moved: false}; try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(x){} }
  function move(e){ var s = st.current; if(!s) return; var dy = s.y - e.clientY; if(Math.abs(dy) > 5) s.moved = true; if(s.moved) drag[1]({cur: Math.max(40, Math.min(H, s.h0 + dy))}); }
  function up(){
    var s = st.current; st.current = null; if(!s) return;
    if(!s.moved){ drag[1](null); setSnap(snap === "h" ? "s" : "h"); return; }
    var cur = drag[0] ? drag[0].cur : heights[snap]; drag[1](null);
    if(cur < S0 - 40){ close(); return; }
    var best = "s"; ["s", "h", "f"].forEach(function(k){ if(Math.abs(heights[k] - cur) < Math.abs(heights[best] - cur)) best = k; });
    setSnap(best);
  }
  function key(e){
    var order = ["s", "h", "f"], i = order.indexOf(snap);
    if(e.key === "ArrowUp"){ e.preventDefault(); setSnap(order[Math.min(2, i + 1)]); }
    else if(e.key === "ArrowDown"){ e.preventDefault(); if(i === 0) close(); else setSnap(order[i - 1]); }
    else if(e.key === "Enter" || e.key === " "){ e.preventDefault(); setSnap(snap === "h" ? "s" : "h"); }
    else if(e.key === "Escape"){ e.preventDefault(); close(); }
  }
  return h("section", {ref: boxRef, className: "app-pane" + (drag[0] ? " is-dragging" : "") + (leaving[0] ? " is-leaving" : "") + (showFull ? " is-full" : ""), "aria-label": p.label, style: {height: height + "px"}},
    h("div", {className: "app-pane__edge", role: "slider", tabIndex: 0, "aria-label": p.label + " boyutu", "aria-valuemin": 0, "aria-valuemax": 2,
        "aria-valuenow": ["s", "h", "f"].indexOf(snap), "aria-valuetext": {s: "küçük", h: "yarım", f: "tam"}[snap],
        onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onKeyDown: key}, h("span", {className: "app-mappane__grip"})),
    h("div", {className: "app-pane__close"}, h(T.IconButton, {icon: "close", label: p.label + " kapansın", size: "sm", onClick: close})),
    showFull ? h("div", {className: "app-pane__scroll"}, p.full)
      : h("div", {ref: peekRef, className: "app-pane__peek"}, p.peek));
};

A.Layout = function(p){
  var aside = p.aside ? h("aside", {className: "tp-panel-surface app-aside", "aria-label": p.asideLabel || "Kenar"}, p.aside) : null;
  if(A.isPhone){
    var page = h("div", {className: "app-phonepage"}, p.children, p.pane || p.phoneAside === false ? null : (p.aside ? h("div", {className: "app-phoneaside"}, p.aside) : null));
    if(p.pane) return h("div", {className: "app-tphone has-pane"},
      h("div", {className: "app-tphone__list", "data-scroll": true}, p.head, page),
      h(A.PhonePane, Object.assign({key: p.pane.id}, p.pane)));
    return h(F, null, p.head, page);
  }
  return h(F, null, p.head,
    h("div", {className: "tp-shellbody app-body", "data-scroll": true},
      p.top || null,
      h("div", {className: "app-cols"}, h("div", {className: "app-colmain"}, p.children), aside)));
};
})();
