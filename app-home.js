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
  yilbasi27: [["Viyana", "Yeni yıl konserleri ve Noel pazarlarının son günleri", "Schengen vizesi", "AT"], ["Tiflis", "Kısa uçuş, kükürt hamamları, şarap", "Kimlikle", "GE"]],
  ramazan27: [["Fas", "Marakeş, Fes ve Sahra; Mart'ta ılık", "Vizesiz", "MA"], ["Endülüs", "Sevilla ve Granada, portakal çiçekleri", "Schengen vizesi", "ES"], ["Ürdün", "Petra ve Vadi Rum, kalabalık yok", "Vizesiz", "JO"]],
  nisan27: [["Saraybosna ve Mostar", "Uzun hafta sonu için kısa uçuş", "Vizesiz", "BA"], ["Amsterdam", "Lale mevsiminin tam ortası", "Schengen vizesi", "NL"]],
  mayis27: [["Belgrad", "Hafta sonu kaçamağı, Tuna kıyısı", "Vizesiz", "RS"]],
  kurban27: [["Japonya", "Tokyo, Kyoto ve Osaka; Mayıs en rahat ay", "Vizesiz", "JP"], ["Güney Kore", "Seul ve Busan, bahar sonu", "K-ETA gerekebilir", "KR"], ["Sicilya", "Deniz açılırken, kalabalık başlamadan", "Schengen vizesi", "IT"]],
  temmuz27: [["Karadağ", "Kotor körfezi ve Budva", "Vizesiz", "ME"], ["Kazbegi", "Gürcistan'da dağ havası, serin yazlar", "Kimlikle", "GE"]],
  agustos27: [["Ohri", "Kuzey Makedonya'da göl kıyısı", "Vizesiz", "MK"]],
  ekim27: [["Prag", "Sonbahar renkleri, uzun hafta sonu", "Schengen vizesi", "CZ"], ["Kapadokya", "Balon mevsimi, yurt içi", "Yurt içi", "TR"]]
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
  if(today <= e){ var i = Math.round((today - s) / 864e5) + 1; return {kind: "now", text: "Gezidesin, " + i + ". gün", n: 0}; }
  return {kind: "past", text: "Bitti", n: 1e9};
}
A.tripState = tripState;
/* ---------- Gezi kapağı: son fotoğraf ya da çizim ---------- */
function rnd(seed){ var x = 0; for(var i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0; return function(){ x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
function GeorgiaArt(){
  /* Batum kıyısı, Alfabe Kulesi ve arkada Kafkaslar */
  return h("svg", {className: "app-cover__art", viewBox: "0 0 320 200", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true"},
    h("defs", null,
      h("linearGradient", {id: "gsky", x1: 0, y1: 0, x2: 1, y2: 1}, h("stop", {offset: 0, stopColor: "#0f766e", className: "gs1"}), h("stop", {offset: .55, stopColor: "#1e1b4b", className: "gs2"}), h("stop", {offset: 1, stopColor: "#6d28d9", className: "gs3"})),
      h("radialGradient", {id: "gsun", cx: .78, cy: .28, r: .35}, h("stop", {offset: 0, stopColor: "#5eead4", stopOpacity: .65}), h("stop", {offset: 1, stopColor: "#5eead4", stopOpacity: 0}))),
    h("rect", {width: 320, height: 200, fill: "url(#gsky)"}),
    h("rect", {width: 320, height: 200, fill: "url(#gsun)"}),
    [[30, 40], [70, 22], [120, 34], [210, 18], [260, 46], [300, 26], [160, 14]].map(function(p, i){ return h("circle", {key: i, className: "g-star", cx: p[0], cy: p[1], r: i % 3 ? .9 : 1.4, fill: "#fff", opacity: .7}); }),
    h("path", {d: "M0 122 L40 96 L62 108 L98 74 L120 90 L150 62 L176 86 L204 70 L236 94 L262 80 L292 100 L320 88 V200 H0Z", fill: "#312e81", opacity: .75, className: "g-m1"}),
    h("path", {d: "M98 74 L106 80 L100 81 L92 78Z M150 62 L159 70 L152 71 L143 67Z M204 70 L211 76 L205 77 L198 74Z", fill: "#e0e7ff", opacity: .55}),
    h("path", {d: "M0 140 L50 116 L90 130 L140 108 L190 128 L240 112 L320 132 V200 H0Z", fill: "#1e1b4b", opacity: .9, className: "g-m2"}),
    /* Alfabe Kulesi */
    h("g", {transform: "translate(226 72)"},
      h("rect", {x: -3, y: 0, width: 6, height: 82, rx: 3, fill: "#0b1030", className: "g-tower"}),
      Array.apply(null, Array(9)).map(function(_, i){ return h("path", {key: i, d: "M-7 " + (8 + i * 8) + " Q0 " + (3 + i * 8) + " 7 " + (8 + i * 8), stroke: "#5eead4", strokeWidth: 1.2, fill: "none", opacity: .85}); }),
      h("circle", {cx: 0, cy: -2, r: 6, fill: "none", stroke: "#c4b5fd", strokeWidth: 1.6}), h("circle", {cx: 0, cy: -2, r: 2, fill: "#c4b5fd"})),
    /* dönme dolap */
    h("g", {transform: "translate(268 128)", stroke: "#a5b4fc", strokeWidth: 1, fill: "none", opacity: .8},
      h("circle", {r: 16}), [0, 45, 90, 135].map(function(a){ return h("line", {key: a, x1: -16 * Math.cos(a * Math.PI / 180), y1: -16 * Math.sin(a * Math.PI / 180), x2: 16 * Math.cos(a * Math.PI / 180), y2: 16 * Math.sin(a * Math.PI / 180)}); }),
      h("path", {d: "M-6 26 L0 0 L6 26"})),
    h("path", {d: "M0 160 Q40 150 80 156 T160 154 T240 158 T320 152 V200 H0Z", fill: "#0b1030", className: "g-ground"}),
    [168, 178, 188].map(function(y, i){ return h("path", {key: y, d: "M" + (10 + i * 14) + " " + y + " q14 -5 28 0 t28 0", stroke: "#5eead4", strokeWidth: 1, fill: "none", opacity: .45 - i * .1}); }));
}
var ART_COLORS = {wine: ["#9d174d", "#4c1d95"], blue: ["#1d4ed8", "#312e81"], green: ["#047857", "#1e3a8a"], amber: ["#b45309", "#7c2d12"], teal: ["#0f766e", "#312e81"], violet: ["#6d28d9", "#1e1b4b"]};
function GenericArt(p){
  var t = p.t, c = ART_COLORS[A.COLORS[t.color % 6]] || ART_COLORS.teal, r = rnd(t.id), gid = "gc" + t.id;
  var peaks = [], x = 0; while(x < 320){ var w = 30 + r() * 50; peaks.push([x + w / 2, 70 + r() * 50]); x += w; }
  var ridge = "M0 140 " + peaks.map(function(q){ return "L" + q[0].toFixed(0) + " " + q[1].toFixed(0); }).join(" ") + " L320 140 V200 H0Z";
  return h("svg", {className: "app-cover__art is-generic", viewBox: "0 0 320 200", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true"},
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
      h("span", {className: "body-sm app-muted"}, A.shortRange(t) + ", " + t.days.length + " gün"),
      total && st.kind !== "past" ? h("span", {className: "app-hometrip__prep"},
        h("span", {className: "app-hometrip__bar"}, h("span", {style: {transform: "scaleX(" + (done / total) + ")"}})),
        h("span", {className: "label app-muted"}, "Hazırlık %" + pct)) : null));
}
/* Her tatile kendi çizgisel arka planı */
function ln(d, o){ return h("path", Object.assign({d: d}, o || {})); }
function burst(cx, cy, r, n){
  var out = [];
  for(var i = 0; i < n; i++){ var a = i / n * Math.PI * 2, x1 = cx + Math.cos(a) * r * .35, y1 = cy + Math.sin(a) * r * .35, x2 = cx + Math.cos(a) * r, y2 = cy + Math.sin(a) * r;
    out.push(ln("M" + x1.toFixed(1) + " " + y1.toFixed(1) + " L" + x2.toFixed(1) + " " + y2.toFixed(1))); out.push(h("circle", {cx: x2.toFixed(1), cy: y2.toFixed(1), r: 1.4, fill: "currentColor", stroke: "none"})); }
  return out;
}
function star(cx, cy, r){ var p = []; for(var i = 0; i < 10; i++){ var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; p.push((cx + Math.cos(a) * rr).toFixed(1) + " " + (cy + Math.sin(a) * rr).toFixed(1)); } return ln("M" + p.join(" L") + "Z"); }
var DEAL_ART = {
  yilbasi27: function(){ return [burst(250, 60, 42, 14), burst(300, 130, 26, 10), burst(195, 150, 20, 9), star(150, 40, 6), star(320, 40, 4)]; },
  ramazan27: function(){ return [ln("M282 30 a46 46 0 1 0 22 86 a38 38 0 1 1 -22 -86z"), star(236, 56, 7), star(318, 150, 5), star(200, 120, 4),
    ln("M180 0 V36 M172 36 h16 l6 10 v26 l-6 10 h-16 l-6 -10 v-26z M172 46 h16 M172 72 h16 M180 82 v10")]; },
  nisan27: function(){ return [ln("M250 20 L292 60 L250 112 L208 60Z M250 20 V112 M208 60 H292"), ln("M250 112 C 240 140, 270 150, 255 180 S 240 220, 260 240"),
    [[262, 140], [248, 168], [262, 196]].map(function(q, i){ return ln("M" + q[0] + " " + q[1] + " l8 -5 l0 10z", {key: i}); }),
    ln("M318 92 L340 114 L318 140 L296 114Z M318 92 V140 M296 114 H340"), ln("M318 140 C 310 160, 330 170, 322 200")]; },
  kurban27: function(){ return [ln("M190 200 V130 Q190 90 240 80 Q290 90 290 130 V200"), ln("M240 80 V70"), ln("M238 58 a6 6 0 1 0 4 10 a5 5 0 1 1 -4 -10z"), ln("M210 200 v-40 a8 8 0 0 1 16 0 v40 M254 200 v-40 a8 8 0 0 1 16 0 v40"),
    ln("M316 200 V70 l6 -14 l6 14 V200 M314 110 h16 M314 150 h16"), ln("M312 34 a12 12 0 1 0 6 22 a10 10 0 1 1 -6 -22z")]; },
  temmuz27: function(){ return [ln("M150 150 H340"), ln("M200 150 V60 M290 150 V60 M196 60 h8 M286 60 h8"), ln("M150 120 Q200 60 245 128 Q290 60 340 120"),
    [215, 230, 260, 275].map(function(x, i){ return ln("M" + x + " " + (i % 3 ? 112 : 98) + " V150", {key: i}); }), ln("M150 170 q20 -6 40 0 t40 0 t40 0 t40 0 t40 0", {opacity: .7})]; },
  agustos27: function(){ var o = []; for(var i = 0; i < 7; i++){ var a = Math.PI * (.62 + i * .1), x = 260 + Math.cos(a) * 70, y = 120 + Math.sin(a) * -70, b = Math.PI * (.38 - i * .1), x2 = 260 + Math.cos(b) * 70, y2 = 120 + Math.sin(b) * -70;
      o.push(ln("M" + x.toFixed(0) + " " + y.toFixed(0) + " q-10 -4 -14 6 q10 4 14 -6z", {key: "l" + i})); o.push(ln("M" + x2.toFixed(0) + " " + y2.toFixed(0) + " q10 -4 14 6 q-10 4 -14 -6z", {key: "r" + i})); }
    return [ln("M200 150 Q260 210 320 150"), o, star(260, 110, 10)]; },
  ekim27: function(){ var flags = []; for(var i = 0; i < 7; i++){ var x = 160 + i * 28, y = 26 + Math.sin(i / 6 * Math.PI) * 22; flags.push(ln("M" + x + " " + y.toFixed(0) + " l14 0 l-7 18z", {key: i})); }
    return [ln("M150 24 Q250 70 350 24"), flags, burst(300, 140, 30, 12), star(210, 140, 7)]; }
};
function flat(a){ return a.reduce(function(o, x){ return o.concat(Array.isArray(x) ? flat(x) : [x]); }, []); }
function DealArt(p){
  var f = DEAL_ART[p.k]; if(!f) return null;
  return h("svg", {className: "app-deal__art", viewBox: "0 0 340 220", preserveAspectRatio: "xMaxYMid slice", "aria-hidden": "true"},
    h("g", {fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round"}, flat(f()).map(function(el, i){ return React.cloneElement(el, {key: i}); })));
}
/* Tatil fırsatı: koyu, çizgili ve her dönemde başka renkte ışıklı kart */
var DEAL_TONES = ["teal", "violet", "amber", "pink", "blue", "green", "indigo", "rose"];
function DealCard(p){
  var d = p.d;
  function start(name, code){
    var c = code && D.COUNTRY[code], pre = {name: name ? name + ", " + d.name : d.name + " gezisi", start: d.a, end: d.b};
    if(c){
      pre.countries = [code]; if(c[3] !== "TL") pre.currency = c[3];
      /* fırsattaki ad bir şehirse (ya da "A ve B") şehir olarak gelir */
      var cities = (name || "").split(/\s+ve\s+/).map(function(n){ return D.CITIES.filter(function(x){ return x[0] === n.trim() && x[1] === code; })[0]; }).filter(Boolean);
      pre.dest = cities.length ? cities.map(function(x){ return {c: code, n: x[0]}; }) : [{c: code}];
    }
    A.newTrip(pre);
  }
  return h("article", {className: "app-deal is-" + DEAL_TONES[p.i % DEAL_TONES.length] + (DEAL_ART[d.key] ? " has-art" : "")},
    h(DealArt, {k: d.key}),
    h("div", {className: "app-deal__head"},
      h("div", {style: {flex: 1, minWidth: 0}}, h("h3", {className: "heading app-deal__name"}, d.name), h("span", {className: "app-deal__dates"}, fmtSpan(d.a, d.b))),
      h("span", {className: "app-deal__len"}, h("strong", null, d.len), h("small", null, "gün"))),
    h("span", {className: "app-deal__how"}, d.leave ? leaveText(d.leave) + " izinle" : "İzin almadan"),
    d.ideas.length ? h("div", {className: "app-deal__ideas"}, d.ideas.map(function(x){
      return h("button", {key: x[0], type: "button", className: "app-deal__idea", title: x[1] + ", " + x[2], onClick: function(){ start(x[0], x[3]); }}, x[0]);
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

/* saate göre selam: tarih yerine tek satır */
function greeting(){
  var hr = new Date().getHours();
  return hr >= 5 && hr < 11 ? "Günaydın" : hr >= 11 && hr < 17 ? "İyi günler" : hr >= 17 ? "İyi akşamlar" : "Merhaba";
}
function Home(){
  var B = window.TPB, name = B && B.firstName ? B.firstName() : "";
  if(B && !B.loaded) return h("div", {className: "app-empty"}, h("p", {className: "body app-muted"}, "Geziler yükleniyor…"));
  var trips = S.app.order.map(function(id){ return S.app.trips[id]; }).filter(Boolean)
    .sort(function(a, b){ var x = tripState(a), y = tripState(b); return (x.kind === "past") - (y.kind === "past") || x.n - y.n; });
  /* zaten gezisi olan tatil dönemleri önerilmez */
  var deals = A.holidayDeals().filter(function(x){ return !trips.some(function(t){ return !(t.end < x.a || t.start > x.b); }); });
  var hello = greeting() + (name ? ", " + name : "");
  var head = A.isPhone ? null : h("header", {className: "app-pagehead"},
    h("div", {style: {flex: "1 1 320px", minWidth: 0}}, h("h1", {className: "page-title", style: {margin: 0}}, hello)));
  var body = h("div", {className: "app-home"},
    A.isPhone ? h("div", {className: "app-home__hello"}, h("h1", {className: "page-title", style: {margin: 0}}, hello)) : null,
    h("section", {id: "home-trips", className: "app-home__sec", "aria-labelledby": "home-trips-h"},
      h("div", {className: "app-row"}, h("h2", {id: "home-trips-h", className: "section-title", style: {margin: 0, flex: 1}}, "Gezilerin"),
        A.isPhone ? h("button", {type: "button", className: "app-addbtn", "aria-label": "Yeni gezi", title: "Yeni gezi", onClick: function(){ A.newTrip(); }}, h(T.Icon, {name: "plus", size: 20}))
          : h(T.Button, {size: "sm", variant: "primary", icon: "plus", onClick: function(){ A.newTrip(); }}, "Yeni gezi")),
      trips.length ? h("div", {className: "app-hometrips" + (trips.length > 1 ? " app-hometrips--two" : "")}, trips.map(function(t){ return h(TripCard, {key: t.id, t: t}); }))
        : h("div", {className: "app-card app-homeempty"}, h(T.EmptyState, {illustration: "trip", size: "sm", headingLevel: 3, title: "Henüz gezin yok",
            text: (A.isPhone ? "Gezilerin yanındaki + ile başla." : "Yeni gezi ile başla.") + " Yurt içi de olur, yurt dışı da; aşağıdaki tatil fırsatlarından birine dokunarak da açabilirsin."}))),
    deals.length ? h("section", {id: "home-deals", className: "app-home__sec", "aria-labelledby": "home-deals-h"},
      h("h2", {id: "home-deals-h", className: "section-title", style: {margin: 0}}, "Tatil fırsatları"),
      h("div", {className: "app-deals"}, deals.map(function(x, i){ return h(DealCard, {key: x.key, d: x, i: i}); }))) : null);
  /* telefonda yeni gezi: Gezilerin başlığının yanındaki + (yüzen düğme yok) */
  if(A.isPhone) return body;
  return h(F, null, head, h("div", {className: "tp-shellbody app-body", "data-scroll": true}, body));
}
A.Home = Home;

/* ---------- Hazır avatarlar (özgün çizimler) ---------- */
var AV = {
  balon: ["Balon", '<rect width="64" height="64" fill="url(#avg-balon)"/><defs><linearGradient id="avg-balon" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5eead4"/><stop offset="1" stop-color="#0f766e"/></linearGradient></defs><ellipse cx="13" cy="47" rx="9" ry="3.5" fill="#fff" opacity=".55"/><ellipse cx="51" cy="19" rx="7" ry="3" fill="#fff" opacity=".45"/><path d="M32 10c-9.4 0-16 6.9-16 15.2 0 6.9 5.6 12.3 10.4 16.8L28.5 44h7l2.1-2C42.4 37.5 48 32.1 48 25.2 48 16.9 41.4 10 32 10z" fill="#fb7185"/><path d="M32 10c-4 0-6.5 7-6.5 15.2 0 6.9 1.4 12.3 3 18.8h7c1.6-6.5 3-11.9 3-18.8C38.5 17 36 10 32 10z" fill="#fde047"/><path d="M28.5 44l1 6M35.5 44l-1 6" stroke="#7c2d12" stroke-width="1.2"/><rect x="28" y="50" width="8" height="6" rx="1.5" fill="#92400e"/>'],
  kaktus: ["Kaktüs", '<rect width="64" height="64" fill="#fde68a"/><circle cx="50" cy="14" r="6" fill="#fbbf24"/><rect x="25" y="16" width="14" height="30" rx="7" fill="#16a34a"/><path d="M25 33h-4a3 3 0 0 1-3-3v-5a2.5 2.5 0 0 1 5 0v3h2zM39 29h3v-4a2.5 2.5 0 0 1 5 0v6a3 3 0 0 1-3 3h-5z" fill="#16a34a"/><rect x="25.5" y="23" width="6" height="4" rx="1.5" fill="#111827"/><rect x="32.5" y="23" width="6" height="4" rx="1.5" fill="#111827"/><path d="M31.5 24.6h1" stroke="#111827" stroke-width="1.2"/><path d="M29 31q3 2.5 6 0" stroke="#064e3b" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M22 46h20l-2.5 12h-15z" fill="#ea580c"/><rect x="20" y="43" width="24" height="5" rx="1.5" fill="#c2410c"/>'],
  valiz: ["Valiz", '<rect width="64" height="64" fill="#ddd6fe"/><path d="M26 18v-3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3" stroke="#5b21b6" stroke-width="2.5" fill="none"/><rect x="14" y="18" width="36" height="32" rx="6" fill="#7c3aed"/><rect x="20" y="18" width="3" height="32" fill="#6d28d9"/><rect x="41" y="18" width="3" height="32" fill="#6d28d9"/><circle cx="28" cy="31" r="2.3" fill="#fff"/><circle cx="36" cy="31" r="2.3" fill="#fff"/><circle cx="28.4" cy="31.4" r="1.1" fill="#1e1b4b"/><circle cx="36.4" cy="31.4" r="1.1" fill="#1e1b4b"/><path d="M28.5 37q3.5 3 7 0" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round"/><circle cx="46" cy="44" r="3.5" fill="#5eead4"/><circle cx="20" cy="53" r="2.2" fill="#3b0764"/><circle cx="44" cy="53" r="2.2" fill="#3b0764"/>'],
  tilki: ["Tilki", '<rect width="64" height="64" fill="#ffedd5"/><path d="M15 13l11 10-8 5zM49 13l-11 10 8 5z" fill="#ea580c"/><path d="M18 18l5 5-4 2zM46 18l-5 5 4 2z" fill="#fff7ed"/><path d="M14 26c0-3 8-6 18-6s18 3 18 6c0 9-9 20-18 24-9-4-18-15-18-24z" fill="#f97316"/><path d="M14 27c4 0 10 3 13 9l5 14c-9-4-18-14-18-23zM50 27c-4 0-10 3-13 9l-5 14c9-4 18-14 18-23z" fill="#fff7ed"/><circle cx="25" cy="31" r="2" fill="#1c1917"/><circle cx="39" cy="31" r="2" fill="#1c1917"/><ellipse cx="32" cy="45" rx="2.6" ry="2" fill="#1c1917"/>'],
  penguen: ["Penguen", '<rect width="64" height="64" fill="#bae6fd"/><circle cx="12" cy="14" r="1.5" fill="#fff"/><circle cx="53" cy="22" r="1.2" fill="#fff"/><circle cx="48" cy="9" r="1" fill="#fff"/><ellipse cx="32" cy="40" rx="15" ry="18" fill="#1e293b"/><ellipse cx="32" cy="43" rx="10" ry="13" fill="#f8fafc"/><path d="M32 24c-6 0-9 4-9 8 0 3 2 5 4 6h10c2-1 4-3 4-6 0-4-3-8-9-8z" fill="#f8fafc"/><path d="M19 26c0-8 6-13 13-13s13 5 13 13z" fill="#e11d48"/><rect x="18" y="24" width="28" height="4" rx="2" fill="#be123c"/><circle cx="32" cy="12" r="3" fill="#fff"/><circle cx="28.5" cy="31.5" r="1.6" fill="#0f172a"/><circle cx="35.5" cy="31.5" r="1.6" fill="#0f172a"/><path d="M30 34.5h4l-2 2.5z" fill="#f59e0b"/><ellipse cx="26" cy="58" rx="4" ry="1.8" fill="#f59e0b"/><ellipse cx="38" cy="58" rx="4" ry="1.8" fill="#f59e0b"/>'],
  cay: ["Çay", '<rect width="64" height="64" fill="#fecdd3"/><path d="M27 14c-2 2 2 4 0 6M33 12c-2 2 2 4 0 6M39 14c-2 2 2 4 0 6" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="32" cy="52" rx="16" ry="4" fill="#f8fafc"/><ellipse cx="32" cy="51" rx="10" ry="2.2" fill="#e2e8f0"/><path d="M23 22h18c0 5-3 7-3 12s3 7 3 12c0 3-4 5-9 5s-9-2-9-5c0-5 3-7 3-12s-3-7-3-12z" fill="#fff" opacity=".6"/><path d="M24.2 27h15.6c-.8 2.3-1.8 4-1.8 7 0 5 3 7 3 12 0 2.2-3.6 4-9 4s-9-1.8-9-4c0-5 3-7 3-12 0-3-1-4.7-1.8-7z" fill="#b91c1c"/><path d="M27 30c-.6 2-.6 4 .4 6" stroke="#fff" stroke-width="1.4" opacity=".7" fill="none" stroke-linecap="round"/><rect x="22.5" y="21" width="19" height="2" rx="1" fill="#fff"/>'],
  dag: ["Dağ", '<defs><linearGradient id="avg-dag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c084fc"/><stop offset="1" stop-color="#fdba74"/></linearGradient></defs><rect width="64" height="64" fill="url(#avg-dag)"/><circle cx="42" cy="25" r="8" fill="#fef3c7"/><path d="M-2 54l18-24 10 10 10-14 30 28z" fill="#7c3aed" opacity=".8"/><path d="M36 26l-4.3 6 2.8 1.5 1.5-2 2 2.3 2.5-1.3z" fill="#fff"/><path d="M-2 66v-12l16-14 12 10 12-8 28 24z" fill="#4c1d95"/>'],
  kedi: ["Kedi", '<rect width="64" height="64" fill="#e0e7ff"/><path d="M15 31l3-17 12 8zM49 31l-3-17-12 8z" fill="#475569"/><path d="M18.5 26.5l1.5-8 5.5 4zM45.5 26.5l-1.5-8-5.5 4z" fill="#fda4af"/><ellipse cx="32" cy="37" rx="17" ry="15" fill="#64748b"/><ellipse cx="32" cy="43" rx="7" ry="5" fill="#f1f5f9"/><ellipse cx="25" cy="35" rx="2.5" ry="3" fill="#a3e635"/><ellipse cx="39" cy="35" rx="2.5" ry="3" fill="#a3e635"/><ellipse cx="25" cy="35.3" rx="1" ry="2.2" fill="#0f172a"/><ellipse cx="39" cy="35.3" rx="1" ry="2.2" fill="#0f172a"/><path d="M30.5 41h3l-1.5 1.8z" fill="#fb7185"/><path d="M32 42.8v1.3M32 44.1q-2 1.6-3.5.4M32 44.1q2 1.6 3.5.4" stroke="#334155" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M20 42h-7M20 45l-6 1.5M44 42h7M44 45l6 1.5" stroke="#cbd5e1" stroke-width="1" stroke-linecap="round"/>']
};
A.AVATARS = AV;
A.AvatarArt = function(p){ var a = AV[p.k]; return a ? h("span", {className: "app-avart", "aria-hidden": "true", dangerouslySetInnerHTML: {__html: '<svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' + a[1] + '</svg>'}}) : null; };
/* seçimi kaydet: hesapta (web) ya da bu cihazda */
A.setPic = function(o){
  var B = window.TPB;
  if(B && B.session && B.setPic) return B.setPic(o).then(function(){ A.flash("Profil fotoğrafı güncellendi."); }, function(){ A.flash("Kaydedilemedi; bağlantını kontrol et."); });
  if(o.avatar) S.views._avatar = o.avatar; else delete S.views._avatar;
  A.saveViews(); A.render(); A.flash("Profil fotoğrafı güncellendi."); return Promise.resolve();
};
/* yüklenen fotoğraf: ortadan kare kırpılır, küçültülür */
function squareImage(file){
  return new Promise(function(res){
    if(!window.createImageBitmap){ res(file); return; }
    createImageBitmap(file).then(function(bmp){
      var side = Math.min(bmp.width, bmp.height), out = Math.min(360, side), c = document.createElement("canvas"); c.width = c.height = out;
      c.getContext("2d").drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
      c.toBlob(function(b){ res(b || file); }, "image/jpeg", 0.86);
    }, function(){ res(file); });
  });
}
function PicPicker(p){
  var me = A.me(), B = window.TPB, fileRef = React.useRef(null), busy = React.useState(false);
  var cur = me.avatar ? me.avatar : (me.pic === "photo" ? "photo" : "google");
  function pick(o){ A.setPic(o).then(function(){ if(p.onDone) p.onDone(); }); }
  function onFile(e){
    var f = e.target.files && e.target.files[0]; e.target.value = ""; if(!f || !B || !B.assets) return;
    busy[1](true);
    squareImage(f).then(function(b){ return B.assets.upload(b); }).then(function(r){ busy[1](false); pick({photo: r.id}); }, function(){ busy[1](false); A.flash("Fotoğraf yüklenemedi."); });
  }
  return h("div", {className: "app-avpick", role: "radiogroup", "aria-label": "Profil fotoğrafı"},
    B && B.session ? h("button", {type: "button", className: "app-avpick__tile app-avpick__up" + (busy[0] ? " is-busy" : ""), onClick: function(){ if(fileRef.current) fileRef.current.click(); }, disabled: busy[0]},
      h(T.Icon, {name: "image-add", size: 22}), h("span", null, busy[0] ? "Yükleniyor…" : "Fotoğraf yükle")) : null,
    B && B.session ? h("input", {ref: fileRef, type: "file", accept: "image/*", className: "tp-sr", tabIndex: -1, "aria-label": "Fotoğraf seç", onChange: onFile}) : null,
    me.googlePhoto ? h("button", {type: "button", role: "radio", "aria-checked": cur === "google" ? "true" : "false", className: "app-avpick__tile", "aria-label": "Google fotoğrafın", onClick: function(){ pick({}); }},
      h("img", {src: me.googlePhoto, alt: "", referrerPolicy: "no-referrer"})) : null,
    me.pic === "photo" && me.photo ? h("button", {type: "button", role: "radio", "aria-checked": "true", className: "app-avpick__tile", "aria-label": "Yüklediğin fotoğraf"}, h("img", {src: me.photo, alt: ""})) : null,
    Object.keys(AV).map(function(k){
      return h("button", {key: k, type: "button", role: "radio", "aria-checked": cur === k ? "true" : "false", className: "app-avpick__tile", "aria-label": AV[k][0], title: AV[k][0], onClick: function(){ pick({avatar: k}); }}, h(A.AvatarArt, {k: k}));
    }));
}

/* ---------- Profil sayfası ---------- */
var STK = ["#99f6e4", "#ddd6fe", "#fde68a", "#fecdd3", "#bae6fd", "#bbf7d0"];
function ProfilePage(){
  var me = A.me(), B = window.TPB, theme = S.views._theme || "", img = React.useState(false), fileRef = React.useRef(null), msg = React.useState("");
  var trips = S.app.order.map(function(id){ return S.app.trips[id]; }).filter(Boolean);
  var days = trips.reduce(function(n, t){ return n + t.days.length; }, 0), photos = trips.reduce(function(n, t){ return n + t.photos.length; }, 0);
  var opts = [["", "Cihaz", "sparkle"], ["light", "Açık", "sun"], ["dark", "Koyu", "eye"]];
  function back(e){ if(e) e.preventDefault(); var to = S.profBack && S.profBack !== "#profil" ? S.profBack : "#home"; S.profBack = null; location.hash = to; }
  var picking = React.useState(false), today = A.todayISO();
  /* gidilen ve gidilecek ülkeler (Türkiye hariç); her ülke için en yakın gezinin tarihi */
  var seen = {};
  trips.forEach(function(t){ (t.countries || []).forEach(function(c){
    if(c === "TR" || !D.COUNTRY[c]) return;
    var past = t.start <= today, o = seen[c];
    /* gidilmişse en son gidilen, gidilmemişse en yakın gidilecek */
    if(!o || (past && (!o.past || t.start > o.at)) || (!past && !o.past && t.start < o.at)) seen[c] = {c: c, at: t.start, past: past};
  }); });
  var places = Object.keys(seen).map(function(k){ return seen[k]; }).sort(function(a, b){ return (b.past - a.past) || (a.past ? (a.at < b.at ? 1 : -1) : (a.at < b.at ? -1 : 1)); });
  var went = places.filter(function(x){ return x.past; }), next = places.filter(function(x){ return !x.past; });
  var countryN = went.length + next.length;
  var stats = [["Gezi", trips.length, "route"], ["Ülke", countryN, "flag"], ["Gün", days, "calendar"], ["Fotoğraf", photos, "gallery"]];
  var MON = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  /* yerler: kenarı kıvrık yuvarlak çıkartmalar, yana kayar */
  var placesSec = places.length ? h("section", {className: "app-psec", "aria-labelledby": "ps-places"},
    h("h2", {id: "ps-places", className: "label app-muted"}, "Yerler"),
    h("ul", {className: "app-stickers"}, places.map(function(x, i){
      var d = D.parseISO(x.at), when = d ? MON[d.getUTCMonth()] + " " + d.getUTCFullYear() : "";
      return h("li", {key: x.c, className: "app-sticker" + (x.past ? "" : " is-next"), style: {"--rot": [-6, 4, -3, 7, -5, 3][i % 6] + "deg", "--stk": STK[i % STK.length]}},
        h("span", {className: "app-sticker__disc", "aria-hidden": "true"},
          h("span", {className: "app-sticker__face"}, A.flag(x.c) || D.COUNTRY[x.c][0]),
          h("span", {className: "app-sticker__curl"}, h("span", null))),
        h("span", {className: "app-sticker__name"}, D.COUNTRY[x.c][1]),
        h("span", {className: "app-sticker__when"}, when, x.past ? null : h("span", {className: "tp-sr"}, " (gidilecek)")));
    }))) : null;
  var body = h("div", {className: "app-home app-profilepage"},
    A.isPhone ? h("a", {href: "#home", className: "app-back", onClick: back}, h(T.Icon, {name: "chevron-left", size: 20}), h("span", null, "Geri")) : null,
    h("section", {className: "app-phero", "aria-label": "Profil"},
      h("button", {type: "button", className: "app-avatar app-avatar--xl app-phero__pic", "aria-expanded": picking[0] ? "true" : "false", "aria-label": "Profil fotoğrafını değiştir", onClick: function(){ picking[1](!picking[0]); }},
        me.avatar ? h(A.AvatarArt, {k: me.avatar}) : me.photo && !img[0] ? h("img", {src: me.photo, alt: "", referrerPolicy: "no-referrer", onError: function(){ img[1](true); }}) : (me.initials ? h("span", null, me.initials) : h(T.Icon, {name: "user", size: 32})),
        h("span", {className: "app-phero__edit", "aria-hidden": "true"}, h(T.Icon, {name: "edit", size: 14}))),
      h("h1", {className: "section-title app-phero__name"}, me.name || "Bu cihaz"),
      me.email ? h("p", {className: "body-sm app-muted app-phero__mail"}, me.email) : h("p", {className: "body-sm app-muted app-phero__mail"}, "Veriler bu tarayıcıda tutuluyor")),
    h(A.Expand, {open: picking[0]}, h(PicPicker, {onDone: function(){ picking[1](false); }})),
    h("div", {className: "app-pstats"}, stats.map(function(x){
      return h("div", {key: x[0], className: "app-pstat"}, h(T.Icon, {name: x[2], size: 18}), h("strong", null, x[1]), h("span", {className: "body-sm app-muted"}, x[0]));
    })),
    placesSec,
    h("section", {className: "app-psec", "aria-labelledby": "ps-theme"},
      h("h2", {id: "ps-theme", className: "label app-muted"}, "Görünüm"),
      h("div", {className: "app-seg app-seg--wide", role: "radiogroup", "aria-labelledby": "ps-theme"}, opts.map(function(o){
        return h("button", {key: o[1], type: "button", role: "radio", "aria-checked": theme === o[0] ? "true" : "false", onClick: function(){ A.setTheme(o[0]); }}, h(T.Icon, {name: o[2], size: 16}), h("span", null, o[1]));
      }))),
    B && B.session ? h("section", {className: "app-psec", "aria-labelledby": "ps-backup"},
      h("h2", {id: "ps-backup", className: "label app-muted"}, "Yedek"),
      h("div", {className: "app-plist"},
        trips.length ? h("button", {type: "button", className: "app-prow2", onClick: B.exportAll}, h(T.Icon, {name: "copy", size: 18}), h("span", null, "Yedeği indir")) : null,
        h("button", {type: "button", className: "app-prow2", onClick: function(){ if(fileRef.current) fileRef.current.click(); }}, h(T.Icon, {name: "refresh", size: 18}), h("span", null, "Yedekten yükle"))),
      h("input", {ref: fileRef, type: "file", accept: "application/json,.json", className: "tp-sr", "aria-label": "Yedek dosyası", tabIndex: -1, onChange: function(e){
        var f = e.target.files && e.target.files[0]; e.target.value = ""; if(!f) return;
        B.importFile(f).catch(function(x){ msg[1](x && x.message && !/JSON/.test(x.message) ? x.message : "Bu dosya okunamadı."); });
      }}),
      msg[0] ? h("p", {className: "body-sm tp-field__error", role: "alert", style: {margin: 0}}, msg[0]) : null) : null,
    B && B.session ? h("div", {className: "app-plist"}, h("button", {type: "button", className: "app-prow2 is-danger", onClick: B.signOut}, h(T.Icon, {name: "lock", size: 18}), h("span", null, "Çıkış yap"))) : null);
  var head = A.isPhone ? null : h("header", {className: "app-pagehead"},
    h("div", {style: {flex: "1 1 320px", minWidth: 0}}, h("h1", {className: "page-title", style: {margin: 0}}, "Profil")));
  return h(F, null, head, A.isPhone ? body : h("div", {className: "tp-shellbody app-body", "data-scroll": true}, body));
}
A.ProfilePage = ProfilePage;
A.homeSubmenu = function(){
  var items = S.app.order.map(function(id){ var t = S.app.trips[id]; if(!t) return null;
    return h(T.NavItem, {key: id, mark: A.markOf(t), label: t.name, sub: tripState(t).text, href: A.href("tarihler", "", id)}); }).filter(Boolean);
  return h(F, null,
    h("div", {className: "app-side__nav"},
      h(T.NavItem, {icon: "home", label: "Ana sayfa", href: "#home", active: S.page === "home"}),
      h(T.NavItem, {icon: "calendar", label: "Tatil fırsatları", href: "#", onClick: function(e){ if(e) e.preventDefault(); var el = document.getElementById("home-deals"); if(el) el.scrollIntoView({behavior: "smooth", block: "start"}); }})),
    items.length ? h(A.Submenu, {title: "Gezilerin"}, items) : null);
};
})();
