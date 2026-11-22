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
  return (A.todayDayId(t) === id ? "Bugün, " : "") + f.short + " " + (long ? f.wd : D.WDS[D.parseISO(d.date).getUTCDay()]);
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
  else if(hsh === "profil"){ S.page = "profil"; S.sub = ""; if(!S.app.trips[S.cur]) S.cur = S.app.order[0] || null; }
  else if(hsh === "home" || !S.app.order.length){ S.page = "home"; S.sub = ""; if(!S.app.trips[S.cur]) S.cur = S.app.order[0] || null; }
  else if(!hsh || !m){
    var st = startTrip();
    if(st){ S.cur = st; S.page = "tarihler"; S.sub = ""; try{ history.replaceState(null, "", A.href("tarihler", "", st)); }catch(e){} }
    else { S.page = "home"; S.sub = ""; try{ history.replaceState(null, "", location.pathname + location.search + "#home"); }catch(e){} }
  }
  if(S.page === "harcamalar" && S.sub && S.sub !== "ozet" && !D.EXP_CATS[S.sub]) S.sub = "";
  S.dialog = null;
  var pg = S.cur + "-" + S.page; if(S._lastPage !== pg){ S.panes = {}; S.mapSnap = "c"; S._lastPage = pg; }
  var t = A.offTrip() ? null : A.trip();
  document.title = t ? "Triplanner – " + t.name : "Triplanner";
  A.render();
  var body = document.querySelector("[data-scroll]"); if(body) body.scrollTop = 0;
}
/* gezi dışı sayfalar: ana sayfa ve profil */
A.offTrip = function(){ return S.page === "home" || S.page === "profil"; };
A.go = function(page, sub, tripId){ var target = A.href(page, sub, tripId); if(location.hash === target) route(); else location.hash = target; };
window.addEventListener("hashchange", route);
A.route = route;

/* ================= Ortak parçalar: ⋯ menüsü ve açılan alan ================= */
/* ⋯ menüsü kartın dışında, ekranın üstünde açılır: çentikli ya da taşmayı gizleyen kartlarda kesilmez.
   Aşağıda yer yoksa düğmenin üstüne açılır. */
A.MoreMenu = function(p){
  var open = React.useState(false), trig = React.useRef(null), panel = React.useRef(null);
  var items = (p.items || []).filter(Boolean), width = parseInt(p.menuWidth || "240", 10);
  function close(back){ open[1](false); if(back && trig.current) trig.current.focus(); }
  React.useLayoutEffect(function(){
    if(!open[0] || !trig.current || !panel.current) return;
    var r = trig.current.getBoundingClientRect(), el = panel.current, vv = window.visualViewport;
    var vh = vv ? vv.height + vv.offsetTop : window.innerHeight, vw = window.innerWidth, ph = el.offsetHeight;
    var left = Math.min(Math.max(8, r.right - width), vw - width - 8), up = r.bottom + 4 + ph > vh - 8 && r.top - 4 - ph >= 8;
    el.style.left = left + "px"; el.style.top = (up ? r.top - 4 - ph : Math.max(8, Math.min(r.bottom + 4, vh - 8 - ph))) + "px";
    el.style.transformOrigin = (up ? "bottom " : "top ") + (r.right - left > width / 2 ? "right" : "left");
    var first = el.querySelector("[role=menuitem]"); if(first) first.focus({preventScroll: true});
    function down(e){ if(!el.contains(e.target) && !trig.current.contains(e.target)) close(false); }
    function key(e){ if(e.key === "Escape"){ e.preventDefault(); close(true); } }
    function away(e){ if(!el.contains(e.target)) close(false); }
    document.addEventListener("pointerdown", down, true); document.addEventListener("keydown", key);
    window.addEventListener("scroll", away, true); window.addEventListener("resize", away);
    return function(){ document.removeEventListener("pointerdown", down, true); document.removeEventListener("keydown", key); window.removeEventListener("scroll", away, true); window.removeEventListener("resize", away); };
  }, [open[0]]);
  function nav(e){
    var list = Array.prototype.slice.call(panel.current.querySelectorAll("[role=menuitem]")), i = list.indexOf(document.activeElement);
    if(e.key === "ArrowDown" || e.key === "ArrowUp"){ e.preventDefault(); var n = list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length]; if(n) n.focus(); }
    else if(e.key === "Home" || e.key === "End"){ e.preventDefault(); (e.key === "Home" ? list[0] : list[list.length - 1]).focus(); }
    else if(e.key === "Tab") close(false);
  }
  var root = document.querySelector(".app-root") || document.body;
  var menu = open[0] && window.ReactDOM ? ReactDOM.createPortal(
    h("div", {ref: panel, role: "menu", "aria-label": p.ariaLabel, className: "tp-pop__panel app-menu", style: {minWidth: width + "px"}, onKeyDown: nav,
        onClick: function(e){ e.stopPropagation(); }, onPointerDown: function(e){ e.stopPropagation(); }},
      items.map(function(it, i){
        if(it === "-" || it.divider) return h("div", {key: i, role: "separator", className: "tp-menu__sep"});
        return h("button", {key: i, type: "button", role: "menuitem", className: "tp-option" + (it.danger ? " tp-option--danger" : ""), onClick: function(){ close(true); if(it.onClick) it.onClick(); }},
          it.icon ? h(T.Icon, {name: it.icon, size: 18}) : null,
          h("span", {className: "tp-option__text"}, h("span", {className: "body"}, it.label), it.description ? h("span", {className: "body-sm tp-muted"}, it.description) : null));
      })), root) : null;
  return h(F, null,
    h("button", {ref: trig, type: "button", className: "tp-iconbtn tp-iconbtn--" + (p.variant || "ghost") + (p.size === "sm" ? " tp-iconbtn--sm" : ""),
      "aria-label": p.ariaLabel || "Seçenekler", title: p.ariaLabel || "Seçenekler", "aria-haspopup": "menu", "aria-expanded": open[0] ? "true" : "false",
      onClick: function(e){ e.stopPropagation(); open[1](!open[0]); }}, h(T.Icon, {name: "more", size: p.size === "sm" ? 18 : 20})),
    menu);
};

/* Seçilen kartın altında açılan alan (düğmeler, ayrıntı): yükseklik yumuşakça açılır, kapalıyken odaklanılamaz */
A.Expand = function(p){
  var ref = React.useRef(null), open = !!p.open, settled = React.useState(open);
  React.useEffect(function(){
    if(ref.current) ref.current.inert = !open;
    if(!open){ settled[1](false); return; }
    var tm = setTimeout(function(){ settled[1](true); }, 300);
    return function(){ clearTimeout(tm); };
  }, [open]);
  return h("div", {ref: ref, className: "app-expand" + (open ? " is-open" : "") + (p.className ? " " + p.className : ""), "aria-hidden": open ? undefined : "true",
      onClick: p.stop ? function(e){ e.stopPropagation(); } : undefined},
    h("div", {className: "app-expand__in" + (open && settled[0] ? " is-settled" : "")}, h("div", {className: "app-expand__body"}, p.children)));
};

