/* Plan (eski adıyla Tarihler): gün başlığı, planlar (kartlar / saatler), kenar listesi. */
(function(){
"use strict";
var A = window.TPA, D = A.D, T = A.T, h = A.h, F = A.F, S = A.S;

function selectDay(t, id){ var v = A.view(); v.day = id; A.saveViews(); S.dayEdit = false; if(S.page !== "tarihler") A.go("tarihler"); else A.render(); }
A.selectDay = selectDay;

function removeToSide(t, id){
  var snap = A.snapshot(), it = t.items[id];
  A.moveItem(t, id, "removed", 0);
  A.commit();
  A.flash("“" + (it.title || "Plan") + "” " + (A.isPhone ? "Fikirler'e" : "kenar listesine") + " taşındı.", function(){ A.restore(snap); });
}
function addToDay(t, id, dayId){
  var snap = A.snapshot(), it = t.items[id];
  A.moveItem(t, id, dayId, "time");
  A.log(t, "plan", id, "“" + (it.title || "Plan") + "” planını " + A.dayLabel(t, dayId) + " gününe koydu");
  A.commit();
  A.flash("“" + (it.title || "Plan") + "” " + A.dayLabel(t, dayId) + " planına eklendi.", function(){ A.restore(snap); });
}
A.addToDay = addToDay;
/* öneriyi plana koymadan önce gün ve saati sor */
function askTime(id, dayId){ S.dialog = {kind: "idea-add", id: id, day: dayId}; A.render(); }
A.askTime = askTime;

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

/* Sıradaki adım: şu an süren ya da ilk yaklaşan saatli plan */
A.nextPlan = function(t){
  var now = Date.now();
  for(var i = 0; i < t.days.length; i++){
    var d = t.days[i];
    for(var j = 0; j < d.items.length; j++){
      var it = t.items[d.items[j]]; if(!it) continue;
      var s = A.timeAt(d.date, it.time); if(s === null) continue;
      var e = s + (A.durMin(it.duration) || 60) * 6e4;
      if(e > now) return {id: it.id, day: d.id, start: s, end: e};
    }
  }
  return null;
};
function whenText(n){
  var now = Date.now(); if(n.start <= now) return "Şimdi";
  var min = Math.round((n.start - now) / 6e4);
  if(min < 60) return min + " dk sonra";
  if(min < 24 * 60) return Math.round(min / 60) + " saat sonra";
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var days = Math.round((new Date(n.start).setHours(0, 0, 0, 0) - today.getTime()) / 864e5);
  return days === 1 ? "Yarın" : days + " gün sonra";
}
function NextTag(p){ return h("div", {className: "app-nexttag"}, h(T.Chip, {tone: "primary", icon: "clock"}, "Sıradaki · " + whenText(p.n))); }
/* Sıradaki kartın koyu, çizgili, ışıklı zemini (bilet kartıyla aynı dil) */
A.Glow = function(){ return h("span", {className: "app-glow", "aria-hidden": "true"}); };

var DS_CAT = {food: ["food", "amber"], history: ["landmark", "wine"], museum: ["museum", "violet"], walk: ["walk", "green"], shopping: ["bag", "teal"], stay: ["bed", null], event: ["confetti", "blue"], transit: ["bus", null]};
/* Telefonda plan kartı, Ulaşım'daki biletle aynı davranır: kartın tamamına dokununca seçilir,
   altında ayrıntı, Düzenle ve ⋯ açılır; yeniden dokununca kapanır. */
function PhonePlanCard(p){
  var it = p.it, id = it.id, open = !!p.open, nx = p.next;
  var title = it.title || "Adsız plan", ds = DS_CAT[D.CAT_TO_DS[it.cat]] || ["dot", null];
  var items = [it.link ? {label: "Bilgi", icon: "external", onClick: function(){ window.open(it.link, "_blank", "noopener"); }} : null,
    it.cat === "ulasim" ? {label: "Ulaşımdaki karta git", icon: "ticket", onClick: function(){ var v = A.view(); v.transit = id; A.saveViews(); A.go("ulasim"); }} : null,
    A.chatApi && A.chatApi() ? {label: "Sohbette bahset", icon: "share", onClick: function(){ A.openChat({k: "plan", id: id, l: D.str(title, 80)}); }} : null,
    {label: "Plandan çıkar", icon: "close", description: "Fikirler listesine gider", onClick: p.onRemove}];
  function stop(e){ e.stopPropagation(); }
  return h("article", {className: "app-pcard" + (open ? " is-open" : "") + (nx ? " is-next" : "") + (it.critical ? " is-critical" : ""), "data-id": id,
      role: "button", tabIndex: 0, "aria-expanded": open ? "true" : "false", onClick: p.onToggle,
      onKeyDown: function(e){ if(e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); p.onToggle(); } }},
    nx ? h(A.Glow) : null,
    h("div", {className: "app-pcard__row"},
      h("button", {type: "button", className: "tp-card__handle", "aria-label": "Sürükleyerek taşı: " + title, onClick: stop}, h(T.Icon, {name: "grip", size: 18})),
      h("span", {className: "app-pcard__text"},
        h("span", {className: "app-pcard__title body-strong"}, title),
        nx ? h("span", {className: "app-pcard__when"}, h(T.Chip, {tone: "primary", icon: "clock"}, "Sıradaki · " + whenText(nx))) : null)),
    h(A.Expand, {open: open},
      h("div", {className: "app-pcard__pad"},
        it.note ? h("p", {className: "app-pcard__note body-sm"}, it.note) : null,
        h("div", {className: "app-pcard__meta body-sm"},
          h(T.Chip, {icon: ds[0], category: ds[1]}, D.CATS[it.cat]),
          p.extra ? h("span", {className: "app-pcard__extra"}, h(T.Icon, {name: "cash", size: 16}), p.extra) : null,
          it.critical ? h("span", {className: "app-pcard__extra is-warn"}, h(T.Icon, {name: "warning", size: 16}), "Kesin saat") : null),
        h("div", {className: "app-ticket__acts", onClick: stop},
          h(T.Button, {size: "sm", icon: "edit", onClick: function(){ S.dialog = {kind: "plan", id: id}; A.render(); }}, "Düzenle"),
          h(A.MoreMenu, {ariaLabel: "Diğer seçenekler: " + title, size: "sm", variant: "outline", menuWidth: "240px", items: items})))));
}

function PlanList(p){
  var t = p.t, day = p.day, ref = React.useRef(null);
  useSortable(ref, function(from, to){
    var ids = day.items.filter(function(id){ return t.items[id]; });
    var moved = ids.splice(from, 1)[0]; ids.splice(to, 0, moved); day.items = ids; A.commit();
  }, [day.id, day.items.length]);
  var ids = day.items.filter(function(id){ return t.items[id]; }), nx = A.nextPlan(t);
  return h("div", {className: "app-plans" + (A.isPhone ? " is-flow" : ""), ref: ref}, ids.map(function(id){
    var it = t.items[id], dsCat = D.CAT_TO_DS[it.cat];
    var extra = it.cat === "ulasim" && it.priceAmount ? A.money(t, it.priceAmount, it.priceCur) : null;
    var exp = t.expenses.filter(function(e){ return e.ref === id && e.source === "plan"; });
    if(!extra && exp.length) extra = exp.map(function(e){ return D.fmtMoney(e.amount, e.currency); }).join(" + ");
    if(A.isPhone){
      /* saat kartın dışında, soldaki akışta: saat + dilim, nokta ve çizgi */
      var isNext = nx && nx.id === id, tm = /^(~?\s*\d{1,2}[:.]\d{2})\s*(.*)$/.exec(it.time || "");
      return h("div", {key: id, className: "app-prow" + (isNext ? " is-next" : "") + (S.planOpen === id ? " is-open" : "") + (it.critical ? " is-critical" : "")},
        h("div", {className: "app-prow__time"},
          h("span", {className: "app-prow__t"}, tm ? tm[1].replace(/\s+/g, "") : (it.time ? "" : "—")),
          tm && tm[2] ? h("span", {className: "app-prow__z"}, tm[2]) : (!tm && it.time ? h("span", {className: "app-prow__z"}, it.time) : null),
          h("span", {className: "app-prow__dot", "aria-hidden": "true"})),
        h(A.Swipe, {label: "Çıkar", icon: "close", radius: "var(--radius-card)", onAction: function(){ if(S.planOpen === id) S.planOpen = null; removeToSide(t, id); }},
          h(PhonePlanCard, {it: it, extra: extra, next: isNext ? nx : null, open: S.planOpen === id,
            onToggle: function(){ S.planOpen = S.planOpen === id ? null : id; A.render(); },
            onRemove: function(){ if(S.planOpen === id) S.planOpen = null; removeToSide(t, id); }})));
    }
    return h(T.PlanCard, {key: id, dataId: id, time: it.time || "—", title: it.title || "Adsız plan", note: it.note, category: dsCat,
      categoryLabel: D.CATS[it.cat], link: it.link ? "Bilgi" : undefined, href: it.link || undefined, extra: extra || (it.critical ? "Kesin saat" : undefined), extraIcon: extra ? "cash" : (it.critical ? "warning" : undefined),
      critical: it.critical, compact: A.isPhone, selected: nx && nx.id === id,
      onEdit: function(){ S.dialog = {kind: "plan", id: id}; A.render(); },
      onRemove: function(){ removeToSide(t, id); }}, nx && nx.id === id ? h(F, null, h(A.Glow), h(NextTag, {n: nx})) : null);
  }));
}

function HoursList(p){
  var t = p.t, ids = p.day.items.filter(function(id){ return t.items[id]; }), nx = A.nextPlan(t);
  return h("div", {className: "app-hours"}, ids.map(function(id, i){
    var it = t.items[id], next = ids[i + 1] ? t.items[ids[i + 1]] : null;
    var m = /(\d{1,2}[:.]\d{2})/.exec(it.time || ""), n = next && /(\d{1,2}[:.]\d{2})/.exec(next.time || "");
    return h("div", {key: id, className: "app-hours__row" + (nx && nx.id === id ? " is-next" : "")},
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

/* Telefonda: gün çipleri + görünüm düğmesi tek satırda, gün başlığı iki satırda */
function PhoneDayBar(p){
  var t = p.t, v = p.v, ref = React.useRef(null);
  React.useEffect(function(){
    var el = ref.current && ref.current.querySelector(".is-on"); if(!el) return;
    var box = ref.current, l = el.offsetLeft - 8, r = el.offsetLeft + el.offsetWidth + 8;
    if(l < box.scrollLeft) box.scrollTo({left: l, behavior: "smooth"}); else if(r > box.scrollLeft + box.clientWidth) box.scrollTo({left: r - box.clientWidth, behavior: "smooth"});
  }, [v.day]);
  var mode = v.mode === "Saatler" ? "Saatler" : "Kartlar";
  function setMode(m){ v.mode = m; A.saveViews(); A.render(); }
  return h(F, null,
    h("div", {ref: ref, className: "app-daychips", role: "tablist", "aria-label": "Günler"}, t.days.map(function(d){
      var dt = D.parseISO(d.date), on = d.id === v.day;
      return h("button", {key: d.id, type: "button", role: "tab", "aria-selected": on ? "true" : "false", className: "app-daychip" + (on ? " is-on" : "") + (d.items.length ? "" : " is-empty"),
        onClick: function(){ selectDay(t, d.id); }}, dt.getUTCDate() + " ", h("small", null, D.WDS[dt.getUTCDay()]));
    })),
    h("span", {className: "app-vdiv", "aria-hidden": "true"}),
    h("div", {className: "app-seg", role: "group", "aria-label": "Görünüm"},
      h("button", {type: "button", "aria-pressed": mode === "Kartlar" ? "true" : "false", "aria-label": "Kartlar", title: "Kartlar", onClick: function(){ setMode("Kartlar"); }}, h(T.Icon, {name: "list", size: 18})),
      h("button", {type: "button", "aria-pressed": mode === "Saatler" ? "true" : "false", "aria-label": "Saatler", title: "Saatler", onClick: function(){ setMode("Saatler"); }}, h(T.Icon, {name: "timeline", size: 18}))));
}
function DayLine(p){
  var t = p.t, day = p.day, f = D.fmtDay(day.date), night = (day.night || "").replace(/^Gece:\s*/, "");
  return h("div", {className: "app-dayline"},
    h("div", {style: {flex: 1, minWidth: 0}},
      h("h2", {className: "heading app-dayline__t"}, A.dayTitle(t, day)),
      h("p", {className: "body-sm app-muted app-dayline__s"}, h("span", {className: "app-nowrap"}, f.short + " " + f.wd),
        night ? h("span", {className: "app-dayline__night"}, h(T.Icon, {name: /dönüş|uçuş/i.test(night) ? "plane" : "bed", size: 14}), h("span", null, night)) : null)),
    h(T.IconButton, {icon: "edit", label: "Günü düzenle", size: "sm", onClick: function(){ S.dayEdit = true; A.render(); }}));
}

/* Telefonda alt bölmenin küçük hali: yana kayan fikirler */
function IdeaStrip(p){
  var t = p.t, v = p.v, ids = t.removed.concat(t.ideas).filter(function(id){ return t.items[id]; });
  if(!ids.length) return h(F, null, h("p", {className: "body-sm app-muted", style: {margin: 0}}, "Kenar listen boş. Gitmek istediğin ama güne koymadığın yerleri buraya yaz."),
    h("div", {style: {marginTop: "var(--space-2)"}}, h(T.Button, {size: "sm", icon: "plus", onClick: function(){ S.dialog = {kind: "plan", newIn: "ideas"}; A.render(); }}, "Öneri ekle")));
  return h(F, null,
    h("div", {className: "app-ideastrip", role: "list", "aria-label": "Kenar listesi"}, ids.slice(0, 20).map(function(id){
      var it = t.items[id], target = it.from && A.dayById(t, it.from) ? it.from : v.day;
      return h("div", {key: id, role: "listitem", className: "app-ideachip"},
        h("span", {className: "app-ideachip__t"}, it.title || "Adsız"),
        h("span", {className: "app-ideachip__n"}, it.note || D.CATS[it.cat] || ""),
        h("button", {type: "button", className: "app-ideachip__add", onClick: function(){ askTime(id, target); }}, h(T.Icon, {name: "plus", size: 14}), A.dayLabel(t, target) + " planına"));
    })),
    h("p", {className: "app-peekline"}, (t.removed.length ? t.removed.length + " çıkardığın · " : "") + t.ideas.length + " öneri · yukarı çekince arama ve tamamı"));
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
      onAdd: function(){ askTime(id, target); }, onPick: function(i){ askTime(id, t.days[i].id); },
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
  var head = h(A.PageHead, {title: "Plan", desc: A.isPhone ? null : "Günü soldan seç. Kartları sürükleyerek sırala; çıkardıkların sağdaki kenar listesine gider.",
    phoneRight: h(PhoneDayBar, {t: t, v: v}),
    right: h(T.Tabs, {key: v.mode, label: "Görünüm", value: v.mode, items: [{label: "Kartlar", icon: "list"}, {label: "Saatler", icon: "timeline"}], onChange: function(l){ v.mode = l; A.saveViews(); A.render(); }})});
  var strip = null;
  var empty = !day.items.length;
  var list = empty
    ? h("div", {className: "app-card"}, h(T.EmptyState, {illustration: "ideas", size: "sm", headingLevel: 3, title: "Bu gün henüz boş", text: t.ideas.length + t.removed.length ? "Kenar listesindeki bir yeri ekleyebilir ya da yeni plan yazabilirsin." : "İlk planı ekleyerek başla."},
        h(T.Button, {variant: "primary", icon: "plus", onClick: function(){ S.dialog = {kind: "plan", newIn: day.id}; A.render(); }}, "Plan ekle")))
    : (v.mode === "Saatler" ? h(HoursList, {t: t, day: day}) : h(PlanList, {t: t, day: day}));
  var main = h(F, null, strip, A.isPhone && !S.dayEdit ? h(DayLine, {t: t, day: day}) : h(DayHead, {t: t, day: day}), list,
    empty ? null : h("div", {className: "app-row"}, h(T.Button, {variant: "outline", icon: "plus", onClick: function(){ S.dialog = {kind: "plan", newIn: day.id}; A.render(); }}, "Plan ekle"),
      h(T.Button, {variant: "ghost", icon: "route", href: A.href("ulasim")}, "Bu günün ulaşımı")));
  if(!A.isPhone && !v.panel){
    return h(A.Layout, {head: head}, h("div", {className: "app-withtoggle"}, h("div", {className: "app-colmain"}, main),
      h(T.SidePanel, {open: false, title: "Kenar listesi", count: t.removed.length + t.ideas.length || undefined, onToggle: function(){ v.panel = true; A.saveViews(); A.render(); }})));
  }
  var n = t.removed.length + t.ideas.length;
  return h(A.Layout, {head: head, aside: h(SideList, {t: t, v: v}), asideLabel: "Kenar listesi",
    pane: A.isPhone ? {id: "plan", label: "Kenar listesi", fab: {icon: "sparkle", label: "Fikirler", count: n || null, aria: "Kenar listesi, " + n + " fikir"},
      peek: h(IdeaStrip, {t: t, v: v}), full: h(SideList, {t: t, v: v})} : null}, main);
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
