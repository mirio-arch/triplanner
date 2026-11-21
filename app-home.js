/* Ana sayfa: gezilerin özeti ve resmi tatillere göre gezi fırsatları. */
(function(){
"use strict";
var A = window.TPA, D = A.D, T = A.T, h = A.h, F = A.F, S = A.S;

/* ---------- Resmi tatiller (Diyanet takvimine göre; arife yarım gün) ---------- */
var HOLIDAYS = [
  {key: "yilbasi27", name: "Yılbaşı", days: ["2027-01-01"]},
  {key: "ramazan27", name: "Ramazan Bayramı", half: ["2027-03-08"], days: ["2027-03-09", "2027-03-10", "2027-03-11"]},
  {key: "nisan27", name: "23 Nisan", days: ["2027-04-23"]},
  {key: "mayis27", name: "1 Mayıs", days: ["2027-05-01"]},
  {key: "kurban27", name: "Kurban Bayramı", half: ["2027-05-15"], days: ["2027-05-16", "2027-05-17", "2027-05-18", "2027-05-19"]},
  {key: "temmuz27", name: "15 Temmuz", days: ["2027-07-15"]},
  {key: "agustos27", name: "30 Ağustos", days: ["2027-08-30"]},
  {key: "ekim27", name: "Cumhuriyet Bayramı", half: ["2027-10-28"], days: ["2027-10-29"]}
];
/* Her döneme mevsimine ve süresine uygun birkaç rota; elle seçildi */
var IDEAS = {
  yilbasi27: [["Viyana", "Yeni yıl konserleri ve Noel pazarlarının son günleri", "Schengen vizesi"], ["Tiflis", "Kısa uçuş, kükürt hamamları, şarap", "Kimlikle"]],
  ramazan27: [["Fas", "Marakeş, Fes ve Sahra; Mart'ta ılık", "Vizesiz"], ["Endülüs", "Sevilla ve Granada, portakal çiçekleri", "Schengen vizesi"], ["Ürdün", "Petra ve Vadi Rum, kalabalık yok", "Vizesiz"]],
  nisan27: [["Saraybosna ve Mostar", "Uzun hafta sonu için kısa uçuş", "Vizesiz"], ["Amsterdam", "Lale mevsiminin tam ortası", "Schengen vizesi"]],
  mayis27: [["Belgrad", "Hafta sonu kaçamağı, Tuna kıyısı", "Vizesiz"]],
  kurban27: [["Japonya", "Tokyo, Kyoto ve Osaka; Mayıs en rahat ay", "Vizesiz"], ["Güney Kore", "Seul ve Busan, bahar sonu", "K-ETA gerekebilir"], ["Sicilya", "Deniz açılırken, kalabalık başlamadan", "Schengen vizesi"]],
  temmuz27: [["Karadağ", "Kotor körfezi ve Budva", "Vizesiz"], ["Kazbegi", "Gürcistan'da dağ havası, serin yazlar", "Kimlikle"]],
  agustos27: [["Ohri", "Kuzey Makedonya'da göl kıyısı", "Vizesiz"]],
  ekim27: [["Prag", "Sonbahar renkleri, uzun hafta sonu", "Schengen vizesi"], ["Kapadokya", "Balon mevsimi, yurt içi", "Yurt içi"]]
};
function iso(d){ return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0"); }
function add(s, n){ var d = D.parseISO(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
function wd(s){ return D.parseISO(s).getUTCDay(); }
function offMap(){ var m = {}; HOLIDAYS.forEach(function(x){ x.days.forEach(function(d){ m[d] = 1; }); (x.half || []).forEach(function(d){ m[d] = m[d] || .5; }); }); return m; }
function isOff(m, s){ var w = wd(s); return w === 0 || w === 6 || m[s] === 1; }
/* Bayramın çevresindeki en iyi izin planı: en çok 4 gün izinle, günü en uzun ve izin başına verimli olan */
function plan(x, m){
  var first = (x.half || [])[0] || x.days[0], last = x.days[x.days.length - 1];
  function grow(a, b){ while(isOff(m, add(a, -1))) a = add(a, -1); while(isOff(m, add(b, 1))) b = add(b, 1); return [a, b]; }
  var base = grow(x.days[0], last), best = {a: base[0], b: base[1], leave: 0, len: span(base[0], base[1])};
  var opts = [best];
  for(var L = 1; L <= 4; L++){
    for(var left = 0; left <= L; left++){
      var a = base[0], b = base[1], used = 0, k;
      for(k = 0; k < left; k++){ a = add(a, -1); used += m[a] === .5 ? .5 : 1; var g = grow(a, b); a = g[0]; }
      for(k = 0; k < L - left; k++){ b = add(b, 1); used += m[b] === .5 ? .5 : 1; var g2 = grow(a, b); b = g2[1]; }
      opts.push({a: a, b: b, leave: used, len: span(a, b)});
    }
  }
  /* her izin günü ~1,6 tatil günü değerinde: az izinle çok gün kazandıran plan öne çıkar */
  opts.sort(function(p, q){ return (q.len - 1.6 * q.leave) - (p.len - 1.6 * p.leave) || p.leave - q.leave; });
  var pick = opts[0] || best;
  var leaveDays = [];
  for(var s = pick.a; D.parseISO(s) <= D.parseISO(pick.b); s = add(s, 1)) if(!isOff(m, s)) leaveDays.push(s);
  return {a: pick.a, b: pick.b, len: pick.len, leave: pick.leave, leaveDays: leaveDays, base: {a: base[0], b: base[1], len: span(base[0], base[1])}};
}
function span(a, b){ return Math.round((D.parseISO(b) - D.parseISO(a)) / 864e5) + 1; }
function fmtSpan(a, b){
  var A1 = D.fmtDay(a), B1 = D.fmtDay(b), am = D.parseISO(a).getUTCMonth(), bm = D.parseISO(b).getUTCMonth();
  return am === bm ? D.parseISO(a).getUTCDate() + "–" + B1.short : A1.short + " – " + B1.short;
}
function fmtLeave(ds){
  if(!ds.length) return "";
  var parts = [], i = 0;
  var m = offMap();
  while(i < ds.length){ var j = i; while(j + 1 < ds.length && add(ds[j], 1) === ds[j + 1] && m[ds[j + 1]] !== .5 && m[ds[i]] !== .5) j++; parts.push(i === j ? D.fmtDay(ds[i]).short + (m[ds[i]] === .5 ? " (yarım)" : "") : fmtSpan(ds[i], ds[j])); i = j + 1; }
  return parts.join(", ");
}
function leaveText(n){ return n === .5 ? "yarım gün" : (n % 1 ? String(n).replace(".", ",") : n) + " gün"; }
A.holidayDeals = function(){
  var m = offMap(), today = A.todayISO();
  return HOLIDAYS.filter(function(x){ return x.days[x.days.length - 1] >= today; }).map(function(x){
    var p = plan(x, m);
    return {key: x.key, name: x.name, a: p.a, b: p.b, len: p.len, leave: p.leave, leaveDays: p.leaveDays, base: p.base, ideas: IDEAS[x.key] || []};
  }).filter(function(d){ return d.len >= 3; });
};

/* ---------- Gezi özeti ---------- */
function tripState(t){
  var today = D.parseISO(A.todayISO()), s = D.parseISO(t.start), e = D.parseISO(t.end);
  if(today < s){ var n = Math.round((s - today) / 864e5); return {kind: "soon", text: n === 0 ? "Bugün başlıyor" : (n === 1 ? "Yarın başlıyor" : n + " gün kaldı"), n: n}; }
  if(today <= e){ var i = Math.round((today - s) / 864e5) + 1; return {kind: "now", text: "Gezidesin · " + i + ". gün", n: 0}; }
  return {kind: "past", text: "Bitti", n: 1e9};
}
A.tripState = tripState;
/* ---------- Gezi kapağı: son fotoğraf ya da çizim ---------- */
function rnd(seed){ var x = 0; for(var i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0; return function(){ x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
function GeorgiaArt(){
  /* Batum kıyısı, Alfabe Kulesi ve arkada Kafkaslar */
  return h("svg", {className: "app-cover__art", viewBox: "0 0 320 200", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true"},
    h("defs", null,
      h("linearGradient", {id: "gsky", x1: 0, y1: 0, x2: 1, y2: 1}, h("stop", {offset: 0, stopColor: "#0f766e"}), h("stop", {offset: .55, stopColor: "#1e1b4b"}), h("stop", {offset: 1, stopColor: "#6d28d9"})),
      h("radialGradient", {id: "gsun", cx: .78, cy: .28, r: .35}, h("stop", {offset: 0, stopColor: "#5eead4", stopOpacity: .65}), h("stop", {offset: 1, stopColor: "#5eead4", stopOpacity: 0}))),
    h("rect", {width: 320, height: 200, fill: "url(#gsky)"}),
    h("rect", {width: 320, height: 200, fill: "url(#gsun)"}),
    [[30, 40], [70, 22], [120, 34], [210, 18], [260, 46], [300, 26], [160, 14]].map(function(p, i){ return h("circle", {key: i, cx: p[0], cy: p[1], r: i % 3 ? .9 : 1.4, fill: "#fff", opacity: .7}); }),
    h("path", {d: "M0 122 L40 96 L62 108 L98 74 L120 90 L150 62 L176 86 L204 70 L236 94 L262 80 L292 100 L320 88 V200 H0Z", fill: "#312e81", opacity: .75}),
    h("path", {d: "M98 74 L106 80 L100 81 L92 78Z M150 62 L159 70 L152 71 L143 67Z M204 70 L211 76 L205 77 L198 74Z", fill: "#e0e7ff", opacity: .55}),
    h("path", {d: "M0 140 L50 116 L90 130 L140 108 L190 128 L240 112 L320 132 V200 H0Z", fill: "#1e1b4b", opacity: .9}),
    /* Alfabe Kulesi */
    h("g", {transform: "translate(226 72)"},
      h("rect", {x: -3, y: 0, width: 6, height: 82, rx: 3, fill: "#0b1030"}),
      Array.apply(null, Array(9)).map(function(_, i){ return h("path", {key: i, d: "M-7 " + (8 + i * 8) + " Q0 " + (3 + i * 8) + " 7 " + (8 + i * 8), stroke: "#5eead4", strokeWidth: 1.2, fill: "none", opacity: .85}); }),
      h("circle", {cx: 0, cy: -2, r: 6, fill: "none", stroke: "#c4b5fd", strokeWidth: 1.6}), h("circle", {cx: 0, cy: -2, r: 2, fill: "#c4b5fd"})),
    /* dönme dolap */
    h("g", {transform: "translate(268 128)", stroke: "#a5b4fc", strokeWidth: 1, fill: "none", opacity: .8},
      h("circle", {r: 16}), [0, 45, 90, 135].map(function(a){ return h("line", {key: a, x1: -16 * Math.cos(a * Math.PI / 180), y1: -16 * Math.sin(a * Math.PI / 180), x2: 16 * Math.cos(a * Math.PI / 180), y2: 16 * Math.sin(a * Math.PI / 180)}); }),
      h("path", {d: "M-6 26 L0 0 L6 26"})),
    h("path", {d: "M0 160 Q40 150 80 156 T160 154 T240 158 T320 152 V200 H0Z", fill: "#0b1030"}),
    [168, 178, 188].map(function(y, i){ return h("path", {key: y, d: "M" + (10 + i * 14) + " " + y + " q14 -5 28 0 t28 0", stroke: "#5eead4", strokeWidth: 1, fill: "none", opacity: .45 - i * .1}); }));
}
var ART_COLORS = {wine: ["#9d174d", "#4c1d95"], blue: ["#1d4ed8", "#312e81"], green: ["#047857", "#1e3a8a"], amber: ["#b45309", "#7c2d12"], teal: ["#0f766e", "#312e81"], violet: ["#6d28d9", "#1e1b4b"]};
function GenericArt(p){
  var t = p.t, c = ART_COLORS[A.COLORS[t.color % 6]] || ART_COLORS.teal, r = rnd(t.id), gid = "gc" + t.id;
  var peaks = [], x = 0; while(x < 320){ var w = 30 + r() * 50; peaks.push([x + w / 2, 70 + r() * 50]); x += w; }
  var ridge = "M0 140 " + peaks.map(function(q){ return "L" + q[0].toFixed(0) + " " + q[1].toFixed(0); }).join(" ") + " L320 140 V200 H0Z";
  return h("svg", {className: "app-cover__art", viewBox: "0 0 320 200", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true"},
    h("defs", null, h("linearGradient", {id: gid, x1: 0, y1: 0, x2: 1, y2: 1}, h("stop", {offset: 0, stopColor: c[0]}), h("stop", {offset: 1, stopColor: c[1]}))),
    h("rect", {width: 320, height: 200, fill: "url(#" + gid + ")"}),
    h("circle", {cx: 60 + r() * 200, cy: 50, r: 22, fill: "#fff", opacity: .18}),
    h("path", {d: ridge, fill: "#0b1030", opacity: .35}),
    h("path", {d: "M0 165 Q80 150 160 160 T320 155 V200 H0Z", fill: "#0b1030", opacity: .55}),
    h("path", {d: "M30 120 Q120 40 250 80", stroke: "#fff", strokeWidth: 1.4, strokeDasharray: "3 6", fill: "none", opacity: .6, strokeLinecap: "round"}),
    h("path", {d: "M246 76 l10 2 -6 8z", fill: "#fff", opacity: .85}));
}
A.TripCover = function(p){
  var t = p.t, ph = t.photos && t.photos.length ? t.photos[t.photos.length - 1] : null, bad = React.useState(false);
  return h("span", {className: "app-cover"},
    ph && !bad[0] ? h("img", {className: "app-cover__img", src: D.photoUrl(ph.asset), alt: "", onError: function(){ bad[1](true); }})
      : (t.geo === "georgia" ? h(GeorgiaArt) : h(GenericArt, {t: t})), p.children);
};

function lastAct(t){ return (t.activity || []).find(function(a){ return !A.isMine(a.by); }) || null; }
function TripCard(p){
  var t = p.t, st = tripState(t), total = t.checklist.length, done = t.checklist.filter(function(c){ return c.done; }).length, pct = total ? Math.round(done / total * 100) : 0;
  return h("a", {href: A.href("tarihler", "", t.id), className: "app-hometrip" + (st.kind === "past" ? " is-past" : "")},
    h(A.TripCover, {t: t}, h("span", {className: "app-cover__chip" + (st.kind === "now" ? " is-now" : "")}, h(T.Icon, {name: st.kind === "past" ? "check" : "clock", size: 14}), st.text)),
    h("span", {className: "app-hometrip__body"},
      h("span", {className: "heading app-ellipsis"}, t.name),
      h("span", {className: "body-sm app-muted"}, A.shortRange(t) + " · " + t.days.length + " gün"),
      total && st.kind !== "past" ? h("span", {className: "app-hometrip__prep"},
        h("span", {className: "app-hometrip__bar"}, h("span", {style: {transform: "scaleX(" + (done / total) + ")"}})),
        h("span", {className: "label app-muted"}, "Hazırlık %" + pct)) : null));
}
/* Tatil fırsatı: koyu, çizgili ve her dönemde başka renkte ışıklı kart */
var DEAL_TONES = ["teal", "violet", "amber", "pink", "blue", "green", "indigo", "rose"];
function DealCard(p){
  var d = p.d;
  function start(name){ S.dialog = {kind: "trip-new", preset: {name: name ? name + " · " + d.name : d.name + " gezisi", start: d.a, end: d.b}}; A.render(); }
  return h("article", {className: "app-deal is-" + DEAL_TONES[p.i % DEAL_TONES.length]},
    h("div", {className: "app-deal__head"},
      h("div", {style: {flex: 1, minWidth: 0}}, h("h3", {className: "heading app-deal__name"}, d.name), h("span", {className: "app-deal__dates"}, fmtSpan(d.a, d.b))),
      h("span", {className: "app-deal__len"}, h("strong", null, d.len), h("small", null, "gün"))),
    h("span", {className: "app-deal__how"}, d.leave ? leaveText(d.leave) + " izinle" : "İzin almadan", p.clash ? h("span", {className: "app-deal__clash"}, " · gezin var") : null),
    d.ideas.length ? h("div", {className: "app-deal__ideas"}, d.ideas.map(function(x){
      return h("button", {key: x[0], type: "button", className: "app-deal__idea", title: x[1] + " · " + x[2], onClick: function(){ start(x[0]); }}, x[0]);
    })) : null);
}

/* ---------- Son hareketler ---------- */
var ACT_ICON = {expense: "wallet", plan: "calendar", idea: "calendar", transit: "route", check: "checklist", done: "check", photo: "gallery"};
function ago(iso){
  var d = new Date(iso), now = Date.now(), min = Math.round((now - d.getTime()) / 6e4);
  if(!(min >= 0)) return "";
  if(min < 1) return "az önce"; if(min < 60) return min + " dk önce";
  var hr = Math.round(min / 60); if(hr < 24) return hr + " saat önce";
  var days = Math.round(hr / 24); if(days < 7) return days + " gün önce";
  return D.fmtDay(iso.slice(0, 10)).short;
}
A.ago = ago;
function dayKey(iso){ var d = new Date(iso); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function openRef(t, a){
  var v = A.view(); S.dialog = null;
  if(a.kind === "expense"){ if(!t.expenses.some(function(e){ return e.id === a.ref; })){ A.flash("Bu harcama artık yok."); return; } if(A.isPhone){ A.go("harcamalar"); setTimeout(function(){ S.dialog = {kind: "expense", id: a.ref}; A.render(); }, 0); } else { S.expEdit = a.ref; S.expOpen = false; A.go("harcamalar"); } return; }
  if(a.kind === "plan" || a.kind === "idea"){ var w = A.whereIs(t, a.ref); if(!w){ A.flash("Bu plan artık yok."); return; } if(A.dayById(t, w)) v.day = w; A.saveViews(); A.go("tarihler"); return; }
  if(a.kind === "transit"){ if(!t.items[a.ref]){ A.flash("Bu yolculuk artık yok."); return; } v.transit = a.ref; var w2 = A.whereIs(t, a.ref); if(w2) v.day = w2; A.saveViews(); A.go("ulasim"); return; }
  if(a.kind === "check" || a.kind === "done"){ var c = t.checklist.find(function(x){ return x.id === a.ref; }); A.go("hazirlik", A.isPhone && c ? c.group : ""); return; }
  if(a.kind === "photo"){ if(t.photos.some(function(x){ return x.id === a.ref; })){ v.photo = a.ref; A.saveViews(); } A.go("galeri"); }
}
A.openRef = openRef;
A.ActivityFeed = function(p){
  var t = p.t, list = (t.activity || []).slice(0, p.limit || 120), seen = p.seenAt || "";
  if(!list.length) return h("div", {className: "app-actempty"}, h(T.Icon, {name: "bell", size: 22}),
    h("p", {className: "body-sm app-muted", style: {margin: 0}}, "Henüz bir hareket yok. Sen ya da yol arkadaşların plan, bilet, harcama ya da fotoğraf ekledikçe burada görünür."));
  var groups = [], last = null, today = dayKey(new Date().toISOString()), yest = dayKey(new Date(Date.now() - 864e5).toISOString());
  list.forEach(function(a){ var k = dayKey(a.at); if(k !== last){ groups.push({k: k, items: []}); last = k; } groups[groups.length - 1].items.push(a); });
  return h("div", {className: "app-acts"}, groups.map(function(g){
    return h("section", {key: g.k, className: "app-acts__day"},
      h("h3", {className: "label app-muted app-acts__h"}, g.k === today ? "Bugün" : (g.k === yest ? "Dün" : D.fmtDay(g.k).label)),
      g.items.map(function(a){
        var mine = A.isMine(a.by), name = A.nameOf(a.by, a.byName), fresh = !mine && a.at > seen;
        return h("button", {key: a.id, type: "button", className: "app-act" + (fresh ? " is-new" : ""), onClick: function(){ openRef(t, a); }},
          h("span", {className: "app-act__who", style: {background: "var(--category-" + (mine ? "teal" : A.personColor(a.by)) + "-strong)"}, "aria-hidden": "true"}, (name || "?").slice(0, 1).toLocaleUpperCase("tr")),
          h("span", {className: "app-act__text"}, h("span", {className: "body-sm"}, h("strong", null, name), " " + a.text),
            h("span", {className: "app-act__meta"}, h(T.Icon, {name: ACT_ICON[a.kind] || "dot", size: 14}), ago(a.at))),
          h(T.Icon, {name: "chevron-right", size: 16, className: "app-act__chev"}));
      }));
  }));
};

function Home(){
  var B = window.TPB, name = B && B.firstName ? B.firstName() : "";
  if(B && !B.loaded) return h("div", {className: "app-empty"}, h("p", {className: "body app-muted"}, "Geziler yükleniyor…"));
  var trips = S.app.order.map(function(id){ return S.app.trips[id]; }).filter(Boolean)
    .sort(function(a, b){ var x = tripState(a), y = tripState(b); return (x.kind === "past") - (y.kind === "past") || x.n - y.n; });
  var deals = A.holidayDeals();
  var d = D.fmtDay(A.todayISO());
  var head = A.isPhone ? null : h("header", {className: "app-pagehead"},
    h("div", {style: {flex: "1 1 320px", minWidth: 0}}, h("h1", {className: "page-title", style: {margin: 0}}, name ? "Merhaba " + name : "Ana sayfa"),
      h("p", {className: "body app-muted", style: {margin: "var(--space-1) 0 0"}}, d.label)));
  var body = h("div", {className: "app-home"},
    A.isPhone ? h("div", {className: "app-home__hello"}, h("h1", {className: "page-title", style: {margin: 0}}, name ? "Merhaba " + name : "Ana sayfa"), h("p", {className: "body-sm app-muted", style: {margin: 0}}, d.label)) : null,
    h("section", {id: "home-trips", className: "app-home__sec", "aria-labelledby": "home-trips-h"},
      h("div", {className: "app-row"}, h("h2", {id: "home-trips-h", className: "section-title", style: {margin: 0, flex: 1}}, "Gezilerin"),
        trips.length ? h(T.Button, {size: "sm", variant: "ghost", icon: "plus", onClick: function(){ S.dialog = {kind: "trip-new"}; A.render(); }}, "Yeni gezi") : null),
      trips.length ? h("div", {className: "app-hometrips"}, trips.map(function(t){ return h(TripCard, {key: t.id, t: t}); }))
        : h(A.StartChoices)),
    deals.length ? h("section", {id: "home-deals", className: "app-home__sec", "aria-labelledby": "home-deals-h"},
      h("h2", {id: "home-deals-h", className: "section-title", style: {margin: 0}}, "Tatil fırsatları"),
      h("div", {className: "app-deals"}, deals.map(function(x, i){
        var c = trips.find(function(t){ return !(t.end < x.a || t.start > x.b); });
        return h(DealCard, {key: x.key, d: x, i: i, clash: c ? c.name : ""});
      }))) : null);
  return h(F, null, head, A.isPhone ? body : h("div", {className: "tp-shellbody app-body", "data-scroll": true}, body));
}
A.Home = Home;
A.homeSubmenu = function(){
  var items = S.app.order.map(function(id){ var t = S.app.trips[id]; if(!t) return null;
    return h(T.NavItem, {key: id, mark: t.short, label: t.name, sub: tripState(t).text, href: A.href("tarihler", "", id)}); }).filter(Boolean);
  return h(F, null,
    h("div", {className: "app-side__nav"},
      h(T.NavItem, {icon: "home", label: "Ana sayfa", href: "#home", active: true}),
      h(T.NavItem, {icon: "calendar", label: "Tatil fırsatları", href: "#", onClick: function(e){ if(e) e.preventDefault(); var el = document.getElementById("home-deals"); if(el) el.scrollIntoView({behavior: "smooth", block: "start"}); }})),
    items.length ? h(A.Submenu, {title: "Gezilerin"}, items) : null);
};
})();