/* ================= Klavye ================= */
/* Telefonda klavye açılınca kabuğu görünen alana sığdır: alt menü gizlenir, alt bölme klavyenin hemen üstünde kalır */
(function(){
  var vv = window.visualViewport; if(!vv) return;
  var root = document.documentElement, raf = 0, base = vv.height, baseW = window.innerWidth;
  function typingNow(){
    var ae = document.activeElement;
    return !!ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable) && !/^(checkbox|radio|file|button|submit|range|color)$/.test(ae.type || "");
  }
  function fit(){
    raf = 0;
    var typing = typingNow();
    /* klavyesiz en uzun görünür boy temel alınır: iOS'ta pencere boyu da klavyeyle küçülebiliyor */
    if(window.innerWidth !== baseW){ baseW = window.innerWidth; base = typing ? Math.max(window.innerHeight, vv.height) : vv.height; }
    if(!typing) base = Math.max(base, vv.height);
    var full = Math.max(base, window.innerHeight), kb = full - vv.height;
    if(kb > 120 && typing && window.innerWidth < 900 && (vv.scale || 1) < 1.05){
      var was = root.classList.contains("kbd"), h0 = root.style.getPropertyValue("--vvh");
      root.classList.add("kbd");
      root.style.setProperty("--vvh", Math.round(vv.height) + "px"); root.style.setProperty("--vvt", Math.round(vv.offsetTop) + "px");
      /* klavye açıldı ya da görünen alan değişti: yazılan alan klavyenin üstünde görünsün */
      if(!was || h0 !== Math.round(vv.height) + "px") reveal(document.activeElement);
    } else if(root.classList.contains("kbd")){ root.classList.remove("kbd"); root.style.removeProperty("--vvh"); root.style.removeProperty("--vvt"); }
  }
  /* odaktaki alanı, içinde bulunduğu kayan alanda görünür yere getirir (pencereyi değil, kutuyu kaydırır) */
  function reveal(el){
    if(!el || !el.getBoundingClientRect) return;
    requestAnimationFrame(function(){ setTimeout(function(){
      if(document.activeElement !== el) return;
      var sc = el.parentNode;
      while(sc && sc !== document.body){ var cs = getComputedStyle(sc); if(/(auto|scroll)/.test(cs.overflowY) && sc.scrollHeight > sc.clientHeight + 1) break; sc = sc.parentNode; }
      if(!sc || sc === document.body) return;
      var r = el.getBoundingClientRect(), b = sc.getBoundingClientRect(), pad = 16;
      /* altta sabit düğme alanı varsa onun üstünde kalsın */
      var foot = sc.querySelector(":scope .app-stickyfoot"), fh = foot && getComputedStyle(foot).position === "sticky" ? foot.offsetHeight : 0;
      if(r.bottom > b.bottom - fh - pad) sc.scrollTop += r.bottom - (b.bottom - fh - pad);
      else if(r.top < b.top + pad) sc.scrollTop -= (b.top + pad) - r.top;
    }, 60); });
  }
  A.revealField = reveal;
  function soon(){ if(!raf) raf = requestAnimationFrame(fit); }
  vv.addEventListener("resize", soon); vv.addEventListener("scroll", soon); window.addEventListener("resize", soon);
  document.addEventListener("focusin", function(e){ soon(); setTimeout(soon, 120); setTimeout(soon, 400);
    /* klavye zaten açıkken başka alana geçilince de görünür yere gelsin */
    if(root.classList.contains("kbd")) reveal(e.target); });
  document.addEventListener("focusout", function(){ setTimeout(soon, 120); });
})();

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
    h("a", {href: "#home", className: "app-rail__logo", "aria-label": "Triplanner, ana sayfa"}, h(A.LogoMark, {size: 44})),
    h("span", {className: "app-rail__sep", "aria-hidden": "true"}),
    h("a", {href: "#home", className: "tp-trip__btn app-rail__home" + (S.page === "home" ? " is-active" : ""), "aria-label": "Ana sayfa", title: "Ana sayfa", "aria-current": S.page === "home" ? "page" : undefined}, h(T.Icon, {name: "home", size: 22})),
    S.app.order.map(function(id){
      var t = S.app.trips[id]; if(!t) return null;
      var pg = A.offTrip() ? "tarihler" : S.page;
      return h(T.TripAvatar, {key: id, initials: A.markOf(t), label: t.name, color: COLORS[t.color % 6], active: !A.offTrip() && id === S.cur, href: A.href(pg, "", id)});
    }),
    h("span", {style: {flex: 1}}),
    h(T.IconButton, {icon: "plus", label: "Yeni gezi", variant: "rail", size: "lg", round: true, onClick: function(){ S.dialog = {kind: "trip-new"}; A.render(); }}),
    h(A.AvatarButton, {size: 44}));
}
/* Profil fotoğrafı (Google) ya da baş harfler; dokununca profil */
A.me = function(){
  var B = window.TPB, u = B && B.session ? B.session.user : null, md = u ? (u.user_metadata || {}) : {};
  var name = md.full_name || md.name || (u && u.email ? u.email.split("@")[0] : "");
  var g = md.avatar_url || md.picture || "", pic = u ? (md.tp_avatar || "") : (S.views._avatar || "");
  var avatar = pic && pic !== "photo" && A.AVATARS && A.AVATARS[pic] ? pic : "";
  var photo = pic === "photo" && md.tp_photo ? D.photoUrl(md.tp_photo) : (avatar ? "" : g);
  return {name: name, email: u ? u.email : "", photo: photo, googlePhoto: g, avatar: avatar, pic: pic, initials: name ? D.initials(name) : ""};
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
/* Tekerlek seçici: yukarı aşağı kaydırılır, ortadaki satır seçilidir */
var ROW = 40;
A.Wheel = function(p){
  var opts = p.options, idx = Math.max(0, opts.findIndex(function(o){ return o[0] === p.value; }));
  var ref = React.useRef(null), timer = React.useRef(null), cur = React.useState(idx);
  React.useEffect(function(){ var el = ref.current; if(el) el.scrollTop = idx * ROW; }, []);
  function settle(){
    var el = ref.current; if(!el) return;
    var i = Math.max(0, Math.min(opts.length - 1, Math.round(el.scrollTop / ROW)));
    if(i !== cur[0]) cur[1](i);
    if(opts[i][0] !== p.value) p.onChange(opts[i][0]);
  }
  function onScroll(){
    var el = ref.current; if(el){ var i = Math.max(0, Math.min(opts.length - 1, Math.round(el.scrollTop / ROW))); if(i !== cur[0]) cur[1](i); }
    clearTimeout(timer.current); timer.current = setTimeout(settle, 120);
  }
  function go(i){ var el = ref.current; if(el) el.scrollTo({top: i * ROW, behavior: "smooth"}); }
  function key(e){
    if(e.key === "ArrowDown"){ e.preventDefault(); go(Math.min(opts.length - 1, cur[0] + 1)); }
    else if(e.key === "ArrowUp"){ e.preventDefault(); go(Math.max(0, cur[0] - 1)); }
  }
  var pre = p.id || "wh";
  return h("div", {className: "app-wheel" + (p.compact ? " app-wheel--compact" : "") + (p.className ? " " + p.className : "")},
    h("span", {className: "app-wheel__band", "aria-hidden": "true"}),
    h("div", {ref: ref, className: "app-wheel__list", role: "listbox", tabIndex: 0, "aria-label": p.label, "aria-activedescendant": pre + "-" + cur[0], onScroll: onScroll, onKeyDown: key},
      opts.map(function(o, i){
        var d = Math.abs(i - cur[0]);
        return h("div", {key: o[0], id: pre + "-" + i, role: "option", "aria-selected": i === cur[0] ? "true" : "false", className: "app-wheel__row" + (i === cur[0] ? " is-on" : "") + (d === 1 ? " is-near" : ""),
          onClick: function(){ go(i); }}, o[1], o[2] ? h("small", null, o[2]) : null);
      })));
};

/* Gün seçici: tek kısa tekerlek; en üstte "Yola çıkmadan", sonra gezinin günleri */
var MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
A.DayWheel = function(p){
  var t = p.t;
  var opts = (p.noPre ? [] : [["pre", "Yola çıkmadan", ""]]).concat(t.days.map(function(d){ var dt = D.parseISO(d.date); return [d.id, dt.getUTCDate() + " " + MONTHS[dt.getUTCMonth()], D.WDS[dt.getUTCDay()]]; }));
  return h(A.Wheel, {id: p.id || "dw", compact: true, className: "app-daywheel1", label: p.label || "Hangi gün", options: opts, value: p.value, onChange: p.onChange});
};

/* Saat seçici: saat ve dakika (5'er) tekerlekleri; en üstte "Saatsiz" */
function pad2(n){ return ("0" + n).slice(-2); }
A.TimeWheel = function(p){
  var m = /(\d{1,2})[:.](\d{2})/.exec(p.value || "");
  var hh = m ? pad2(Math.min(23, +m[1])) : "", mm = React.useState(m ? pad2(Math.round(+m[2] / 5) * 5 % 60) : "00");
  var hours = [["", "Saatsiz"]], mins = [], i;
  for(i = 0; i < 24; i++) hours.push([pad2(i), pad2(i)]);
  for(i = 0; i < 60; i += 5) mins.push([pad2(i), pad2(i)]);
  var pre = p.id || "tw";
  return h("div", {className: "app-timewheel" + (hh ? "" : " is-none")},
    h(A.Wheel, {id: pre + "h", compact: true, className: "app-timewheel__h", label: "Saat", options: hours, value: hh, onChange: function(x){ p.onChange(x ? x + ":" + mm[0] : ""); }}),
    h("span", {className: "app-timewheel__sep", "aria-hidden": "true"}, ":"),
    h(A.Wheel, {id: pre + "m", compact: true, className: "app-timewheel__m", label: "Dakika", options: mins, value: mm[0], onChange: function(x){ mm[1](x); if(hh) p.onChange(hh + ":" + x); }}));
};
/* Saat dilimi: yurt dışı gezilerinde "hangi ülkenin saati" yazmak yerine seçilir */
/* bir saat diliminin o tarihteki UTC farkı (dakika) */
var offCache = {};
A.tzOffset = function(tz, iso){
  var k = tz + "|" + (iso || ""); if(k in offCache) return offCache[k];
  var v = null;
  try{
    var d = iso ? new Date(iso + "T12:00:00Z") : new Date();
    var part = new Intl.DateTimeFormat("en-US", {timeZone: tz, timeZoneName: "shortOffset"}).formatToParts(d).filter(function(x){ return x.type === "timeZoneName"; })[0];
    var m = part && /GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?/.exec(part.value);
    if(m) v = m[1] ? (m[1] === "-" ? -1 : 1) * (+m[2] * 60 + (+m[3] || 0)) : 0;
  }catch(e){}
  if(v === null) v = {"Europe/Istanbul": 180, "Asia/Tbilisi": 240}[tz] != null ? {"Europe/Istanbul": 180, "Asia/Tbilisi": 240}[tz] : null;
  offCache[k] = v; return v;
};
/* bir ülke kodunun (TR, GE…) o tarihteki UTC farkı */
A.zoneOffset = function(code, iso){ var c = D.COUNTRY[code]; return c ? A.tzOffset(c[2], iso) : null; };
/* saat seçiminde gösterilecek ülkeler: Türkiye + saati Türkiye'den farklı olan gidilen ülkeler */
A.tripZones = function(t){
  if(!t) return [];
  var ref = A.tzOffset("Europe/Istanbul", t.start);
  var diff = (t.countries || []).filter(function(c){ return c !== "TR" && D.COUNTRY[c] && A.zoneOffset(c, t.start) !== ref; });
  return diff.length ? [["TR", "Türkiye saati"]].concat(diff.map(function(c){ return [c, D.COUNTRY[c][1] + " saati"]; })) : [];
};
/* ülke bayrağı (emoji); bayrağı olmayan kodlarda boş */
A.flag = function(code){ return /^[A-Z]{2}$/.test(code) && code !== "XK" ? String.fromCodePoint(0x1F1E6 + code.charCodeAt(0) - 65, 0x1F1E6 + code.charCodeAt(1) - 65) : ""; };
A.splitTime = function(s){
  var m = /^(~?)\s*(\d{1,2}[:.]\d{2})?\s*(.*)$/.exec(s || "") || [];
  var z = /^[A-Z]{2,4}$/.test(m[3] || "") && D.COUNTRY[m[3]] ? m[3] : "";
  return {pre: m[1] || "", clock: m[2] ? m[2].replace(".", ":") : "", zone: z};
};
/* Saat alanı (telefon): tekerlek + yanında ülke saati seçimi ve isteğe bağlı ek (kesin saat gibi) */
A.ClockField = function(p){
  var sp = A.splitTime(p.value), zones = p.zones || [], shown = sp.zone || (zones.length ? zones[zones.length - 1][0] : "");
  function compose(clock, zone){ return clock ? sp.pre + clock + (zone ? " " + zone : "") : ""; }
  return h("div", {className: "tp-field"},
    h("span", {className: "label tp-field__label"}, p.label, p.optional ? h("span", {className: "tp-muted"}, " · isteğe bağlı") : null),
    h("div", {className: "app-timefield"},
      h(A.TimeWheel, {id: p.id, value: sp.clock, onChange: function(x){ p.onChange(compose(x, sp.zone)); }}),
      h("div", {className: "app-timefield__side"},
        zones.length ? h("div", {className: "app-tzpick" + (sp.clock ? "" : " is-off")},
          h("span", {className: "body-sm app-muted", id: p.id + "-zl"}, "Hangi ülkenin saati?"),
          h("div", {className: "app-curseg", role: "radiogroup", "aria-labelledby": p.id + "-zl"}, zones.map(function(z){
            return h("button", {key: z[0], type: "button", role: "radio", "aria-checked": shown === z[0] ? "true" : "false", "aria-label": z[1], title: z[1], disabled: !sp.clock,
              onClick: function(){ p.onChange(compose(sp.clock, z[0])); }}, z[0]);
          }))) : null,
        p.extra || null)));
};

/* Gün + saat yan yana tekerlekler (telefonda formlarda) */
A.DayTimePick = function(p){
  return h("div", {className: "app-dtpick"},
    h("div", {className: "app-dtpick__col"}, h("span", {className: "label tp-field__label"}, p.dayLabel || "Gün"), h(A.DayWheel, {t: p.t, id: (p.id || "dt") + "d", noPre: p.noPre, value: p.day, onChange: p.onDay, label: p.dayLabel || "Gün"})),
    p.onTime ? h("div", {className: "app-dtpick__col app-dtpick__col--time"}, h("span", {className: "label tp-field__label"}, p.timeLabel || "Saat"), h(A.TimeWheel, {id: (p.id || "dt") + "t", value: p.time, onChange: p.onTime})) : null);
};

/* Seçim kutusu: telefonda liste kutunun altında, pencerenin içinde yumuşakça açılır (ekrandan taşmaz);
   masaüstünde tasarım sistemindeki açılır liste */
var selSeq = 0;
function PhoneSelect(p){
  var open = React.useState(false), ref = React.useRef(null), id = React.useRef("asel" + (++selSeq)).current;
  var opts = (p.options || []).map(function(x){ return typeof x === "string" ? {label: x, value: x} : x; });
  function valOf(x){ return x.value !== undefined ? x.value : x.label; }
  var cur = opts.filter(function(x){ return valOf(x) === p.value; })[0];
  function toggle(){ var o = !open[0]; open[1](o); if(o) setTimeout(function(){ if(ref.current) ref.current.scrollIntoView({block: "nearest", behavior: "smooth"}); }, 260); }
  function pick(x){ if(p.onChange) p.onChange(valOf(x)); open[1](false); }
  return h("div", {className: "tp-field app-select" + (open[0] ? " is-open" : ""), ref: ref},
    p.label ? h("span", {id: id + "-l", className: "label tp-field__label"}, p.label, p.optional ? h("span", {className: "tp-muted"}, " · isteğe bağlı") : null) : null,
    h("button", {type: "button", id: id + "-b", className: "tp-input tp-trigger body", "aria-haspopup": "listbox", "aria-expanded": open[0] ? "true" : "false", "aria-controls": id + "-list",
        "aria-labelledby": (p.label ? id + "-l " : "") + id + "-b", onClick: toggle},
      cur && cur.icon ? h(T.Icon, {name: cur.icon, size: 18}) : null,
      h("span", {className: "tp-trigger__value" + (cur ? "" : " tp-trigger__placeholder")}, cur ? cur.label : (p.placeholder || "Seç")),
      h(T.Icon, {name: "chevron-down", size: 18, className: "tp-muted app-select__chev"})),
    h(A.Expand, {open: open[0]},
      h("ul", {id: id + "-list", role: "listbox", "aria-labelledby": p.label ? id + "-l" : undefined, className: "app-select__list"},
        opts.map(function(x, i){
          var sel = valOf(x) === p.value;
          return h("li", {key: i, role: "option", tabIndex: 0, "aria-selected": sel ? "true" : "false", className: "tp-option",
              onClick: function(){ pick(x); }, onKeyDown: function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); pick(x); } }},
            x.icon ? h(T.Icon, {name: x.icon, size: 18}) : null,
            h("span", {className: "tp-option__text"}, h("span", {className: "body"}, x.label), x.description ? h("span", {className: "body-sm tp-muted"}, x.description) : null),
            sel ? h(T.Icon, {name: "check", size: 18, className: "tp-option__check"}) : null);
        }))),
    p.error || p.hint ? h("p", {className: "body-sm " + (p.error ? "tp-field__error" : "tp-muted")}, p.error || p.hint) : null);
}
A.Select = function(p){ return A.isPhone ? h(PhoneSelect, p) : h(T.Select, p); };

