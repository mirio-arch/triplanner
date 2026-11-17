/* Ulaşım: gün gün yolculuklar, seçilenin haritası, önemli bilgiler. */
(function(){
"use strict";
var A = window.TPA, D = A.D, T = A.T, h = A.h, F = A.F, S = A.S, G = D.GEO;

function transitOf(t, d){ return d.items.filter(function(id){ return t.items[id] && t.items[id].cat === "ulasim"; }); }
A.transitOf = transitOf;
function modeOf(it){ return it.mode || D.guessMode(it); }
A.modeOf = modeOf;

/* ---------- Harita (yalnızca Gürcistan gezisi için çizili veri var) ---------- */
function RouteMap(p){
  var t = p.t, dayId = p.dayId, g = G.gk(dayId);
  var W = 600, H = 420;
  var keys = g ? (G.ROUTES[g].loop ? [G.ROUTES[g].loop, "botanik", "gonio"] : G.ROUTES[g].path) : Object.keys(G.PLACES);
  var xs = [], ys = [];
  keys.forEach(function(k){ var q = G.proj(G.PLACES[k][0], G.PLACES[k][1]); xs.push(q[0]); ys.push(q[1]); });
  var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
  var pad = 48, dx = Math.max(maxx - minx, 6), dy = Math.max(maxy - miny, 6);
  var k = Math.min((W - pad * 2) / dx, (H - pad * 2) / dy), cx = (minx + maxx) / 2, cy = (miny + maxy) / 2;
  function sp(ll){ var q = G.proj(ll[0], ll[1]); return [(q[0] - cx) * k + W / 2, (q[1] - cy) * k + H / 2]; }
  function path(pts){ return pts.map(function(q, i){ return (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); }).join(" "); }
  var land = G.COAST.map(sp); land.push(sp([42.9, 44.5]), sp([40.4, 44.5]), sp([40.4, 39.8]));
  var routeEls = [];
  t.days.forEach(function(d){
    var gg = G.gk(d.id); if(!gg) return;
    var r = G.ROUTES[gg], on = d.id === dayId;
    if(r.loop){ var c = sp(G.PLACES[r.loop]); routeEls.push(h("circle", {key: d.id, cx: c[0], cy: c[1], r: on ? 22 : 16, fill: "none", stroke: on ? "var(--map-route)" : "var(--map-border)", strokeWidth: on ? 3 : 1.5, strokeDasharray: on ? null : "4 4"})); return; }
    var pts = r.path.map(function(kk){ return sp(G.PLACES[kk]); });
    routeEls.push(h("path", {key: d.id, d: path(pts), fill: "none", stroke: on ? "var(--map-route)" : "var(--map-border)", strokeWidth: on ? 4 : 1.5, strokeLinecap: "round", strokeLinejoin: "round", opacity: on ? 1 : .55, strokeDasharray: on ? null : "5 5"}));
  });
  var used = {}; keys.forEach(function(kk){ used[kk] = 1; });
  var marks = Object.keys(G.PLACES).map(function(kk){
    var P = G.PLACES[kk], q = sp(P);
    if(q[0] < -20 || q[1] < -20 || q[0] > W + 20 || q[1] > H + 20) return null;
    var on = !!used[kk]; if(!on && !P[3]) return null;
    return h("g", {key: kk},
      h("circle", {cx: q[0], cy: q[1], r: on ? 6 : 4, fill: on ? "var(--background-raised)" : "var(--map-border)", stroke: on ? "var(--map-route)" : "none", strokeWidth: 2.5}),
      h("text", {x: q[0] + 10, y: q[1] + 4, className: "app-map__label", style: {fontWeight: on ? 600 : 500, opacity: on ? 1 : .7}}, P[2]));
  });
  return h("svg", {className: "app-map", viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": "Harita: " + (g ? A.dayLabel(t, dayId) + " rotası" : "bölge")},
    h("rect", {width: W, height: H, fill: "var(--map-sea)"}),
    h("path", {d: path(land) + " Z", fill: "var(--map-land)", stroke: "var(--map-coast)", strokeWidth: 1.5}),
    h("path", {d: path(G.RIONI.map(sp)), fill: "none", stroke: "var(--map-river)", strokeWidth: 2, strokeLinecap: "round"}),
    h("path", {d: path(G.BORDER.map(sp)), fill: "none", stroke: "var(--map-border)", strokeWidth: 1.4, strokeDasharray: "6 5"}),
    routeEls, marks);
}
function gmaps(it){
  if(it.origin && it.dest) return "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(it.origin) + "&destination=" + encodeURIComponent(it.dest);
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent((it.title || "").replace(/[→]/g, " "));
}

function within24h(t){
  var now = Date.now(), s = D.parseISO(t.start), e = D.parseISO(t.end);
  if(!s || !e) return false;
  return now >= s.getTime() - 864e5 && now <= e.getTime() + 2 * 864e5;
}

function Aside(p){
  var t = p.t, v = p.v, sel = v.transit && t.items[v.transit] ? t.items[v.transit] : null;
  var selDay = sel ? A.whereIs(t, v.transit) : v.day;
  var hot = within24h(t);
  return h(F, null,
    h(T.Button, {variant: "primary", icon: "plus", full: true, onClick: function(){ S.dialog = {kind: "transit", day: selDay && A.dayById(t, selDay) ? selDay : v.day}; A.render(); }}, "Ulaşım ekle"),
    t.geo === "georgia" && selDay && A.dayById(t, selDay) ? h("div", {className: "app-mapwrap"}, h(RouteMap, {t: t, dayId: selDay})) : null,
    sel ? h("div", {className: "app-stack"},
      h("div", null, h("span", {className: "label app-muted"}, A.dayLabel(t, selDay, true) + (sel.time ? " · " + sel.time : "")),
        h("h2", {className: "heading", style:{margin:0}}, sel.title)),
      sel.note ? h("p", {className: "body-sm", style:{margin:0}}, sel.note) : null,
      h("div", {className: "app-row app-row--wrap"},
        sel.duration ? h(T.Chip, {tone: "outline", icon: "clock"}, sel.duration) : null,
        sel.priceAmount ? h(T.Chip, {tone: "outline", icon: "cash"}, A.money(t, sel.priceAmount, sel.priceCur)) : h(T.Chip, {tone: "outline", icon: "cash"}, "Fiyat girilmedi"),
        sel.critical ? h(T.Chip, {tone: "warning", icon: "warning"}, "Kesin saat") : null),
      h("div", {className: "app-row app-row--wrap"},
        h(T.Button, {size: "sm", icon: "edit", onClick: function(){ S.dialog = {kind: "transit", id: v.transit}; A.render(); }}, "Düzenle"),
        h(T.Button, {size: "sm", variant: "ghost", icon: "calendar", onClick: function(){ A.view().day = selDay; A.saveViews(); A.go("tarihler"); }}, "Plandaki karta git"),
        h(T.Button, {size: "sm", variant: "ghost", iconEnd: "external", href: sel.link || gmaps(sel), target: "_blank"}, sel.link ? "Bilgi" : "Yol tarifi"))) :
      h("p", {className: "body-sm app-muted", style:{margin:0}}, "Bir yolculuğa bas: haritası, süresi ve fiyatı burada görünür."),
    t.keyinfo.length ? h("div", {className: "app-stack"},
      h("div", {className: "app-row"}, h("h2", {className: "heading", style:{margin:0, flex:1}}, "Önemli bilgiler"),
        h(T.IconButton, {icon: "edit", label: "Önemli bilgileri düzenle", size: "sm", onClick: function(){ S.dialog = {kind: "keyinfo"}; A.render(); }})),
      t.keyinfo.map(function(k){ return h(T.KeyInfo, {key: k.id, label: k.label, value: k.value, sub: k.sub, icon: /gidiş|dönüş|uçuş/i.test(k.label) ? "plane" : (/sınır/i.test(k.label) ? "id" : "clock"), tone: k.warn && hot ? "warning" : "neutral"}); })) :
      h(T.Button, {variant: "ghost", icon: "plus", onClick: function(){ S.dialog = {kind: "keyinfo"}; A.render(); }}, "Önemli bilgi ekle"));
}

function Ulasim(p){
  var t = p.t, v = p.v;
  var total = 0, priced = 0;
  t.days.forEach(function(d){ transitOf(t, d).forEach(function(id){ total++; if(t.items[id].priceAmount) priced++; }); });
  var head = h(A.PageHead, {title: "Ulaşım", desc: A.isPhone ? null : "Gün gün yolculuklar. Bir adıma bas, haritası ve ayrıntısı sağda açılır. Ulaşım kartları Tarihler'de de görünür.",
    right: total ? h(T.Chip, {tone: priced < total ? "outline" : "success", icon: "cash"}, priced + "/" + total + " yolculuğun fiyatı girildi") : null});
  var sections = t.days.map(function(d){
    var ids = transitOf(t, d), i = A.dayIndex(t, d.id), f = D.fmtDay(d.date);
    return h("section", {key: d.id, className: "app-card app-transitday", "aria-labelledby": "tr-" + d.id},
      h("div", {className: "app-card__head"},
        h("span", {className: "app-daymark day-mark", "aria-hidden": "true"}, i + 1),
        h("div", {style:{flex:1, minWidth:0}}, h("h2", {id: "tr-" + d.id, className: "heading", style:{margin:0}}, f.short + " " + f.wd),
          h("p", {className: "body-sm app-muted", style:{margin:0}}, A.dayTitle(t, d))),
        h(T.IconButton, {icon: "plus", label: f.short + " için ulaşım ekle", size: "sm", variant: "outline", onClick: function(){ S.dialog = {kind: "transit", day: d.id}; A.render(); }})),
      ids.length ? h("div", {className: "app-steps"}, ids.map(function(id, j){
        var it = t.items[id], mode = modeOf(it);
        return h(T.TransitStep, {key: id, mode: mode, title: it.title || "Yolculuk", time: it.time, duration: it.duration, price: it.priceAmount ? A.money(t, it.priceAmount, it.priceCur) : undefined,
          badge: it.critical ? "Kesin saat" : undefined, note: it.note, last: j === ids.length - 1, selected: v.transit === id, collapsed: v.transit !== id,
          summary: it.note ? it.note.slice(0, 110) + (it.note.length > 110 ? "…" : "") : undefined,
          onSelect: function(){ v.transit = v.transit === id ? null : id; v.day = d.id; A.saveViews(); A.render(); }});
      })) : h("p", {className: "body-sm app-muted", style:{margin:0}}, "Bu gün için ulaşım yok."));
  });
  return h(A.Layout, {head: head, aside: h(Aside, {t: t, v: v}), asideLabel: "Seçili yolculuk"}, sections);
}

function Submenu(t){
  var v = A.view();
  var items = t.days.filter(function(d){ return transitOf(t, d).length; }).map(function(d){
    var ids = transitOf(t, d), f = D.fmtDay(d.date);
    var sub = ids.slice(0, 3).map(function(id){ var it = t.items[id]; return D.MODES[modeOf(it)] + (/^\d/.test(it.time || "") ? " " + it.time.slice(0, 5) : ""); }).join(" · ") + (ids.length > 3 ? " · +" + (ids.length - 3) : "");
    return h(T.NavItem, {key: d.id, mark: String(A.dayIndex(t, d.id) + 1), label: f.short + " " + D.WDS[D.parseISO(d.date).getUTCDay()], sub: sub, count: ids.length,
      active: S.page === "ulasim" && v.transit && ids.indexOf(v.transit) > -1, href: "#", onClick: function(){ v.transit = ids[0]; v.day = d.id; A.saveViews(); A.render();
        var el = document.getElementById("tr-" + d.id); if(el) el.scrollIntoView({block: "start", behavior: "smooth"}); }});
  });
  return items.length ? h(A.Submenu, {title: "Ulaşım özeti"}, items) : null;
}
A.pages.ulasim = {view: Ulasim, submenu: Submenu};
})();
