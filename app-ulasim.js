/* Ulaşım: tarih sırasıyla bilet kartları, esnek yolculuklar, geçmişler; seçilenin yolu haritada. */
(function(){
"use strict";
var A = window.TPA, D = A.D, T = A.T, h = A.h, F = A.F, S = A.S, G = D.GEO;

function transitOf(t, d){ return d.items.filter(function(id){ return t.items[id] && t.items[id].cat === "ulasim"; }); }
A.transitOf = transitOf;
function modeOf(it){ return it.mode || D.guessMode(it); }
A.modeOf = modeOf;
var FLEX_MODES = {taxi: 1, walk: 1, car: 1, border: 1};
function isFlex(it){ return typeof it.flex === "boolean" ? it.flex : !!FLEX_MODES[modeOf(it)]; }
A.isFlexTransit = isFlex;
var MODE_ICON = {plane: "plane", bus: "bus", train: "train", car: "car", taxi: "car", walk: "walk", border: "id"};

/* ---------- Güzergâh, saat, sıra ---------- */
function routeOf(it){
  if(it.origin || it.dest) return [it.origin || "", it.dest || ""];
  if(/→/.test(it.title || "")){ var p = it.title.split("→").map(function(s){ return s.trim(); }); return [p[0], p.slice(1).join(" → ")]; }
  return ["", ""];
}
function hm(s){ var m = String(s || "").match(/(\d{1,2})[:.](\d{2})/); return m ? [+m[1], +m[2]] : null; }
function zoneOf(s){ var m = String(s || "").match(/\b(TR|GE)\b/); return m ? m[1] : ""; }
var OFFSET = {TR: 3, GE: 4};
function at(date, s){
  var x = hm(s), d = D.parseISO(date); if(!x || !d) return null;
  var z = zoneOf(s);
  if(z) return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), x[0] - OFFSET[z], x[1]);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), x[0], x[1]).getTime();
}
function durMin(s){
  var t = String(s || "").replace(",", "."), m = t.match(/(\d+(?:\.\d+)?)\s*(saat|sa)\b/), n = t.match(/(\d+)\s*(dk|dakika)/);
  var v = (m ? parseFloat(m[1]) * 60 : 0) + (n ? +n[1] : 0); return v || 0;
}
/* eski kayıtlarda varış saati notta yazıyor: "21:20'de iniş" */
function endOf(it){
  if(it.end) return it.end;
  var m = String(it.note || "").match(/(\d{1,2}[:.]\d{2})\s*['’]?\s*(?:d[ae]|t[ae])?\s+(?:iniş|varış)/i);
  return m ? m[1] + (zoneOf(it.time) ? " " + zoneOf(it.time) : "") : "";
}
function clock(s){ var x = hm(s); return x ? String(x[0]).padStart(2, "0") + ":" + String(x[1]).padStart(2, "0") : ""; }
A.timeAt = at; A.durMin = durMin; A.clockOf = clock;
function entries(t){
  var out = [], now = Date.now();
  t.days.forEach(function(d, di){
    transitOf(t, d).forEach(function(id, j){
      var it = t.items[id], start = at(d.date, it.time), end = null;
      if(start !== null){
        var en = endOf(it), e = en ? at(d.date, en + (zoneOf(en) ? "" : (zoneOf(it.time) ? " " + zoneOf(it.time) : ""))) : null;
        if(e !== null && e < start) e += 864e5;
        end = e !== null ? e : start + (durMin(it.duration) || 60) * 6e4;
      }
      var dayEnd = (at(d.date, "23:59") || 0) + 6e4;
      out.push({id: id, it: it, day: d, di: di, j: j, start: start, end: end, flex: isFlex(it), past: (end !== null ? end : dayEnd) < now});
    });
  });
  return out;
}
A.transitEntries = entries;
function countdown(e){
  if(e.start === null) return "";
  var now = Date.now(), diff = e.start - now;
  if(diff <= 0) return now < e.end ? "Şimdi yolda" : "";
  var min = Math.round(diff / 6e4);
  if(min < 60) return min + " dk sonra";
  if(min < 24 * 60) return Math.round(min / 60) + " saat sonra";
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var days = Math.round((new Date(e.start).setHours(0, 0, 0, 0) - today.getTime()) / 864e5);
  return days === 1 ? "Yarın " + clock(e.it.time) : days + " gün sonra";
}
function dateText(t, e){ var f = D.fmtDay(e.day.date); return f.short + " " + (A.isPhone ? D.WDS[D.parseISO(e.day.date).getUTCDay()] : f.wd); }

/* ---------- Harita: yalnızca Gürcistan gezisinde çizili veri var ---------- */
function norm(s){ return String(s || "").toLocaleLowerCase("tr").replace(/[ıi̇]/g, "i").replace(/[ş]/g, "s").replace(/[ğ]/g, "g").replace(/[ü]/g, "u").replace(/[ö]/g, "o").replace(/[ç]/g, "c"); }
var PLACE_WORDS = {rzv: ["rize", "havalimani", "havaalani", "airport"], hopa: ["hopa"], sarp: ["sarp"], gonio: ["gonio"], batum: ["batum", "old city apartment"], botanik: ["botanik"], kobuleti: ["kobuleti"],
  kutaisi: ["kutaisi", "kutaysi"], gelati: ["gelati"], motsameta: ["motsameta"], sataplia: ["sataplia"], prometheus: ["prometheus", "prometeus"]};
function placeKey(s){
  var n = norm(s); if(!n) return null;
  var keys = Object.keys(PLACE_WORDS);
  for(var i = 0; i < keys.length; i++){ if(PLACE_WORDS[keys[i]].some(function(w){ return n.indexOf(w) > -1; })) return keys[i]; }
  return null;
}
function legOf(t, it){
  var r = routeOf(it), a = placeKey(r[0]), b = placeKey(r[1]);
  if(modeOf(it) === "border" && !b) a = a || placeKey(it.title) || "sarp";
  if(!a && !b) return null;
  if(!a || !b || a === b) return {keys: [a || b], single: true};
  var best = null;
  Object.keys(G.ROUTES).forEach(function(k){
    var p = G.ROUTES[k].path; if(!p || best) return;
    var i = p.indexOf(a), j = p.indexOf(b);
    if(i > -1 && j > -1) best = i < j ? p.slice(i, j + 1) : p.slice(j, i + 1).reverse();
  });
  return {keys: best || [a, b], single: false};
}
function tripPlaces(){
  var used = {};
  Object.keys(G.ROUTES).forEach(function(k){ var r = G.ROUTES[k]; (r.path || [r.loop]).forEach(function(x){ used[x] = 1; }); });
  return Object.keys(used);
}
function RouteMap(p){
  var t = p.t, W = Math.max(160, Math.round(p.w || 600)), H = Math.max(90, Math.round(p.h || 420));
  var es = p.entries, sel = p.sel, selLeg = sel ? legOf(t, t.items[sel]) : null;
  var fit = tripPlaces(), xs = [], ys = [];
  fit.forEach(function(k){ var q = G.proj(G.PLACES[k][0], G.PLACES[k][1]); xs.push(q[0]); ys.push(q[1]); });
  var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
  var pad = Math.min(48, Math.max(18, Math.min(W, H) * .14)), dx = Math.max(maxx - minx, 6), dy = Math.max(maxy - miny, 6);
  var k = Math.min((W - pad * 2) / dx, (H - pad * 2) / dy), cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  function sp(ll){ var q = G.proj(ll[0], ll[1]); return [(q[0] - cx) * k + W / 2, (q[1] - cy) * k + H / 2]; }
  function pt(key){ return sp(G.PLACES[key]); }
  function path(pts){ return pts.map(function(q, i){ return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); }).join(" "); }
  var coast = [[41.0, 38.0], [41.03, 39.3]].concat(G.COAST, [[42.85, 41.35], [43.0, 41.0], [43.2, 40.5], [43.4, 40.0], [43.6, 39.7]]);
  var land = coast.map(sp); land.push(sp([45.5, 39.0]), sp([45.5, 48]), sp([38.0, 48]), sp([38.0, 37.0]), sp([41.0, 37.0]));
  var base = Object.keys(G.ROUTES).map(function(kk){
    var r = G.ROUTES[kk];
    if(r.loop){ var c = pt(r.loop); return h("circle", {key: kk, cx: c[0], cy: c[1], r: Math.max(8, k * .06), fill: "none", stroke: "var(--map-border)", strokeWidth: 1.2, strokeDasharray: "3 4"}); }
    return h("path", {key: kk, d: path(r.path.map(pt)), fill: "none", stroke: "var(--map-border)", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round", opacity: .6, strokeDasharray: "4 5"});
  });
  var hits = (es || []).map(function(e){
    var lg = legOf(t, e.it); if(!lg || lg.single || e.id === sel) return null;
    return h("path", {key: "hit-" + e.id, d: path(lg.keys.map(pt)), fill: "none", stroke: "transparent", strokeWidth: 18, strokeLinecap: "round", style: {cursor: "pointer", pointerEvents: "stroke"},
      onClick: function(ev){ ev.stopPropagation(); p.onPick && p.onPick(e.id); }}, h("title", null, e.it.title));
  });
  var on = {};
  if(selLeg) selLeg.keys.forEach(function(x){ on[x] = 1; });
  var hl = selLeg ? (selLeg.single
      ? h("circle", {key: "hl", cx: pt(selLeg.keys[0])[0], cy: pt(selLeg.keys[0])[1], r: 13, fill: "none", stroke: "var(--map-route)", strokeWidth: 3, className: "app-map__pulse"})
      : h("path", {key: "hl", d: path(selLeg.keys.map(pt)), fill: "none", stroke: "var(--map-route)", strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round", className: "app-map__leg"})) : null;
  var small = H < 160;
  var marks = Object.keys(G.PLACES).map(function(kk){
    var P = G.PLACES[kk], q = sp(P);
    if(q[0] < -10 || q[1] < -10 || q[0] > W + 10 || q[1] > H + 10) return null;
    var lit = !!on[kk], main = !!G.STOPS[kk] && !!P[3];
    if(!lit && !main) return null;
    if(small && !lit) return h("circle", {key: kk, cx: q[0], cy: q[1], r: 3, fill: "var(--map-border)"});
    return h("g", {key: kk},
      h("circle", {cx: q[0], cy: q[1], r: lit ? 6 : 3.5, fill: lit ? "var(--background-raised)" : "var(--map-border)", stroke: lit ? "var(--map-route)" : "none", strokeWidth: 2.5}),
      h("text", {x: q[0] + 9, y: q[1] + 4, className: "app-map__label" + (lit ? " is-lit" : "")}, P[2]));
  });
  return h("svg", {className: "app-map", viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": sel ? "Harita: " + t.items[sel].title : "Gezinin haritası"},
    h("rect", {width: W, height: H, fill: "var(--map-sea)"}),
    h("path", {d: path(land) + " Z", fill: "var(--map-land)", stroke: "var(--map-coast)", strokeWidth: 1.2}),
    h("path", {d: path(G.RIONI.map(sp)), fill: "none", stroke: "var(--map-river)", strokeWidth: 1.6, strokeLinecap: "round"}),
    h("path", {d: path(G.BORDER.map(sp)), fill: "none", stroke: "var(--map-border)", strokeWidth: 1.2, strokeDasharray: "5 5"}),
    base, hits, hl, marks);
}
function hasMap(t){ return t.geo === "georgia"; }
/* Haritayı kutunun gerçek boyutunda çiz: yazılar küçülmesin */
function MapBox(p){
  var ref = React.useRef(null), sz = React.useState({w: 0, h: 0});
  React.useEffect(function(){
    var el = ref.current; if(!el) return;
    function m(){ sz[1]({w: el.clientWidth, h: el.clientHeight}); }
    m(); if(!window.ResizeObserver) return;
    var ro = new ResizeObserver(m); ro.observe(el); return function(){ ro.disconnect(); };
  }, []);
  return h("div", {ref: ref, className: p.className, style: p.style}, sz[0].w ? h(RouteMap, Object.assign({}, p.map, {w: sz[0].w, h: sz[0].h})) : null);
}
var PLACE_QUERY = {rzv: "Rize-Artvin Havalimanı", hopa: "Hopa", sarp: "Sarp Sınır Kapısı", gonio: "Gonio-Apsaros Kalesi", batum: "Batum", botanik: "Batum Botanik Bahçesi", kobuleti: "Kobuleti",
  kutaisi: "Kutaisi", gelati: "Gelati Manastırı", motsameta: "Motsameta Manastırı", sataplia: "Sataplia", prometheus: "Prometheus Mağarası"};
function q(s, geo){ var k = geo ? placeKey(s) : null; return k ? PLACE_QUERY[k] : s; }
function km(t, it){
  if(!hasMap(t)) return 0;
  var lg = legOf(t, it); if(!lg || lg.single) return 0;
  var sum = 0;
  for(var i = 1; i < lg.keys.length; i++){
    var a = G.PLACES[lg.keys[i - 1]], b = G.PLACES[lg.keys[i]], R = 6371, rad = Math.PI / 180;
    var dLat = (b[0] - a[0]) * rad, dLon = (b[1] - a[1]) * rad;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    sum += 2 * R * Math.asin(Math.sqrt(x));
  }
  return Math.round(sum * 1.2);
}
function gmaps(it){
  var r = routeOf(it), geo = hasMap(A.trip());
  if(r[0] && r[1]) return "https://www.google.com/maps/dir/?api=1&travelmode=driving&origin=" + encodeURIComponent(q(r[0], geo)) + "&destination=" + encodeURIComponent(q(r[1], geo));
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((it.title || "").replace(/[→]/g, " "));
}
function within24h(t){
  var now = Date.now(), s = D.parseISO(t.start), e = D.parseISO(t.end);
  if(!s || !e) return false;
  return now >= s.getTime() - 864e5 && now <= e.getTime() + 2 * 864e5;
}

/* ---------- Seçim ---------- */
function select(id, opts){
  var v = A.view(); v.transit = v.transit === id && !(opts && opts.keep) ? null : id;
  if(v.transit){ var w = A.whereIs(A.trip(), id); if(w) v.day = w; }
  A.saveViews(); A.render();
  if(opts && opts.scroll) setTimeout(function(){ var el = document.getElementById("tk-" + id); if(el) el.scrollIntoView({block: "nearest", behavior: "smooth"}); }, 60);
}
function openTicket(id, e){ if(e){ e.stopPropagation(); e.preventDefault(); } S.dialog = {kind: "ticket", id: id}; A.render(); }
function addTransit(day){ var v = A.view(); S.dialog = {kind: "transit", day: day && A.dayById(A.trip(), day) ? day : v.day}; A.render(); }

/* ---------- Kartlar ---------- */
function keyAct(fn){ return function(e){ if(e.key === "Enter" || e.key === " "){ e.preventDefault(); fn(); } }; }
function Ends(p){
  var big = p.code || p.city, sub = p.code ? p.city : "";
  return h("div", {className: "app-ticket__end" + (p.right ? " is-right" : "")},
    h("span", {className: "app-ticket__big" + (p.code ? " is-code" : "")}, big || "—"),
    sub ? h("span", {className: "body-sm app-muted app-ellipsis"}, sub) : null,
    p.time ? h("span", {className: "app-ticket__time"}, p.time, p.zone ? h("small", null, " " + p.zone) : null) : null);
}
function openUrl(u){ window.open(u, "_blank", "noopener"); }
function Actions(p){
  var it = p.it;
  var items = [{label: "Yol tarifi", icon: "route", description: "Google Haritalar'da mesafe ve süre", onClick: function(){ openUrl(gmaps(it)); }},
    it.link ? {label: "Bilgi", icon: "external", onClick: function(){ openUrl(it.link); }} : null,
    {label: "Plandaki karta git", icon: "calendar", onClick: function(){ A.view().day = p.day; A.saveViews(); S.planOpen = p.id; A.go("tarihler"); }},
    A.chatApi && A.chatApi() ? {label: "Sohbette bahset", icon: "share", onClick: function(){ A.openChat({k: "transit", id: p.id, l: D.str(it.title || "Yolculuk", 80)}); }} : null].filter(Boolean);
  return h("div", {className: "app-ticket__acts", onClick: function(e){ e.stopPropagation(); }},
    h(T.Button, {size: "sm", icon: "edit", onClick: function(){ S.dialog = {kind: "transit", id: p.id}; A.render(); }}, "Düzenle"),
    h(A.MoreMenu, {ariaLabel: "Diğer seçenekler: " + (it.title || ""), size: "sm", variant: "outline", menuWidth: "240px", items: items}));
}
function TicketCard(p){
  var t = p.t, e = p.e, it = e.it, r = routeOf(it), mode = modeOf(it), sel = p.selected;
  var carrier = [it.carrier, it.code].filter(Boolean).join(" · ");
  var cd = p.next ? countdown(e) : "";
  var expanded = sel && A.isPhone, ref = React.useRef(null);
  /* kesik çizginin yerinde kartın kenarından gerçek çentik aç */
  React.useLayoutEffect(function(){
    var el = ref.current; if(!el) return;
    var cut = el.querySelector(".app-ticket__cut"), on = cut && cut.offsetParent !== null && getComputedStyle(cut).display !== "none";
    if(on){ el.style.setProperty("--cut-y", cut.offsetTop + "px"); el.classList.add("has-cut"); } else el.classList.remove("has-cut");
  });
  return h("div", {ref: ref, id: "tk-" + e.id, role: "button", tabIndex: 0, "aria-pressed": sel ? "true" : "false",
      className: "app-ticket" + (sel ? " is-selected" : "") + (p.next ? " is-next" : "") + (e.past ? " is-past" : ""),
      onClick: function(){ select(e.id); }, onKeyDown: keyAct(function(){ select(e.id); })},
    h("div", {className: "app-ticket__top"},
      h("span", {className: "label"}, dateText(t, e)),
      cd ? h(T.Chip, {tone: "primary", icon: "clock"}, cd) : null,
      h("span", {style: {flex: 1}}),
      carrier ? h("span", {className: "label app-muted app-ellipsis"}, carrier) : h("span", {className: "label app-muted"}, D.MODES[mode])),
    r[0] || r[1] ? h("div", {className: "app-ticket__route"},
      h(Ends, {code: it.fromCode, city: r[0], time: clock(it.time), zone: zoneOf(it.time)}),
      h("div", {className: "app-ticket__line", "aria-hidden": "true"}, h("span", {className: "app-ticket__mode"}, h(T.Icon, {name: MODE_ICON[mode] || "route", size: 18})),
        it.duration ? h("span", {className: "app-ticket__dur body-sm app-muted"}, it.duration) : null),
      h(Ends, {code: it.toCode, city: r[1], time: clock(endOf(it)), zone: zoneOf(endOf(it)) || (endOf(it) ? zoneOf(it.time) : ""), right: true}))
    : h("div", {className: "app-ticket__route is-plain"},
      h("div", {style: {minWidth: 0, flex: 1}}, h("span", {className: "app-ticket__title heading"}, it.title || "Yolculuk"),
        h("span", {className: "app-ticket__time"}, clock(it.time) || it.time, zoneOf(it.time) ? h("small", null, " " + zoneOf(it.time)) : null, endOf(it) ? " → " + clock(endOf(it)) : "")),
      h("span", {className: "app-ticket__mode"}, h(T.Icon, {name: MODE_ICON[mode] || "route", size: 18}))),
    h("div", {className: "app-ticket__cut", "aria-hidden": "true"}),
    h("div", {className: "app-ticket__foot"},
      it.seat ? h(T.Chip, {tone: "outline", icon: "ticket"}, it.seat) : null,
      it.ticket ? h("button", {type: "button", className: "app-ticket__file", onClick: function(ev){ openTicket(e.id, ev); }},
        h(T.Icon, {name: "paperclip", size: 14}), h("span", null, "Bileti aç")) : null,
      it.priceAmount ? h(T.Chip, {tone: "outline", icon: "cash"}, A.money(t, it.priceAmount, it.priceCur)) : null,
      it.critical ? h(T.Chip, {tone: "warning", icon: "warning"}, "Kesin saat") : null,
      !(r[0] || r[1]) && !e.past ? h("button", {type: "button", className: "app-ticket__file is-ghost", onClick: function(ev){ ev.stopPropagation(); S.dialog = {kind: "transit", id: e.id, step: 1}; A.render(); }},
        h(T.Icon, {name: "plus", size: 14}), h("span", null, "Güzergâh ekle")) : null),
    A.isPhone ? h(A.Expand, {open: expanded}, h(Actions, {it: it, id: e.id, day: e.day.id})) : null);
}
function FlexRow(p){
  var e = p.e, it = e.it, r = routeOf(it), mode = modeOf(it), sel = p.selected, dist = km(p.t, it);
  var label = r[0] && r[1] ? r[0] + " → " + r[1] : (it.title || "Yolculuk");
  return h("div", {id: "tk-" + e.id, role: "button", tabIndex: 0, "aria-pressed": sel ? "true" : "false",
      className: "app-flexrow" + (sel ? " is-selected" : "") + (e.past ? " is-past" : ""),
      onClick: function(){ select(e.id); }, onKeyDown: keyAct(function(){ select(e.id); })},
    h("div", {className: "app-flexrow__main"},
      h(T.Icon, {name: MODE_ICON[mode] || "route", size: 16}),
      h("span", {className: "app-flexrow__time"}, clock(it.time) || (it.time || "")),
      h("span", {className: "body-sm app-ellipsis", style: {flex: 1, minWidth: 0}}, label),
      dist ? h("span", {className: "label app-muted app-nowrap"}, "≈ " + dist + " km") : h("span", {className: "label app-muted app-nowrap"}, p.showDate ? dateText(p.t, e) : D.MODES[mode]),
      h("a", {href: gmaps(it), target: "_blank", rel: "noopener", className: "app-flexrow__go", "aria-label": "Yol tarifi: " + label, title: "Yol tarifi", onClick: function(ev){ ev.stopPropagation(); }}, h(T.Icon, {name: "route", size: 18}))),
    sel && A.isPhone ? h("div", {className: "app-flexrow__more"}, h(Actions, {it: it, id: e.id, day: e.day.id})) : null);
}
function TicketList(p){
  var t = p.t, v = p.v, es = p.entries;
  var up = es.filter(function(e){ return !e.past; }), past = es.filter(function(e){ return e.past; }).reverse();
  var next = up.find(function(e){ return !e.flex && e.start !== null; });
  function row(e, showDate){ return e.flex ? h(FlexRow, {key: e.id, t: t, e: e, selected: v.transit === e.id, showDate: showDate}) : h(TicketCard, {key: e.id, t: t, e: e, selected: v.transit === e.id, next: next === e}); }
  if(!es.length) return h("div", {className: "app-card"}, h(T.EmptyState, {illustration: "trip", title: "Henüz yolculuk yok", text: "Uçak, otobüs ya da tren biletini " + (A.isPhone ? "sağ alttaki + ile" : "sağdaki karttan") + " ekle; burada tarih sırasıyla bilet kartı olarak durur."}));
  return h("div", {className: "app-tlist"},
    up.length ? h("h2", {className: "label app-muted app-tlist__sec"}, "Yaklaşan") : null,
    up.map(function(e, i){ var prev = up[i - 1]; return row(e, !prev || prev.day.id !== e.day.id); }),
    past.length ? h("h2", {className: "label app-muted app-tlist__sec"}, "Geçmiş") : null,
    past.map(function(e){ return row(e, true); }));
}

/* ---------- Ayrıntı (masaüstünde sağ kart) ---------- */
function Detail(p){
  var t = p.t, id = p.id, it = t.items[id], day = A.whereIs(t, id), r = routeOf(it);
  var carrier = [it.carrier, it.code].filter(Boolean).join(" · ");
  return h("div", {className: "app-stack"},
    h("div", null, h("span", {className: "label app-muted"}, A.dayLabel(t, day, true) + (it.time ? " · " + it.time : "") + (it.end ? " → " + it.end : "")),
      h("h2", {className: "heading", style: {margin: 0}}, r[0] && r[1] ? r[0] + " → " + r[1] : it.title)),
    carrier || it.seat ? h("p", {className: "body-sm", style: {margin: 0}}, [carrier, it.seat].filter(Boolean).join(" · ")) : null,
    it.note ? h("p", {className: "body-sm app-muted", style: {margin: 0}}, it.note) : null,
    h("div", {className: "app-row app-row--wrap"},
      it.duration ? h(T.Chip, {tone: "outline", icon: "clock"}, it.duration) : null,
      it.priceAmount ? h(T.Chip, {tone: "outline", icon: "cash"}, A.money(t, it.priceAmount, it.priceCur)) : h(T.Chip, {tone: "outline", icon: "cash"}, "Fiyat girilmedi"),
      it.critical ? h(T.Chip, {tone: "warning", icon: "warning"}, "Kesin saat") : null),
    it.ticket ? h(T.Button, {icon: "paperclip", full: true, onClick: function(e){ openTicket(id, e); }}, "Bileti aç") : null,
    h(Actions, {it: it, id: id, day: day}));
}
function KeyInfos(p){
  var t = p.t, hot = within24h(t);
  if(!t.keyinfo.length) return h(T.Button, {variant: "ghost", icon: "plus", onClick: function(){ S.dialog = {kind: "keyinfo"}; A.render(); }}, "Önemli bilgi ekle");
  return h("div", {className: "app-stack"},
    h("div", {className: "app-row"}, h("h2", {className: "heading", style: {margin: 0, flex: 1}}, "Önemli bilgiler"),
      h(T.IconButton, {icon: "edit", label: "Önemli bilgileri düzenle", size: "sm", onClick: function(){ S.dialog = {kind: "keyinfo"}; A.render(); }})),
    t.keyinfo.map(function(k){ return h(T.KeyInfo, {key: k.id, label: k.label, value: k.value, sub: k.sub, icon: /gidiş|dönüş|uçuş/i.test(k.label) ? "plane" : (/sınır/i.test(k.label) ? "id" : "clock"), tone: k.warn && hot ? "warning" : "neutral"}); }));
}
function KeyStrip(p){
  var t = p.t, hot = within24h(t);
  if(!t.keyinfo.length) return null;
  return h("div", {className: "app-keystrip", role: "list", "aria-label": "Önemli bilgiler"},
    t.keyinfo.map(function(k){
      return h("div", {key: k.id, role: "listitem", className: "app-keytile" + (k.warn && hot ? " is-warn" : "")},
        h("span", {className: "label app-muted"}, h(T.Icon, {name: /gidiş|dönüş|uçuş/i.test(k.label) ? "plane" : (/sınır/i.test(k.label) ? "id" : "clock"), size: 14}), " " + k.label),
        h("span", {className: "app-keytile__v"}, k.value),
        k.sub ? h("span", {className: "body-sm app-muted app-keytile__s"}, k.sub) : null);
    }),
    h("button", {type: "button", className: "app-keytile app-keytile--edit", "aria-label": "Önemli bilgileri düzenle", onClick: function(){ S.dialog = {kind: "keyinfo"}; A.render(); }}, h(T.Icon, {name: "edit", size: 18})));
}
function Aside(p){
  var t = p.t, v = p.v, sel = v.transit && t.items[v.transit] ? v.transit : null;
  return h(F, null,
    h(T.Button, {variant: "primary", icon: "plus", full: true, onClick: function(){ addTransit(sel ? A.whereIs(t, sel) : null); }}, "Ulaşım ekle"),
    hasMap(t) ? h(MapBox, {className: "app-mapwrap app-mapwrap--aside", map: {t: t, entries: p.entries, sel: sel, onPick: function(id){ select(id, {keep: true, scroll: true}); }}}) : null,
    sel ? h(Detail, {t: t, id: sel}) : h("p", {className: "body-sm app-muted", style: {margin: 0}}, "Bir bilete bas: yolu haritada görünür, ayrıntısı burada açılır."),
    h(KeyInfos, {t: t}));
}

/* ---------- Telefonda: üstte biletler, altta boyutu çekilerek değişen harita ---------- */
var SMALL = 124;
function MapPane(p){
  var t = p.t, v = p.v, boxRef = React.useRef(null);
  var size = React.useState({H: 600}), drag = React.useState(null);
  var snap = ["s", "h", "f"].indexOf(S.mapSnap) > -1 ? S.mapSnap : "c", leaving = React.useState(false), st = React.useRef(null);
  React.useEffect(function(){
    var box = boxRef.current && boxRef.current.parentNode; if(!box) return;
    function m(){ size[1]({H: box.clientHeight}); }
    m(); if(!window.ResizeObserver) return;
    var ro = new ResizeObserver(m); ro.observe(box); return function(){ ro.disconnect(); };
  }, [snap === "c"]);
  function close(){ leaving[1](true); setTimeout(function(){ leaving[1](false); S.mapSnap = "c"; A.render(); }, 220); }
  var sel0 = v.transit && t.items[v.transit] ? v.transit : null;
  if(snap === "c") return h("div", {ref: boxRef, className: "app-fabs"},
    h("button", {type: "button", className: "app-fab app-fab--round", "aria-label": "Ulaşım ekle", title: "Ulaşım ekle", onClick: function(){ addTransit(sel0 ? A.whereIs(t, sel0) : null); }}, h(T.Icon, {name: "plus", size: 22})),
    h("button", {type: "button", className: "app-fab", onClick: function(){ S.mapSnap = "s"; A.render(); }}, h(T.Icon, {name: "map", size: 20}), h("span", null, "Harita")));
  var H = size[0].H, heights = {s: SMALL, h: Math.round(H * .5), f: H};
  var height = drag[0] ? drag[0].cur : heights[snap];
  function setSnap(x){ S.mapSnap = x; A.render(); }
  function down(e){
    if(e.button !== undefined && e.button !== 0) return;
    st.current = {y: e.clientY, h0: heights[snap], moved: false};
    try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(x){}
  }
  function move(e){
    var s = st.current; if(!s) return;
    var dy = s.y - e.clientY; if(Math.abs(dy) > 5) s.moved = true;
    if(s.moved) drag[1]({cur: Math.max(72, Math.min(H, s.h0 + dy))});
  }
  function up(){
    var s = st.current; st.current = null; if(!s) return;
    if(!s.moved){ drag[1](null); setSnap(snap === "h" ? "s" : "h"); return; }
    var cur = drag[0] ? drag[0].cur : heights[snap], best = "s";
    if(cur < SMALL - 40){ drag[1](null); close(); return; }
    ["s", "h", "f"].forEach(function(k){ if(Math.abs(heights[k] - cur) < Math.abs(heights[best] - cur)) best = k; });
    drag[1](null); setSnap(best);
  }
  function key(e){
    var order = ["s", "h", "f"], i = order.indexOf(snap);
    if(e.key === "ArrowUp"){ e.preventDefault(); setSnap(order[Math.min(2, i + 1)]); }
    else if(e.key === "ArrowDown"){ e.preventDefault(); if(i === 0) close(); else setSnap(order[i - 1]); }
    else if(e.key === "Escape"){ e.preventDefault(); close(); }
    else if(e.key === "Enter" || e.key === " "){ e.preventDefault(); setSnap(snap === "h" ? "s" : "h"); }
  }
  var sel = v.transit && t.items[v.transit] ? v.transit : null, selE = sel ? p.entries.find(function(e){ return e.id === sel; }) : null;
  var full = !drag[0] && snap === "f";
  return h("div", {ref: boxRef, className: "app-mappane" + (drag[0] ? " is-dragging" : "") + (full ? " is-full" : "") + (leaving[0] ? " is-leaving" : ""), style: {height: height + "px"}},
    h("div", {className: "app-mappane__edge", role: "slider", tabIndex: 0, "aria-label": "Harita boyutu", "aria-valuemin": 0, "aria-valuemax": 2,
        "aria-valuenow": ["s", "h", "f"].indexOf(snap), "aria-valuetext": {s: "küçük", h: "yarım", f: "tam"}[snap],
        onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up, onKeyDown: key},
      h("span", {className: "app-mappane__grip"})),
    h(MapBox, {className: "app-mappane__map", map: {t: t, entries: p.entries, sel: sel, onPick: function(id){ select(id, {keep: true, scroll: snap !== "f"}); }}}),
    h("div", {className: "app-mappane__tools"},
      h("button", {type: "button", className: "app-mappane__add", onClick: function(){ addTransit(sel ? A.whereIs(t, sel) : null); }}, h(T.Icon, {name: "plus", size: 16}), h("span", null, "Ulaşım ekle")),
      h("button", {type: "button", className: "app-mappane__add app-mappane__x", "aria-label": "Haritayı kapat", onClick: close}, h(T.Icon, {name: "close", size: 16}))),
    full && selE ? h("button", {type: "button", className: "app-mappane__sel", onClick: function(){ setSnap("h"); setTimeout(function(){ var el = document.getElementById("tk-" + sel); if(el) el.scrollIntoView({block: "nearest", behavior: "smooth"}); }, 300); }},
      h(T.Icon, {name: MODE_ICON[modeOf(selE.it)] || "route", size: 18}),
      h("span", {className: "body-sm app-ellipsis", style: {flex: 1, minWidth: 0, textAlign: "left"}}, h("strong", null, routeOf(selE.it)[0] && routeOf(selE.it)[1] ? routeOf(selE.it).join(" → ") : selE.it.title), " · " + dateText(t, selE) + (selE.it.time ? " " + clock(selE.it.time) : "")),
      h(T.Icon, {name: "chevron-up", size: 18})) : null);
}

function Ulasim(p){
  var t = p.t, v = p.v, es = entries(t);
  var nTicket = es.filter(function(e){ return !e.flex; }).length;
  if(A.isPhone){
    var listBody = h(F, null,
      h(A.PageHead, {title: "Ulaşım"}),
      h("div", {className: "app-phonepage"}, t.keyinfo.length ? h(KeyStrip, {t: t}) : null, h(TicketList, {t: t, v: v, entries: es}),
        t.keyinfo.length ? null : h(KeyInfos, {t: t})));
    return h("div", {className: "app-tphone"},
      h("div", {className: "app-tphone__list", "data-scroll": true}, listBody),
      hasMap(t) ? h(MapPane, {t: t, v: v, entries: es}) : h("div", {className: "app-tphone__addbar"}, h(T.Button, {variant: "primary", icon: "plus", full: true, onClick: function(){ addTransit(); }}, "Ulaşım ekle")));
  }
  var head = h(A.PageHead, {title: "Ulaşım", desc: "Biletlerin tarih sırasıyla. Taksi gibi saati esnek yolculuklar sade satırda; geçmişler en altta.",
    right: nTicket ? h(T.Chip, {tone: "outline", icon: "ticket"}, nTicket + " bilet") : null});
  return h(A.Layout, {head: head, aside: h(Aside, {t: t, v: v, entries: es}), asideLabel: "Seçili yolculuk"}, h(TicketList, {t: t, v: v, entries: es}));
}

/* ---------- Bilet dosyası ---------- */
function TicketView(p){
  var t = A.trip(), it = t && t.items[p.id];
  function close(){ S.dialog = null; A.render(); }
  if(!it || !it.ticket) return null;
  var url = D.photoUrl(it.ticket.asset), r = routeOf(it);
  return h("div", {className: "tp-scrim app-ticketview", onMouseDown: function(e){ if(e.target === e.currentTarget) close(); }, onKeyDown: function(e){ if(e.key === "Escape") close(); }},
    h("section", {role: "dialog", "aria-modal": "true", "aria-label": "Bilet: " + it.title, className: "app-ticketview__box"},
      h("header", {className: "app-ticketview__head"},
        h("div", {style: {minWidth: 0, flex: 1}}, h("div", {className: "heading app-ellipsis"}, r[0] && r[1] ? r[0] + " → " + r[1] : it.title),
          h("div", {className: "body-sm app-muted app-ellipsis"}, [A.dayLabel(t, A.whereIs(t, p.id), true), clock(it.time), it.carrier, it.code, it.seat].filter(Boolean).join(" · "))),
        h(T.Button, {size: "sm", variant: "ghost", iconEnd: "external", href: url, target: "_blank"}, "Yeni sekmede"),
        h(T.IconButton, {icon: "close", label: "Kapat", onClick: close, autoFocus: true})),
      h("div", {className: "app-ticketview__body"},
        it.ticket.type === "pdf" ? h("iframe", {src: url, title: it.ticket.name, className: "app-ticketview__pdf"})
        : h("img", {src: url, alt: "Bilet: " + it.title, className: "app-ticketview__img"}))));
}
A.TicketView = TicketView;
A.uploadTicket = function(file){
  var pdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name || "");
  if(!pdf && !/^image\//i.test(file.type)) return Promise.reject(new Error("Fotoğraf ya da PDF seç."));
  if(file.size > 10 * 1024 * 1024) return Promise.reject(new Error("Dosya 10 MB'tan büyük."));
  return A.getAssets().then(function(assets){
    if(!assets) throw new Error("Bu görünümde dosya yüklenemiyor.");
    var prep = pdf ? Promise.resolve(file) : A.shrinkImage(file);
    return prep.then(function(b){ return assets.upload(b); }).then(function(r){ return {asset: r.id, name: D.str(file.name || (pdf ? "bilet.pdf" : "bilet.jpg"), 80), type: pdf ? "pdf" : "image"}; });
  });
};

function Submenu(t){
  var v = A.view();
  var items = t.days.filter(function(d){ return transitOf(t, d).length; }).map(function(d){
    var ids = transitOf(t, d), f = D.fmtDay(d.date);
    var sub = ids.slice(0, 3).map(function(id){ var it = t.items[id]; return D.MODES[modeOf(it)] + (hm(it.time) ? " " + clock(it.time) : ""); }).join(" · ") + (ids.length > 3 ? " · +" + (ids.length - 3) : "");
    return h(T.NavItem, {key: d.id, mark: String(A.dayIndex(t, d.id) + 1), label: f.short + " " + D.WDS[D.parseISO(d.date).getUTCDay()], sub: sub, count: ids.length,
      active: S.page === "ulasim" && v.transit && ids.indexOf(v.transit) > -1, href: "#", onClick: function(e){ if(e) e.preventDefault(); select(ids[0], {keep: true, scroll: true}); }});
  });
  return items.length ? h(A.Submenu, {title: "Ulaşım özeti"}, items) : null;
}
A.pages.ulasim = {view: Ulasim, submenu: Submenu};
})();