/* Ülke seçici: seçilenler bayraklı etiket; "Ülke ekle" ile aranabilir liste pencerenin içinde açılır */
var trColl = typeof Intl !== "undefined" && Intl.Collator ? new Intl.Collator("tr") : null;
function low(x){ return String(x || "").toLocaleLowerCase("tr"); }
A.CountryPicker = function(p){
  var open = React.useState(false), q = React.useState(""), sel = p.value || [];
  var all = React.useMemo(function(){ return D.COUNTRIES.slice().sort(function(a, b){ return a[0] === "TR" ? -1 : b[0] === "TR" ? 1 : (trColl ? trColl.compare(a[1], b[1]) : (a[1] < b[1] ? -1 : 1)); }); }, []);
  var qq = low(q[0]).trim(), list = qq ? all.filter(function(c){ return low(c[1]).indexOf(qq) > -1 || low(c[0]) === qq; }) : all;
  function toggle(code){ p.onChange(sel.indexOf(code) > -1 ? sel.filter(function(x){ return x !== code; }) : sel.concat([code])); }
  return h("div", {className: "tp-field app-cpick"},
    h("span", {className: "label tp-field__label", id: "cp-l"}, p.label || "Nereye?"),
    h("div", {className: "app-cpick__chips"},
      sel.map(function(code){
        var c = D.COUNTRY[code]; if(!c) return null;
        return h("span", {key: code, className: "app-cchip"}, A.flag(code) ? h("span", {className: "app-cchip__flag", "aria-hidden": "true"}, A.flag(code)) : null, h("span", null, c[1]),
          h("button", {type: "button", className: "app-cchip__x", "aria-label": c[1] + " çıkarılsın", onClick: function(){ toggle(code); }}, h(T.Icon, {name: "close", size: 14})));
      }),
      h("button", {type: "button", className: "app-cchip app-cchip--add", "aria-expanded": open[0] ? "true" : "false", "aria-controls": "cp-panel", onClick: function(){ open[1](!open[0]); if(open[0]) q[1](""); }},
        h(T.Icon, {name: open[0] ? "check" : "plus", size: 14}), h("span", null, open[0] ? "Bitti" : (sel.length ? "Ülke ekle" : "Ülke seç")))),
    h(A.Expand, {open: open[0]},
      h("div", {id: "cp-panel", className: "app-cpick__panel"},
        h("input", {type: "search", className: "tp-input body", placeholder: "Ülke ara", value: q[0], "aria-label": "Ülke ara", onChange: function(e){ q[1](e.target.value); }, onFocus: toTop}),
        h("ul", {className: "app-select__list", role: "listbox", "aria-multiselectable": "true", "aria-labelledby": "cp-l"},
          list.length ? list.map(function(c){
            var on = sel.indexOf(c[0]) > -1;
            return h("li", {key: c[0], role: "option", tabIndex: 0, "aria-selected": on ? "true" : "false", className: "tp-option", onClick: function(){ toggle(c[0]); },
                onKeyDown: function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); toggle(c[0]); } }},
              h("span", {className: "app-cchip__flag", "aria-hidden": "true"}, A.flag(c[0]) || ""),
              h("span", {className: "tp-option__text"}, h("span", {className: "body"}, c[1])),
              on ? h(T.Icon, {name: "check", size: 18, className: "tp-option__check"}) : null);
          }) : h("li", {className: "body-sm app-muted", style: {padding: "var(--space-2) var(--space-3)"}}, "Bulunamadı")))),
    h("p", {className: "body-sm tp-muted", style: {margin: 0}}, "Saat seçiminde ülke saati ve yerel para buna göre gelir."));
};

