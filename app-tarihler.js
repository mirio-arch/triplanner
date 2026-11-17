/* Tarihler: gün başlığı, planlar (kartlar / saatler), kenar listesi. */
(function(){
"use strict";
var A = window.TPA, D = A.D, T = A.T, h = A.h, F = A.F, S = A.S;

function selectDay(t, id){ var v = A.view(); v.day = id; A.saveViews(); S.dayEdit = false; if(S.page !== "tarihler") A.go("tarihler"); else A.render(); }
A.selectDay = selectDay;

function removeToSide(t, id){
  var snap = A.snapshot(), it = t.items[id];
  A.moveItem(t, id, "removed", 0);
  A.commit();
  A.flash("“" + (it.title || "Plan") + "” kenar listesine taşındı.", function(){ A.restore(snap); });
}
function addToDay(t, id, dayId){
  var snap = A.snapshot(), it = t.items[id];
  A.moveItem(t, id, dayId, "time");
  A.commit();
  A.flash("“" + (it.title || "Plan") + "” " + A.dayLabel(t, dayId) + " planına eklendi.", function(){ A.restore(snap); });
}
A.addToDay = addToDay;

function useSortable(ref, onMove, deps){
  React.useEffect(function(){
    if(!ref.current || typeof window.Sortable === "undefined") return;
    var s = window.Sortable.create(ref.current, {handle: ".tp-card__handle", animation: 160, forceFallback: true, fallbackOnBody: true, ghostClass: "app-ghost", chosenClass: "app-chosen",
      onEnd: function(evt){
        if(evt.oldIndex === evt.newIndex) return;
        /* React düğümleri yönetir: DOM'u geri al, sırayı veriye yaz */
        var parent = evt.from, item = evt.item;
        parent.removeChild(item); parent.insertBefore(item, parent.children[evt.oldIndex] || null);
        onMove(evt.oldIndex, evt.newIndex);
      }});
    return function(){ s.destroy(); };
  }, deps);
}

function PlanList(p){
  var t = p.t, day = p.day, ref = React.useRef(null);
  useSortable(ref, function(from, to){
    var ids = day.items.filter(function(id){ return t.items[id]; });
    var moved = ids.splice(from, 1)[0]; ids.splice(to, 0, moved); day.items = ids; A.commit();
  }, [day.id, day.items.length]);
  var ids = day.items.filter(function(id){ return t.items[id]; });
  return h("div", {className: "app-plans", ref: ref}, ids.map(function(id){
    var it = t.items[id], dsCat = D.CAT_TO_DS[it.cat];
    var extra = it.cat === "ulasim" && it.priceAmount ? A.money(t, it.priceAmount, it.priceCur) : null;
    var exp = t.expenses.filter(function(e){ return e.ref === id && e.source === "plan"; });
    if(!extra && exp.length) extra = exp.map(function(e){ return D.fmtMoney(e.amount, e.currency); }).join(" + ");
    return h(T.PlanCard, {key: id, dataId: id, time: it.time || "—", title: it.title || "Adsız plan", note: it.note, category: dsCat,
      categoryLabel: D.CATS[it.cat], link: it.link ? "Bilgi" : undefined, href: it.link || undefined, extra: extra || (it.critical ? "Kesin saat" : undefined), extraIcon: extra ? "cash" : (it.critical ? "warning" : undefined),
      critical: it.critical, compact: A.isPhone,
      onEdit: function(){ S.dialog = {kind: "plan", id: id}; A.render(); },
      onRemove: function(){ removeToSide(t, id); }});
  }));
}

function HoursList(p){
  var t = p.t, ids = p.day.items.filter(function(id){ return t.items[id]; });
  return h("div", {className: "app-hours"}, ids.map(function(id, i){
    var it = t.items[id], next = ids[i + 1] ? t.items[ids[i + 1]] : null;
    var m = /(\d{1,2}[:.]\d{2})/.exec(it.time || ""), n = next && /(\d{1,2}[:.]\d{2})/.exec(next.time || "");
    return h("div", {key: id, className: "app-hours__row"},
      h("span", {className: "time app-weak app-hours__t"}, m ? m[1] : "—"),
      h("button", {type: "button", className: "app-hours__btn", onClick: function(){ S.dialog = {kind: "plan", id: id}; A.render(); }, "aria-label": "Düzenle: " + it.title},
        h(T.TimeBlock, {title: it.title || "Adsız plan", start: m ? m[1] : "", end: n ? n[1] : "", note: it.note ? it.note.slice(0, 90) : undefined, category: D.CAT_TO_DS[it.cat], variant: "tint"})));
  }));
}

function DayHead(p){
  var t = p.t, day = p.day, i = A.dayIndex(t, day.id), f = D.fmtDay(day.date);
  var ed = React.useState({title: day.title, night: day.night});
  React.useEffect(function(){ ed[1]({title: day.title, night: day.night}); }, [day.id, S.dayEdit]);
  if(S.dayEdit){
    return h("form", {className: "app-card app-dayhead app-dayhead--edit", onSubmit: function(e){ e.preventDefault(); day.title = D.str(ed[0].title, 120); day.night = D.str(ed[0].night, 120); S.dayEdit = false; A.commit(); }},
      h(T.TextField, {label: "Günün başlığı", value: ed[0].title, placeholder: (i + 1) + ". gün", onChange: function(v){ ed[1]({title: v, night: ed[0].night}); }, autoFocus: true}),
      h(T.TextField, {label: "Gece / konaklama", value: ed[0].night, placeholder: "Örn. Gece: Otel adı", onChange: function(v){ ed[1]({title: ed[0].title, night: v}); }}),
      h("div", {className: "app-row"}, h(T.Button, {variant: "ghost", onClick: function(){ S.dayEdit = false; A.render(); }}, "Vazgeç"), h(T.Button, {variant: "primary", type: "submit"}, "Kaydet")));
  }
  var night = (day.night || "").replace(/^Gece:\s*/, "");
  return h("div", {className: "app-card app-dayhead"},
    h("span", {className: "app-dayhead__nav"},
      h(T.IconButton, {icon: "chevron-left", label: "Önceki gün", variant: "outline", size: "sm", onClick: i > 0 ? function(){ selectDay(t, t.days[i - 1].id); } : undefined}),
      h(T.IconButton, {icon: "chevron-right", label: "Sonraki gün", variant: "outline", size: "sm", onClick: i < t.days.length - 1 ? function(){ selectDay(t, t.days[i + 1].id); } : undefined})),
    h("h2", {className: A.isPhone ? "heading" : "section-title", style:{margin:0}}, f.short + " " + f.wd + " · " + A.dayTitle(t, day)),
    night ? h(T.Chip, {icon: /dönüş|uçuş/i.test(night) ? "plane" : "bed"}, (/^Dönüş/.test(day.night) ? "" : "Gece: ") + night) : null,
    h("span", {style:{flex:1}}),
    h(T.Button, {variant: "ghost", size: "sm", icon: "edit", onClick: function(){ S.dayEdit = true; A.render(); }}, "Günü düzenle"));
}

function SideList(p){
  var t = p.t, v = p.v, day = A.dayById(t, v.day);
  var dayNames = t.days.map(function(d){ return A.dayLabel(t, d.id); });
  var q = React.useState("");
  function card(id, kind){
    var it = t.items[id]; if(!it) return null;
    var match = !q[0] || ((it.title || "") + " " + (it.note || "")).toLocaleLowerCase("tr").indexOf(q[0].toLocaleLowerCase("tr")) > -1;
    if(!match) return null;
    var target = it.from && A.dayById(t, it.from) ? it.from : v.day;
    return h(T.IdeaCard, {key: id, dataId: id, title: it.title || "Adsız", note: it.note, category: D.CAT_TO_DS[it.cat], categoryLabel: D.CATS[it.cat],
      source: kind === "removed" && it.from && A.dayById(t, it.from) ? A.dayLabel(t, it.from) + " planından" : undefined,
      day: A.dayLabel(t, target), days: dayNames,
      onAdd: function(){ addToDay(t, id, target); }, onPick: function(i){ addToDay(t, id, t.days[i].id); },
      extraItems: [{label: "Düzenle", icon: "edit", onClick: function(){ S.dialog = {kind: "plan", id: id}; A.render(); }},
        {label: "Kalıcı olarak sil", icon: "trash", danger: true, onClick: function(){ S.dialog = {kind: "plan-delete", id: id}; A.render(); }}]});
  }
  return h("div", {className: "app-sidelist"},
    h("div", {className: "app-asidehead"},
      h("div", {style:{flex:1, minWidth:0}}, h("h2", {className: "heading", style:{margin:0}}, "Kenar listesi"),
        h("p", {className: "body-sm app-muted", style:{margin:0}}, "Plana ekle, yeri açık olan güne koyar; başka gün için oka bas.")),
      A.isPhone ? null : h(T.IconButton, {icon: "panel-right", label: "Kenar listesini gizle", expanded: true, onClick: function(){ v.panel = false; A.saveViews(); A.render(); }})),
    h("label", {className: "app-search"}, h(T.Icon, {name: "search", size: 18}),
      h("input", {className: "body", type: "search", placeholder: "Önerilerde ve çıkardıklarında ara", value: q[0], onChange: function(e){ q[1](e.target.value); }, "aria-label": "Kenar listesinde ara"})),
    h(T.Button, {variant: "tertiary", icon: "plus", full: true, onClick: function(){ S.dialog = {kind: "plan", newIn: "ideas"}; A.render(); }}, "Öneri ekle"),
    t.removed.length ? h(F, null, h("h3", {className: "label app-muted app-sidelist__h"}, "Çıkardıkların · " + t.removed.length), t.removed.map(function(id){ return card(id, "removed"); })) : null,
    h("h3", {className: "label app-muted app-sidelist__h"}, "Öneriler · " + t.ideas.length),
    t.ideas.length ? t.ideas.map(function(id){ return card(id, "ideas"); }) : h("p", {className: "body-sm app-muted"}, "Gitmek istediğin ama henüz güne koymadığın yerler burada durur."));
}

function Tarihler(p){
  var t = p.t, v = p.v, day = A.dayById(t, v.day);
  if(!day) return null;
  var head = h(A.PageHead, {title: "Tarihler", desc: A.isPhone ? null : "Günü soldan seç. Kartları sürükleyerek sırala; çıkardıkların sağdaki kenar listesine gider.",
    right: h(T.Tabs, {key: v.mode, label: "Görünüm", value: v.mode, items: [{label: "Kartlar", icon: "list"}, {label: "Saatler", icon: "timeline"}], onChange: function(l){ v.mode = l; A.saveViews(); A.render(); }})});
  var strip = A.isPhone ? h("div", {className: "app-daystrip", role: "tablist", "aria-label": "Günler"}, t.days.map(function(d){
    var dt = D.parseISO(d.date);
    return h(T.DayTab, {key: d.id, date: String(dt.getUTCDate()), weekday: D.WDS[dt.getUTCDay()], compact: true, selected: d.id === v.day, onClick: function(){ selectDay(t, d.id); }});
  })) : null;
  var empty = !day.items.length;
  var list = empty
    ? h("div", {className: "app-card"}, h(T.EmptyState, {illustration: "ideas", size: "sm", headingLevel: 3, title: "Bu gün henüz boş", text: t.ideas.length + t.removed.length ? "Kenar listesindeki bir yeri ekleyebilir ya da yeni plan yazabilirsin." : "İlk planı ekleyerek başla."},
        h(T.Button, {variant: "primary", icon: "plus", onClick: function(){ S.dialog = {kind: "plan", newIn: day.id}; A.render(); }}, "Plan ekle")))
    : (v.mode === "Saatler" ? h(HoursList, {t: t, day: day}) : h(PlanList, {t: t, day: day}));
  var main = h(F, null, strip, h(DayHead, {t: t, day: day}), list,
    empty ? null : h("div", {className: "app-row"}, h(T.Button, {variant: "outline", icon: "plus", onClick: function(){ S.dialog = {kind: "plan", newIn: day.id}; A.render(); }}, "Plan ekle"),
      h(T.Button, {variant: "ghost", icon: "route", href: A.href("ulasim")}, "Bu günün ulaşımı")));
  if(!A.isPhone && !v.panel){
    return h(A.Layout, {head: head}, h("div", {className: "app-withtoggle"}, h("div", {className: "app-colmain"}, main),
      h(T.SidePanel, {open: false, title: "Kenar listesi", count: t.removed.length + t.ideas.length || undefined, onToggle: function(){ v.panel = true; A.saveViews(); A.render(); }})));
  }
  return h(A.Layout, {head: head, aside: h(SideList, {t: t, v: v}), asideLabel: "Kenar listesi"}, main);
}

function Submenu(t){
  var v = A.view();
  var planned = t.days.filter(function(d){ return d.items.length; });
  var emptyDays = t.days.filter(function(d){ return !d.items.length; });
  var items = planned.map(function(d){
    var f = D.fmtDay(d.date);
    return h(T.NavItem, {key: d.id, mark: String(A.dayIndex(t, d.id) + 1), label: f.short + " " + D.WDS[D.parseISO(d.date).getUTCDay()], sub: A.dayTitle(t, d), active: S.page === "tarihler" && v.day === d.id, href: "#", onClick: function(){ selectDay(t, d.id); }});
  });
  if(emptyDays.length){
    items.push(h(T.NavItem, {key: "_add", icon: S.showEmpty ? "chevron-up" : "plus", label: "Güne plan ekle", sub: emptyDays.length + " boş gün", href: "#", onClick: function(){ S.showEmpty = !S.showEmpty; A.render(); }}));
    if(S.showEmpty) emptyDays.forEach(function(d){
      var f = D.fmtDay(d.date);
      items.push(h(T.NavItem, {key: "e" + d.id, mark: String(A.dayIndex(t, d.id) + 1), label: f.short + " " + D.WDS[D.parseISO(d.date).getUTCDay()], sub: d.night || "Boş gün", active: S.page === "tarihler" && v.day === d.id, href: "#", onClick: function(){ S.showEmpty = false; selectDay(t, d.id); }}));
    });
  }
  return h(A.Submenu, {title: "Planlı günler"}, items);
}
A.pages.tarihler = {view: Tarihler, submenu: Submenu};
})();