/* Yer seçici: tek kutuda şehir ya da ülke aranır; şehir seçilince ülkesi de bilinir (saat ve para için) */
function fold(x){ return low(x).replace(/ş/g, "s").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/â/g, "a"); }
var POPULAR = ["Roma", "Paris", "Barselona", "Amsterdam", "Prag", "Viyana", "Tiflis", "Saraybosna", "Londra", "Tokyo", "Marakeş", "Dubai"];
/* arama kutusu seçilince pencerede üste kaysın: klavye açıkken sonuçlar görünsün */
/* Nereye? seçici: seçilenler bayraklı etiket. Telefonda kendi alt penceresinde açılır (arama üstte, liste pencerenin tamamında,
   altta Tamam); masaüstünde formun içinde. Satıra dokunmak seçer, tekrar dokunmak çıkarır; seçili satırın sağında dolu onay işareti var. */
A.PlacePicker = function(p){
  var open = React.useState(false), q = React.useState(""), sel = p.value || [];
  var qq = fold(q[0]).trim();
  function has(c, n){ return sel.some(function(x){ return x.c === c && (x.n || "") === (n || ""); }); }
  function toggle(c, n){
    if(A.haptic) A.haptic();
    if(has(c, n)){ p.onChange(sel.filter(function(x){ return !(x.c === c && (x.n || "") === (n || "")); })); return; }
    /* seçilen ne ise öyle kalır: ülkeyi seçip sonra şehrini eklemek ülkeyi kaldırmaz */
    p.onChange(sel.concat([n ? {c: c, n: n} : {c: c}]));
  }
  function remove(i){ p.onChange(sel.filter(function(_, j){ return j !== i; })); }
  function close(){ open[1](false); q[1](""); }
  /* ülke adı yazılınca önce ülke gelir, sonra şehirleri */
  var countries = qq ? D.COUNTRIES.filter(function(c){ return fold(c[1]).indexOf(qq) === 0 || fold(c[0]) === qq; })
      .concat(D.COUNTRIES.filter(function(c){ return fold(c[1]).indexOf(qq) > 0; })).slice(0, 6) : [];
  var cities = qq ? D.CITIES.filter(function(x){ return fold(x[0]).indexOf(qq) > -1 || (x[2] && fold(x[2]).indexOf(qq) > -1) || (D.COUNTRY[x[1]] && fold(D.COUNTRY[x[1]][1]).indexOf(qq) === 0); }).slice(0, 30)
    : POPULAR.map(function(n){ return D.CITIES.filter(function(x){ return x[0] === n; })[0]; }).filter(Boolean);
  function row(key, code, title, sub, on, onPick){
    return h("li", {key: key, role: "option", tabIndex: 0, "aria-selected": on ? "true" : "false", className: "tp-option app-pp__opt" + (on ? " is-on" : ""), onClick: onPick,
        onKeyDown: function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); onPick(); } }},
      h("span", {className: "app-cchip__flag app-pp__flag", "aria-hidden": "true"}, A.flag(code) || ""),
      h("span", {className: "tp-option__text"}, h("span", {className: "body"}, title), sub ? h("span", {className: "body-sm tp-muted"}, sub) : null),
      h("span", {className: "app-pp__mark", "aria-hidden": "true"}, h(T.Icon, {name: "check", size: 14, strokeWidth: 3})));
  }
  var chips = sel.map(function(x, i){
    var c = D.COUNTRY[x.c]; if(!c) return null;
    return h("span", {key: x.c + (x.n || ""), className: "app-cchip"}, A.flag(x.c) ? h("span", {className: "app-cchip__flag", "aria-hidden": "true"}, A.flag(x.c)) : null, h("span", null, x.n || c[1]),
      h("button", {type: "button", className: "app-cchip__x", "aria-label": (x.n || c[1]) + " çıkarılsın", onClick: function(){ remove(i); }}, h(T.Icon, {name: "close", size: 14})));
  });
  var search = h("input", {type: "search", className: "tp-input body", placeholder: "Şehir ya da ülke ara", value: q[0], "aria-label": "Şehir ya da ülke ara", enterKeyHint: "search", autoComplete: "off",
    onChange: function(e){ q[1](e.target.value); }});
  var list = h(F, null,
    !qq ? h("span", {className: "label app-muted"}, "Sık gidilenler") : null,
    h("ul", {className: "app-pp__list", role: "listbox", "aria-multiselectable": "true", "aria-label": "Şehirler ve ülkeler"},
      countries.map(function(c){ return row("k" + c[0], c[0], c[1], "Ülke", has(c[0], ""), function(){ toggle(c[0], ""); }); }),
      cities.map(function(x){ return row("c" + x[0], x[1], x[0], D.COUNTRY[x[1]] ? D.COUNTRY[x[1]][1] : "", has(x[1], x[0]), function(){ toggle(x[1], x[0]); }); }),
      qq && !cities.length && !countries.length ? h("li", {className: "body-sm app-muted app-pp__none"}, "Bulunamadı. Ülkesini yazıp seçebilirsin.") : null));
  var hint = h("p", {className: "body-sm tp-muted", style: {margin: 0}}, "Saat seçiminde ülke saati ve yerel para buna göre gelir.");
  var label = h("span", {className: "label tp-field__label", id: "pp-l"}, p.label || "Nereye?");
  if(A.isPhone){
    var sheet = open[0] && window.ReactDOM ? ReactDOM.createPortal(
      h(T.Sheet, {placement: "bottom", direction: "none", title: "Nereye gidiyorsun?", onClose: close, primaryLabel: sel.length ? "Tamam (" + sel.length + ")" : "Tamam", onPrimary: close},
        /* Escape yalnız bu pencereyi kapatır, altındaki gezi penceresini değil */
        h("div", {className: "app-pp", onKeyDown: function(e){ if(e.key === "Escape"){ e.stopPropagation(); close(); } }},
          h("div", {className: "app-pp__top"}, search, sel.length ? h("div", {className: "app-cpick__chips"}, chips) : null),
          list)),
      document.querySelector(".app-root") || document.body) : null;
    return h("div", {className: "tp-field app-cpick"}, label,
      sel.length ? h("div", {className: "app-cpick__chips"}, chips) : null,
      h("button", {type: "button", className: "tp-input tp-trigger body app-pp__trigger", "aria-haspopup": "dialog", "aria-labelledby": "pp-l", onClick: function(){ open[1](true); }},
        h(T.Icon, {name: "search", size: 18, className: "tp-muted"}),
        h("span", {className: "tp-trigger__value tp-trigger__placeholder"}, sel.length ? "Başka yer ekle" : "Şehir ya da ülke seç")),
      hint, sheet);
  }
  return h("div", {className: "tp-field app-cpick"}, label,
    h("div", {className: "app-cpick__chips"}, chips,
      h("button", {type: "button", className: "app-cchip app-cchip--add", "aria-expanded": open[0] ? "true" : "false", "aria-controls": "pp-panel", onClick: function(){ if(open[0]) close(); else open[1](true); }},
        h(T.Icon, {name: open[0] ? "check" : "plus", size: 14}), h("span", null, open[0] ? "Bitti" : (sel.length ? "Yer ekle" : "Şehir ya da ülke seç")))),
    h(A.Expand, {open: open[0]}, h("div", {id: "pp-panel", className: "app-cpick__panel"}, search, list)),
    hint);
};

/* Zorunlu alan etiketi: yıldız; isteğe bağlı olanlara ayrıca yazı eklenmez */
A.req = function(label){ return h(F, null, label, h("span", {className: "app-req", "aria-hidden": "true"}, " *"), h("span", {className: "tp-sr"}, " (zorunlu)")); };
/* Fotoğraf görüntüleyici: tam ekran, açık pencerenin üstünde (formu kapatmaz); kaydırarak ya da oklarla gezilir */
A.openViewer = function(srcs, i){ if(!srcs || !srcs.length) return; S.viewer = {srcs: srcs, i: Math.max(0, Math.min(srcs.length - 1, i || 0))}; A.render(); };
function Viewer(){
  var v = S.viewer, ref = React.useRef(null), sw = React.useRef(null), leaving = React.useState(false);
  React.useEffect(function(){ if(ref.current) ref.current.focus(); }, []);
  if(!v) return null;
  var n = v.srcs.length;
  function close(){ leaving[1](true); setTimeout(function(){ S.viewer = null; A.render(); }, 180); }
  function go(d){ var j = v.i + d; if(j < 0 || j >= n) return; S.viewer = {srcs: v.srcs, i: j}; A.render(); }
  function key(e){ if(e.key === "Escape"){ e.stopPropagation(); close(); } else if(e.key === "ArrowRight") go(1); else if(e.key === "ArrowLeft") go(-1); }
  return h("div", {ref: ref, className: "app-viewer" + (leaving[0] ? " is-leaving" : ""), role: "dialog", "aria-modal": "true", "aria-label": "Fotoğraf " + (v.i + 1) + " / " + n, tabIndex: -1, onKeyDown: key,
      onClick: function(e){ if(e.target === e.currentTarget || e.target.classList.contains("app-viewer__stage")) close(); },
      onPointerDown: function(e){ sw.current = {x: e.clientX, y: e.clientY}; },
      onPointerUp: function(e){ var s = sw.current; sw.current = null; if(!s) return; var dx = e.clientX - s.x, dy = e.clientY - s.y;
        if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1); else if(dy > 90 && Math.abs(dy) > Math.abs(dx)) close(); }},
    h("div", {className: "app-viewer__bar"},
      n > 1 ? h("span", {className: "app-viewer__count"}, (v.i + 1) + " / " + n) : h("span"),
      h("button", {type: "button", className: "app-viewer__btn", "aria-label": "Kapat", onClick: close}, h(T.Icon, {name: "close", size: 22}))),
    h("div", {className: "app-viewer__stage"}, h("img", {key: v.srcs[v.i], className: "app-viewer__img", src: v.srcs[v.i], alt: "", draggable: false})),
    n > 1 && v.i > 0 ? h("button", {type: "button", className: "app-viewer__btn app-viewer__nav is-prev", "aria-label": "Önceki", onClick: function(){ go(-1); }}, h(T.Icon, {name: "chevron-left", size: 24})) : null,
    n > 1 && v.i < n - 1 ? h("button", {type: "button", className: "app-viewer__btn app-viewer__nav is-next", "aria-label": "Sonraki", onClick: function(){ go(1); }}, h(T.Icon, {name: "chevron-right", size: 24})) : null);
}
A.Viewer = Viewer;
/* fotoğraf alanı: küçük resme dokununca büyük açılır */
A.PhotoField = function(p){
  return h("div", {className: "app-photofield", onClick: function(e){
      var it = e.target.closest && e.target.closest(".tp-photoin__item"); if(!it || e.target.closest(".tp-photoin__remove")) return;
      var list = Array.prototype.slice.call(it.parentNode.querySelectorAll(".tp-photoin__item"));
      A.openViewer((p.photos || []).map(function(x){ return x.src; }).filter(Boolean), list.indexOf(it));
    }}, h(T.PhotoInput, p));
};

/* Otomatik kur: günde en fazla iki kez, TL karşılıkları; başarısız olursa sessizce elle girilen kurla devam */
var fxBusy = false;
A.ensureFx = function(force){
  var fx = D.fx(); if(fxBusy || (!force && fx.fetched && Date.now() - fx.fetched < 12 * 3600e3)) return;
  if(!window.fetch) return; fxBusy = true;
  fetch("https://open.er-api.com/v6/latest/TRY").then(function(r){ return r.json(); }).then(function(j){
    fxBusy = false;
    if(!j || j.result !== "success" || !j.rates) return;
    var rates = {};
    D.ALLCUR.forEach(function(c){ var code = c === "TL" ? "TRY" : c, v = j.rates[code]; if(c !== "TL" && v > 0) rates[c] = Math.round(1 / v * 10000) / 10000; });
    D.setFx({rates: rates, at: j.time_last_update_unix ? new Date(j.time_last_update_unix * 1000).toISOString() : new Date().toISOString(), fetched: Date.now()});
    A.render();
  }, function(){ fxBusy = false; });
};
document.addEventListener("visibilitychange", function(){ if(document.visibilityState === "visible") A.ensureFx(); });

/* Kaydırarak silme (Apple tarzı): sola kaydırınca kırmızı alan ve simge çıkar; dokununca ya da
   kaydırmaya devam edince işlem yapılır. Yalnızca dokunmatikte; dikey kaydırmayı engellemez. */
var SW_ACT = 84, swOpen = null;
/* Dokunsal geri bildirim: Android'de titreşim; iPhone'da (iOS 18+) gizli bir açma/kapama düğmesine dokunma, sistemin kendi hafif titreşimini verir */
var hapEl = null;
A.haptic = function(){
  try{
    if(navigator.vibrate){ navigator.vibrate(12); return; }
    if(!/iP(hone|ad|od)/.test(navigator.userAgent)) return;
    if(!hapEl){
      hapEl = document.createElement("label"); hapEl.setAttribute("aria-hidden", "true");
      hapEl.style.cssText = "position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
      var inp = document.createElement("input"); inp.type = "checkbox"; inp.setAttribute("switch", ""); inp.tabIndex = -1;
      hapEl.appendChild(inp); document.body.appendChild(hapEl);
    }
    hapEl.click();
  }catch(e){}
};
/* Kaydırarak silme (Apple tarzı ama daha zor): sola kaydırınca kırmızı alan açılır; dokununca silinir.
   Tam kaydırmada kart parmağı daha yavaş izler, eşik geçilince alan büyür ve titreşir;
   silinmesi için eşikte kısa bir an durmak gerekir (hızlı fiske silmez). */
A.Swipe = function(p){
  var wrap = React.useRef(null), body = React.useRef(null), st = React.useRef(null), x = React.useRef(0), pr = React.useRef(p);
  pr.current = p;
  function set(nx, anim, full){
    x.current = nx; var bd = body.current, w = wrap.current; if(!bd || !w) return;
    bd.style.transition = anim ? "transform var(--duration-base) var(--ease-standard)" : "none";
    bd.style.transform = nx ? "translate3d(" + nx + "px,0,0)" : "";
    w.classList.toggle("is-active", nx < 0);
    w.classList.toggle("is-full", !!full);
    w.style.setProperty("--sw", Math.max(SW_ACT, -nx) + "px");
  }
  function close(){ set(0, true, false); if(swOpen === close) swOpen = null; }
  function run(){
    var w = wrap.current; if(!w || w._gone) return; w._gone = true;
    set(-w.offsetWidth, true, true);
    w.style.height = w.offsetHeight + "px";
    requestAnimationFrame(function(){ w.classList.add("is-leaving"); w.style.height = "0px"; });
    setTimeout(function(){ if(swOpen === close) swOpen = null; pr.current.onAction(); }, 260);
  }
  /* dokunma olayları: yatay hareket kesinleşince sayfa kaymasını durdurur (iPhone hareketi sayfaya vermesin) */
  React.useEffect(function(){
    var w = wrap.current; if(!w) return;
    function start(e){
      if(e.touches.length !== 1 || w._gone) { st.current = null; return; }
      if(e.target.closest && e.target.closest(".tp-card__handle,input,textarea,select,.app-swipe__act")) { st.current = null; return; }
      if(swOpen && swOpen !== close) swOpen();
      var t = e.touches[0]; st.current = {x0: t.clientX, y0: t.clientY, base: x.current, dir: null, armed: false, armedAt: 0};
    }
    function move(e){
      var s = st.current; if(!s) return;
      var t = e.touches[0], dx = t.clientX - s.x0, dy = t.clientY - s.y0;
      if(!s.dir){ if(Math.abs(dx) < 6 && Math.abs(dy) < 6) return; s.dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v"; }
      if(s.dir !== "h") return;
      if(e.cancelable) e.preventDefault();
      var ww = w.offsetWidth, pull = Math.max(0, -(s.base + dx));
      var shown = pull <= SW_ACT ? pull : SW_ACT + (pull - SW_ACT) * .75, armed = shown > ww * .6;
      if(armed !== s.armed){ s.armed = armed; s.armedAt = Date.now(); if(navigator.vibrate) navigator.vibrate(10); }
      set(-Math.min(shown, ww), false, armed);
    }
    function end(){
      var s = st.current; st.current = null; if(!s || s.dir !== "h") return;
      w._swiped = Date.now();
      var shown = -x.current;
      if(s.armed && Date.now() - s.armedAt > 140){ A.haptic(); run(); }
      else if(shown > SW_ACT * .5){ A.haptic(); set(-SW_ACT, true, false); swOpen = close; }
      else close();
    }
    function cancel(){ var s = st.current; st.current = null; if(s && s.dir === "h") close(); }
    w.addEventListener("touchstart", start, {passive: true});
    w.addEventListener("touchmove", move, {passive: false});
    w.addEventListener("touchend", end); w.addEventListener("touchcancel", cancel);
    return function(){ w.removeEventListener("touchstart", start); w.removeEventListener("touchmove", move); w.removeEventListener("touchend", end); w.removeEventListener("touchcancel", cancel); if(swOpen === close) swOpen = null; };
  }, [A.isPhone && !p.disabled]);
  function clickCap(e){
    var w = wrap.current;
    if(e.target.closest && e.target.closest(".app-swipe__act")) return;
    if(w && w._swiped && Date.now() - w._swiped < 400){ e.stopPropagation(); e.preventDefault(); return; }
    if(x.current < 0){ e.stopPropagation(); e.preventDefault(); close(); }
  }
  if(!A.isPhone || p.disabled) return p.children;
  return h("div", {ref: wrap, className: "app-swipe" + (p.className ? " " + p.className : ""), style: p.radius ? {"--sw-radius": p.radius} : null, onClickCapture: clickCap},
    h("button", {type: "button", className: "app-swipe__act", tabIndex: -1, "aria-hidden": "true", onClick: function(e){ e.stopPropagation(); A.haptic(); run(); }},
      h("span", {className: "app-swipe__lbl"}, h("span", {className: "app-swipe__ic"}, h(T.Icon, {name: p.icon || "trash", size: 20})), h("span", {className: "tp-sr"}, p.label || "Sil"))),
    h("div", {ref: body, className: "app-swipe__body"}, p.children));
};

/* Tarih seçici: tasarım sisteminin takvim görünümüyle, pencerenin içinde açılır.
   range: başlangıç–bitiş aralığı (ilk dokunuş başlangıç, ikincisi bitiş); değilse tek gün. */
var CAL_WD = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
function isoOf(y, m, d){ return y + "-" + ("0" + (m + 1)).slice(-2) + "-" + ("0" + d).slice(-2); }
function niceDate(iso, yr){ var d = D.parseISO(iso); return d ? d.getUTCDate() + " " + MONTHS[d.getUTCMonth()].slice(0, 3) + (yr ? " " + d.getUTCFullYear() : "") : ""; }
var calSeq = 0;
A.DateField = function(p){
  var range = !!p.range, a = p.start || p.value || "", b = range ? (p.end || "") : "";
  var open = React.useState(false), id = React.useRef("cal" + (++calSeq)).current;
  var base = D.parseISO(a || p.month || A.todayISO()) || new Date();
  var mo = React.useState({y: base.getUTCFullYear(), m: base.getUTCMonth()});
  var pend = React.useState(null); /* aralıkta ilk dokunuş: bitiş bekleniyor */
  var s = pend[0] || a, e = pend[0] ? "" : b;
  function shift(k){ var m = mo[0].m + k, y = mo[0].y + Math.floor(m / 12); mo[1]({y: y, m: ((m % 12) + 12) % 12}); }
  function pick(iso){
    if(p.max && iso > p.max) return;
    if(!range){ p.onChange(iso); open[1](false); return; }
    if(!pend[0] || iso < pend[0]){ pend[1](iso); return; }
    pend[1](null); p.onChange(pend[0], iso);
  }
  var today = A.todayISO();
  function month(y, m){
    var first = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7, days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    var cells = CAL_WD.map(function(w){ return h("span", {key: "w" + w, className: "tp-cal__wd label", "aria-hidden": "true"}, w); });
    for(var i = 0; i < first; i++) cells.push(h("span", {key: "b" + i}));
    for(var d = 1; d <= days; d++){
      (function(d){
        var iso = isoOf(y, m, d), st = iso === s, en = e && iso === e, inr = s && e && iso > s && iso < e, off = p.max && iso > p.max;
        cells.push(h("button", {key: d, type: "button", disabled: off || undefined,
          className: "tp-cal__day body" + (st ? " is-start" : "") + (en ? " is-end" : "") + (st && (!e || en) ? " is-single" : "") + (inr ? " in-range" : "") + (iso === today ? " is-today" : ""),
          "aria-label": d + " " + MONTHS[m] + " " + y + (st ? (range ? ", başlangıç" : ", seçili") : "") + (en ? ", bitiş" : ""), "aria-pressed": st || en ? "true" : "false",
          onClick: function(){ pick(iso); }}, d));
      })(d);
    }
    return h("div", {key: y + "-" + m, className: "tp-cal__month"}, h("div", {className: "tp-cal__title body-strong"}, MONTHS[m] + " " + y), h("div", {className: "tp-cal__grid"}, cells));
  }
  /* aralıkta iki ay: telefonda alt alta, geniş ekranda yan yana */
  var months = [month(mo[0].y, mo[0].m)];
  if(range){ var nm = mo[0].m + 1; months.push(month(mo[0].y + (nm > 11 ? 1 : 0), nm % 12)); }
  var nDays = a && b ? Math.round((D.parseISO(b) - D.parseISO(a)) / 864e5) + 1 : 0;
  var shown = range ? (a && b ? niceDate(a, D.parseISO(a).getUTCFullYear() !== D.parseISO(b).getUTCFullYear()) + " – " + niceDate(b, true) + ", " + nDays + " gün" : "")
    : (a ? niceDate(a, true) : "");
  var status = range ? (pend[0] ? "Bitiş gününü seç" : (nDays ? nDays + " gün, " + (nDays - 1) + " gece" : "Başlangıç gününü seç")) : "";
  function done(){ pend[1](null); open[1](false); }
  function clear(){ pend[1](null); if(range) p.onChange("", ""); else { p.onChange(""); open[1](false); } }
  var calId = id, calLabel = (p.label ? (typeof p.label === "string" ? p.label : "Tarih") : "Tarih") + " seç";
  function cal(withFoot){
    return h("div", {id: calId, className: "tp-cal app-cal", role: "group", "aria-label": calLabel},
      h("div", {className: "tp-cal__nav"},
        h(T.IconButton, {icon: "chevron-left", label: "Önceki ay", size: "sm", onClick: function(){ shift(-1); }}),
        h(T.IconButton, {icon: "chevron-right", label: "Sonraki ay", size: "sm", onClick: function(){ shift(1); }})),
      h("div", {className: "tp-cal__months app-cal__months", "aria-live": "polite"}, months),
      withFoot ? h("div", {className: "tp-cal__foot"},
        h("span", {className: "body-sm tp-muted", style: {marginRight: "auto"}}, status),
        a ? h(T.Button, {variant: "ghost", size: "sm", onClick: clear}, "Temizle") : null,
        h(T.Button, {variant: "primary", size: "sm", onClick: done}, "Tamam")) : null);
  }
  var trigger = h("button", {type: "button", className: "tp-input tp-trigger body", "aria-expanded": open[0] ? "true" : "false", "aria-controls": id, "aria-haspopup": A.isPhone ? "dialog" : undefined, "aria-labelledby": (p.label ? id + "-l " : "") + id + "-v",
      onClick: function(){ if(open[0]) pend[1](null); open[1](!open[0]); }},
    h(T.Icon, {name: "calendar", size: 18}),
    h("span", {id: id + "-v", className: "tp-trigger__value" + (shown ? "" : " tp-trigger__placeholder")}, shown || p.placeholder || (range ? "Tarihleri seç" : "Tarih seç")),
    h(T.Icon, {name: A.isPhone ? "chevron-right" : "chevron-down", size: 18, className: "tp-muted app-select__chev"}));
  var foot = p.error || p.hint ? h("p", {className: "body-sm " + (p.error ? "tp-field__error" : "tp-muted")}, p.error || p.hint) : null;
  var lab = p.label ? h("span", {id: id + "-l", className: "label tp-field__label"}, p.label) : null;
  /* telefonda takvim kendi alt penceresinde açılır; formun içinde yer kaplamaz */
  if(A.isPhone){
    var title = p.sheetTitle || (typeof p.label === "string" ? p.label : (range ? "Tarihler" : "Tarih seç"));
    var sheet = open[0] && window.ReactDOM ? ReactDOM.createPortal(
      h(T.Sheet, {placement: "bottom", direction: "none", title: title, description: range ? status : null, onClose: done,
          primaryLabel: range ? "Tamam" : null, onPrimary: done, secondaryLabel: a ? "Temizle" : null, onSecondary: clear},
        /* Escape yalnız bu pencereyi kapatır */
        h("div", {className: "app-datesheet", onKeyDown: function(ev){ if(ev.key === "Escape"){ ev.stopPropagation(); done(); } }}, cal(false))),
      document.querySelector(".app-root") || document.body) : null;
    return h("div", {className: "tp-field app-date"}, lab, trigger, foot, sheet);
  }
  return h("div", {className: "tp-field app-date" + (open[0] ? " is-open" : "")}, lab, trigger,
    h(A.Expand, {open: open[0]}, cal(true)), foot);
};

/* Basılı tutunca açılan menü (iPhone'daki gibi): öğenin altında ya da üstünde, ekranın üstünde açılır */
A.longPress = function(fn){
  var tm = null, start = null;
  function cancel(){ clearTimeout(tm); tm = null; }
  return {
    onPointerDown: function(e){ if(e.button > 0) return; var el = e.currentTarget; start = {x: e.clientX, y: e.clientY}; cancel();
      tm = setTimeout(function(){ tm = null; A.haptic(); el._lp = Date.now(); fn(el.getBoundingClientRect()); }, 450); },
    onPointerMove: function(e){ if(tm && start && (Math.abs(e.clientX - start.x) > 8 || Math.abs(e.clientY - start.y) > 8)) cancel(); },
    onPointerUp: cancel, onPointerCancel: cancel, onPointerLeave: cancel,
    onContextMenu: function(e){ e.preventDefault(); cancel(); var el = e.currentTarget; el._lp = Date.now(); fn(el.getBoundingClientRect()); },
    onClickCapture: function(e){ var el = e.currentTarget; if(el._lp && Date.now() - el._lp < 600){ e.stopPropagation(); e.preventDefault(); } }
  };
};
A.ContextMenu = function(p){
  var ref = React.useRef(null);
  React.useLayoutEffect(function(){
    var el = ref.current, r = p.rect; if(!el || !r) return;
    var vv = window.visualViewport, vh = vv ? vv.height + vv.offsetTop : window.innerHeight, vw = window.innerWidth, w = el.offsetWidth, ph = el.offsetHeight;
    var left = p.align === "right" ? r.right - w : r.left; left = Math.max(8, Math.min(left, vw - w - 8));
    var up = r.bottom + 6 + ph > vh - 8;
    el.style.left = left + "px"; el.style.top = (up ? Math.max(8, r.top - 6 - ph) : r.bottom + 6) + "px";
    var first = el.querySelector("[role=menuitem]"); if(first) first.focus({preventScroll: true});
    function away(e){ if(!el.contains(e.target)) p.onClose(); }
    function key(e){ if(e.key === "Escape") p.onClose(); }
    setTimeout(function(){ document.addEventListener("pointerdown", away, true); }, 0);
    document.addEventListener("keydown", key); window.addEventListener("scroll", p.onClose, true);
    return function(){ document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", key); window.removeEventListener("scroll", p.onClose, true); };
  }, [p.rect]);
  var root = document.querySelector(".app-root") || document.body;
  return ReactDOM.createPortal(h("div", {ref: ref, role: "menu", className: "tp-pop__panel app-menu app-ctxmenu", onClick: function(e){ e.stopPropagation(); }},
    p.items.filter(Boolean).map(function(it, i){
      return h("button", {key: i, type: "button", role: "menuitem", className: "tp-option" + (it.danger ? " tp-option--danger" : ""), onClick: function(){ p.onClose(); it.onClick(); }},
        it.icon ? h(T.Icon, {name: it.icon, size: 18}) : null, h("span", {className: "tp-option__text"}, h("span", {className: "body"}, it.label)));
    })), root);
};

/* Uygulama logosu (vektör): koyu karo, maviden mora kenar; T, uçak izi, uçak, konum */
var LOGO_SVG = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1024 1024\" aria-hidden=\"true\" focusable=\"false\"> <defs> <linearGradient id=\"tlg-rim\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#3f7bff\"/><stop offset=\".55\" stop-color=\"#4c48f0\"/><stop offset=\"1\" stop-color=\"#9b4dff\"/></linearGradient> <radialGradient id=\"tlg-core\" cx=\".5\" cy=\".55\" r=\".62\"><stop offset=\"0\" stop-color=\"#070a2c\"/><stop offset=\".62\" stop-color=\"#0b1152\" stop-opacity=\".96\"/><stop offset=\"1\" stop-color=\"#0b1152\" stop-opacity=\"0\"/></radialGradient> <linearGradient id=\"tlg-edge\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#8fb4ff\"/><stop offset=\"1\" stop-color=\"#c79bff\"/></linearGradient> <linearGradient id=\"tlg-bar\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\".25\"><stop offset=\"0\" stop-color=\"#7fe7ff\"/><stop offset=\".45\" stop-color=\"#2f7dff\"/><stop offset=\"1\" stop-color=\"#3b3df5\"/></linearGradient> <linearGradient id=\"tlg-fold\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#6f9dff\"/><stop offset=\"1\" stop-color=\"#a68bff\"/></linearGradient> <linearGradient id=\"tlg-stem\" x1=\"0\" y1=\"0\" x2=\".3\" y2=\"1\"><stop offset=\"0\" stop-color=\"#2a4dff\"/><stop offset=\".6\" stop-color=\"#5a3df5\"/><stop offset=\"1\" stop-color=\"#a874ff\"/></linearGradient> <linearGradient id=\"tlg-trail\" x1=\"1\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\".96\"/><stop offset=\".5\" stop-color=\"#d9d5ff\" stop-opacity=\".94\"/><stop offset=\"1\" stop-color=\"#b9b3ff\" stop-opacity=\".9\"/></linearGradient> <radialGradient id=\"tlg-pglow\"><stop offset=\"0\" stop-color=\"#ffffff\" stop-opacity=\".42\"/><stop offset=\".45\" stop-color=\"#cfd8ff\" stop-opacity=\".16\"/><stop offset=\"1\" stop-color=\"#cfd8ff\" stop-opacity=\"0\"/></radialGradient> </defs> <rect width=\"1024\" height=\"1024\" rx=\"232\" fill=\"url(#tlg-rim)\"/> <rect width=\"1024\" height=\"1024\" rx=\"232\" fill=\"url(#tlg-core)\"/> <rect x=\"5\" y=\"5\" width=\"1014\" height=\"1014\" rx=\"227\" fill=\"none\" stroke=\"url(#tlg-edge)\" stroke-width=\"8\" opacity=\".55\"/> <g transform=\"translate(512 512) scale(1.0) translate(-512 -512)\"> <path class=\"tl-bar\" d=\"M155 423 L134 396 Q126 386 132 374 L197 252 Q204 240 218 240 L690 240 Q728 242 727 278 Q722 320 690 342 Q640 372 583 380 Z\" fill=\"url(#tlg-bar)\"/> <path class=\"tl-bar\" d=\"M470 240 L690 240 Q728 242 727 278 Q722 320 690 342 Q640 372 583 380 C562 330 540 252 470 240 Z\" fill=\"url(#tlg-fold)\" opacity=\".9\"/> <path class=\"tl-stem\" d=\"M381 401 L572 384 L570 806 Q569 836 543 828 L362 724 Q331 706 334 678 Z\" fill=\"url(#tlg-stem)\"/> <path class=\"tl-trail\" d=\"M806 316 C720 395 580 452 480 492 C395 527 345 585 348 645 C351 705 405 745 470 780 L548 826 L560 800 L495 760 C440 728 395 695 393 645 C391 595 425 560 495 532 C600 490 735 425 810 322 Z\" fill=\"url(#tlg-trail)\"/> <path class=\"tl-pin\" fill-rule=\"evenodd\" fill=\"#ffffff\" d=\"M486 718 C474 702 440 664 440 640 A46 46 0 1 1 532 640 C532 664 498 702 486 718 Z M486 622 A18 18 0 1 0 486.01 622 Z\"/> <g class=\"tl-plane\" transform=\"translate(808 319) rotate(-50)\"><circle cx=\"92\" r=\"130\" fill=\"url(#tlg-pglow)\"/><path transform=\"scale(1.3)\" fill=\"#ffffff\" d=\"M138 0 C138 -6 132 -8 126 -8 L84 -8 L50 -55 L35 -55 L55 -8 L22 -8 L9 -28 L-1 -28 L7 -5 L7 5 L-1 28 L9 28 L22 8 L55 8 L35 55 L50 55 L84 8 L126 8 C132 8 138 6 138 0 Z\"/></g> </g> </svg>";
A.LogoMark = function(p){ var sz = p.size || 40; return h("span", {className: "app-logo" + (p.className ? " " + p.className : ""), style: {width: sz, height: sz}, dangerouslySetInnerHTML: {__html: LOGO_SVG}}); };

/* Formlarda değişiklik izleme: kaydetmeden kapatırken sorulur */
A.markDirty = function(){ S.dirty = true; };

/* Gezi simgesi, tıklanmayan hali (başka bir düğmenin içinde kullanmak için) */
A.shortRange = function(t){ var a = D.fmtDay(t.start), b = D.fmtDay(t.end); return a.short + " – " + b.short; };
/* gezi simgesinde görünen: seçildiyse bayrak, değilse harfler */
A.markOf = function(t){ var f = t && t.flag && A.flag(t.flag); return f || (t ? t.short : ""); };
A.TripMark = function(p){ var t = p.t; return h("span", {className: "tp-trip__btn app-tripmark" + (t.flag ? " is-flag" : ""), "aria-hidden": "true", style: {background: "var(--category-" + COLORS[t.color % 6] + "-strong)"}}, A.markOf(t)); };
A.AvatarButton = function(p){
  var me = A.me(), sz = p.size || 40, err = React.useState(false);
  return h("button", {type: "button", className: "app-avatar", style: {width: sz, height: sz}, "aria-label": "Profil" + (me.name ? ": " + me.name : ""), title: "Profil",
      "aria-current": S.page === "profil" ? "page" : undefined,
      onClick: function(){ if(S.page === "profil") return; S.profBack = location.hash || "#home"; location.hash = "profil"; }},
    me.avatar && A.AvatarArt ? h(A.AvatarArt, {k: me.avatar}) : me.photo && !err[0] ? h("img", {src: me.photo, alt: "", referrerPolicy: "no-referrer", onError: function(){ err[1](true); }})
      : (me.initials ? h("span", null, me.initials) : h(T.Icon, {name: "user", size: Math.round(sz * .5)})));
};
function Sidebar(){
  var t = A.trip();
  if(A.offTrip() || !t) return h("nav", {className: "tp-onshell app-side", "aria-label": "Ana sayfa"},
    h("div", {className: "app-side__trip"}, h("div", {style: {flex: 1, minWidth: 0}}, h("div", {className: "heading app-ellipsis"}, "Triplanner"))),
    A.homeSubmenu ? A.homeSubmenu() : null,
    h("div", {className: "app-side__foot"}, h(A.StatusChip)));
  var c = navCounts(t);
  var sub = A.pages[S.page] && A.pages[S.page].submenu ? A.pages[S.page].submenu(t) : null;
  return h("nav", {className: "tp-onshell app-side", "aria-label": t.name + " sayfaları"},
    h("div", {className: "app-side__trip"},
      h("div", {style:{flex:1, minWidth:0}},
        h("div", {className: "heading app-ellipsis"}, t.name),
        h("div", {className: "body-sm app-weak"}, D.fmtRange(t.start, t.end) + ", " + t.days.length + " gün")),
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
    return h(F, {key: i}, h("h2", {className: "label app-side__subhead", style: i ? {marginTop: "var(--space-6)"} : null}, s.title), s.items);
  }));
};

/* Telefon üst çubuğu: logo yok. Gezide: solda Gezilerin'e dönüş oku ve kutusuz gezi adı (dokununca gezi değiştir),
   sağda sohbet ve profil. Ana sayfada: solda Triplanner, sağda profil. */
function PhoneHeader(){
  var home = A.offTrip(), t = home ? null : A.trip();
  if(home || !t) return h("header", {className: "tp-onshell app-phonehead"},
    h("div", {className: "app-phonehead__title app-phonehead__title--brand"}, h(A.LogoMark, {size: 32}), h("span", {className: "app-phonehead__brand"}, "Triplanner")),
    h(A.AvatarButton, {size: 40}));
  return h("header", {className: "tp-onshell app-phonehead"},
    h("a", {href: "#home", className: "app-phonehead__back", "aria-label": "Gezilerin", title: "Gezilerin"}, h(T.Icon, {name: "chevron-left", size: 24})),
    h("button", {type: "button", className: "app-phonehead__trip", onClick: function(){ S.dialog = {kind: "trip-menu"}; A.render(); }, "aria-label": "Gezi değiştir: " + t.name},
      h("span", {className: "app-phonehead__name"}, h("span", {className: "app-ellipsis"}, t.name), h(T.Icon, {name: "chevron-down", size: 16, className: "app-phonehead__chev"})),
      h("span", {className: "app-phonehead__sub app-ellipsis"}, A.shortRange(t) + ", " + t.days.length + " gün")),
    h(A.ActivityButton, {onShell: true}),
    h(A.AvatarButton, {size: 40}));
}
function PhoneNav(){
  var t = A.trip(); if(!t || A.offTrip()) return null;
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
  React.useEffect(function(){ A.ensureFx(); }, []);
  var phone = A.useMedia("(max-width: 899px)");
  var sysDark = A.useMedia("(prefers-color-scheme: dark)");
  A.isPhone = phone;
  A.dark = S.views._theme ? S.views._theme === "dark" : sysDark;
  var home = A.offTrip() || !A.trip(), t = home ? null : A.trip();
  var Page = t && A.pages[S.page] ? A.pages[S.page].view : null;
  var content = S.page === "profil" && A.ProfilePage ? h(A.ProfilePage) : home ? (A.Home ? h(A.Home) : h(A.EmptyApp)) : (Page ? h(Page, {t: t, v: A.view()}) : null);
  var overlay = h(F, null, A.Dialogs ? h(A.Dialogs) : null, S.viewer ? h(Viewer, {key: "viewer"}) : null);
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
    B ? choice("seed", startSeed, h("span", {className: "app-start__avatar", "aria-hidden": "true"}, "GE"), "Gürcistan Yılbaşı", "30 Ara – 3 Oca, Batum ve Kutaisi. Günlük planlar, ulaşım ve hazırlık listesi hazır.") : null);
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
        B ? choice("seed", startSeed, h("span", {className: "app-start__avatar", "aria-hidden": "true"}, "GE"), "Gürcistan Yılbaşı", "30 Ara – 3 Oca, Batum ve Kutaisi. Günlük planlar, ulaşım ve hazırlık listesi hazır.") : null),
      B ? h("div", {className: "app-start__note"},
        h(T.Icon, {name: "share", size: 18}),
        h("p", {className: "body-sm", style: {margin: 0}}, "Bir arkadaşın seni geziye eklediyse burada kendiliğinden görünür. Seni ", h("strong", null, email), " adresiyle eklemesi yeterli.")) : null),
    B ? h("div", {className: "app-start__foot"}, h(B.Account, {compact: true})) : null);
};

/* Ana içerik iskeleti: başlık, kayan gövde, sağ kart */
/* Telefonda sağ kartın yeri: kapalıyken yüzen düğme; açılınca alttan gelen,
   kenarından çekilerek küçük / yarım / tam boya getirilen bölme. */
A.PhonePane = function(p){
  var boxRef = React.useRef(null), peekRef = React.useRef(null), st = React.useRef(null);
  /* açık/kapalı hali kaydedilmez: sayfaya her girişte kapalı gelir */
  S.panes = S.panes || {};
  var snap = ["s", "h", "f"].indexOf(S.panes[p.id]) > -1 ? S.panes[p.id] : "c";
  var size = React.useState({H: 600, S: 140}), drag = React.useState(null), leaving = React.useState(false), ready = React.useState(false);
  /* boy, boyama öncesi ölçülür; içerik yüksekliği kutunun değil içeriğin kendisinden (scrollHeight) okunur,
     böylece bölme kendi boyunu ölçüp büyümez */
  React.useLayoutEffect(function(){
    var box = boxRef.current && boxRef.current.parentNode; if(!box) return;
    function m(){ var pk = peekRef.current; size[1](function(o){ var n = {H: box.clientHeight, S: pk ? pk.scrollHeight + 30 : o.S}; return n.H === o.H && n.S === o.S ? o : n; }); }
    m(); if(!window.ResizeObserver) return;
    var ro = new ResizeObserver(m); ro.observe(box); if(peekRef.current){ ro.observe(peekRef.current); if(peekRef.current.firstChild) ro.observe(peekRef.current.firstChild); }
    return function(){ ro.disconnect(); };
  }, [snap === "c", snap === "s"]);
  /* ilk ölçüm bitene dek boy geçişi kapalı: açılışta yalnızca aşağıdan kayma oynar */
  React.useEffect(function(){
    if(snap === "c"){ if(ready[0]) ready[1](false); return; }
    if(ready[0]) return;
    var r = requestAnimationFrame(function(){ r = requestAnimationFrame(function(){ ready[1](true); }); });
    return function(){ cancelAnimationFrame(r); };
  }, [snap === "c"]);
  function setSnap(x){ S.panes[p.id] = x; A.render(); }
  function close(){ leaving[1](true); setTimeout(function(){ leaving[1](false); setSnap("c"); }, 220); }
  if(snap === "c"){
    return h("button", {ref: boxRef, type: "button", className: "app-fab", onClick: function(){ setSnap("s"); }, "aria-label": p.fab.aria || p.fab.label},
      h(T.Icon, {name: p.fab.icon || "plus", size: 20}), h("span", null, p.fab.label),
      p.fab.count ? h("span", {className: "app-fab__count"}, p.fab.count) : null);
  }
  var kbd = document.documentElement.classList.contains("kbd");
  var H = size[0].H, S0 = Math.min(size[0].S, kbd ? H : Math.round(H * .62)), heights = {s: S0, h: Math.max(S0 + 60, Math.round(H * .55)), f: H};
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
  return h("section", {ref: boxRef, className: "app-pane" + (ready[0] ? "" : " is-sizing") + (drag[0] ? " is-dragging" : "") + (leaving[0] ? " is-leaving" : "") + (showFull ? " is-full" : ""), "aria-label": p.label, style: {height: height + "px"}},
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
