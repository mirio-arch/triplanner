/* Hazırlık: gruplu kontrol listesi, sağ kartta madde ekleme. */
(function(){
"use strict";
var A = window.TPA, D = A.D, T = A.T, h = A.h, F = A.F, S = A.S;
var ART = {belge: ["documents", "blue"], konaklama: ["night", "violet"], ulasim: ["route", "teal"], canta: ["packing", "amber"]};
var DESC = {belge: "Kimlik, sigorta, harç: sınırda istenenler.", konaklama: "Uçak ve kalacak yerler.", ulasim: "Önceden ayarlanacak yolculuklar ve rezervasyonlar.", canta: "Yanına alacakların ve uygulamalar."};

function CheckForm(p){
  var t = p.t, c = p.item;
  var st = React.useState(c ? {group: c.group, title: c.title, note: c.note, link: c.link, due: c.due || ""} : {group: p.group || "belge", title: "", note: "", link: "", due: ""});
  var f = st[0], set = function(k, v){ A.markDirty(); var n = Object.assign({}, f); n[k] = v; st[1](n); };
  var err = React.useState("");
  function save(e){
    e.preventDefault();
    if(!f.title.trim()){ err[1]("Maddenin adını yaz."); return; }
    var link = f.link.trim() ? D.safeLink(/^https?:/i.test(f.link.trim()) ? f.link.trim() : "https://" + f.link.trim()) : "";
    if(c){ c.group = f.group; c.title = D.str(f.title.trim(), 160); c.note = D.str(f.note, 600); c.link = link; c.due = f.due; }
    else { var n = A.stamp({id: D.uid("k"), group: f.group, title: D.str(f.title.trim(), 160), note: D.str(f.note, 600), link: link, done: false, due: f.due}); delete n.at; t.checklist.push(n); S.justAdded = n.id;
      A.log(t, "check", n.id, "“" + n.title + "” maddesini hazırlık listesine ekledi"); }
    A.commit(); A.flash(c ? "Madde güncellendi." : "“" + f.title.trim() + "” eklendi.");
    if(c || p.onDone) (p.onDone || function(){})(); else st[1]({group: f.group, title: "", note: "", link: "", due: ""});
  }
  return h("form", {className: "app-stack", onSubmit: save},
    h(A.Select, {label: "Grup", value: f.group, options: D.GROUPS.map(function(g){ return {label: g[1], value: g[0]}; }), onChange: function(v){ set("group", v); }}),
    h(T.TextField, {label: A.req("Madde"), value: f.title, placeholder: "Örn. Seyahat sağlık sigortası", onChange: function(v){ set("title", v); err[1](""); }, error: err[0] || undefined, autoFocus: !!c && !A.isPhone}),
    h(T.TextField, {label: "Not", optional: true, multiline: true, rows: 2, value: f.note, onChange: function(v){ set("note", v); }}),
    h(T.TextField, {label: "Bağlantı", optional: true, value: f.link, placeholder: "https://", onChange: function(v){ set("link", v); }}),
    h(A.DateField, {label: "Son gün", value: f.due, max: t.start, month: f.due || A.todayISO(), onChange: function(v){ set("due", v); }}),
    h("div", {className: "app-row app-stickyfoot" + (A.isPhone ? " app-foot--phone" : "")},
      c ? h(T.Button, {variant: A.isPhone ? "outline" : "ghost", onClick: p.onDone}, "Vazgeç") : null,
      h(T.Button, {variant: "primary", icon: c ? "check" : "plus", type: "submit", full: !c}, c ? "Kaydet" : "Ekle")));
}
A.CheckForm = CheckForm;

/* Telefonda alt bölmenin küçük hali: tek satırda madde ekle */
var GICON = {belge: "passport", konaklama: "bed", ulasim: "route", canta: "suitcase"};
var GSHORT = {belge: "Belgeler", konaklama: "Konaklama", ulasim: "Rezervasyon", canta: "Çanta"};
function QuickCheck(p){
  var t = p.t, st = React.useState(""), g = React.useState(p.group || S.quickGroup || "belge");
  function add(e){
    e.preventDefault(); var title = st[0].trim(); if(!title) return;
    var n = A.stamp({id: D.uid("k"), group: g[0], title: D.str(title, 160), note: "", link: "", done: false, due: ""}); delete n.at;
    t.checklist.push(n); A.log(t, "check", n.id, "“" + n.title + "” maddesini hazırlık listesine ekledi"); S.justAdded = n.id; S.quickGroup = g[0]; A.commit(); st[1]("");
    A.flash("“" + title + "” eklendi.");
  }
  return h("form", {onSubmit: add},
    h("div", {className: "app-quick"},
      h("input", {className: "app-quick__in", value: st[0], placeholder: "Madde ekle…", "aria-label": "Yeni madde", enterKeyHint: "done", onChange: function(e){ st[1](e.target.value); }}),
      h("button", {type: "submit", className: "app-quick__go", "aria-label": "Ekle", disabled: !st[0].trim()}, h(T.Icon, {name: "plus", size: 20}))),
    h("div", {className: "app-grouptiles", role: "group", "aria-label": "Grup"}, D.GROUPS.map(function(x){
      return h("button", {key: x[0], type: "button", className: "app-grouptile", "aria-pressed": g[0] === x[0] ? "true" : "false", "aria-label": x[1], onClick: function(){ g[1](x[0]); }},
        h(T.Icon, {name: GICON[x[0]] || "checklist", size: 22}), h("span", null, GSHORT[x[0]] || x[1]));
    })));
}

function setDone(t, c, on){
  c.done = on;
  if(on){ var w = A.who(); if(w.by){ c.doneBy = w.by; c.doneByName = w.name; } A.log(t, "done", c.id, "“" + c.title + "” maddesini tamamladı"); }
  else { delete c.doneBy; delete c.doneByName; }
  A.commit();
}
function noteOf(c){ var due = c.due ? D.fmtDay(c.due).short : "", who = c.done && c.doneBy && !A.isMine(c.doneBy) ? (c.doneByName || "Biri") + " tamamladı" : "";
  return [who, due ? "Son gün " + due : "", c.note].filter(Boolean).join(", "); }
function removeItem(t, c){ var snap = A.snapshot(); t.checklist.splice(t.checklist.indexOf(c), 1); A.commit(); A.flash("“" + c.title + "” silindi.", function(){ A.restore(snap); }); }
/* Telefonda madde satırı: düzenleme seçenekleri üç nokta menüsünde, içerik sıkışmasın */
function CheckRow(p){
  var t = p.t, c = p.c, id = "ci-" + c.id, note = noteOf(c);
  var items = [c.link ? {label: "Bilgi", icon: "external", onClick: function(){ window.open(c.link, "_blank", "noopener"); }} : null,
    {label: "Düzenle", icon: "edit", onClick: function(){ S.dialog = {kind: "check", id: c.id}; A.render(); }},
    A.chatApi && A.chatApi() ? {label: "Sohbette bahset", icon: "share", onClick: function(){ A.openChat({k: "check", id: c.id, l: D.str(c.title, 80)}); }} : null,
    {label: "Sil", icon: "trash", danger: true, onClick: function(){ removeItem(t, c); }}].filter(Boolean);
  return h(A.Swipe, {radius: "var(--radius-card)", onAction: function(){ removeItem(t, c); }}, h("div", {className: "tp-checkitem app-checkrow" + (c.done ? " is-done" : "")},
    h("input", {id: id, type: "checkbox", className: "tp-check__input", checked: !!c.done, onChange: function(e){ setDone(t, c, e.target.checked); }}),
    h("label", {htmlFor: id, className: "tp-checkitem__main"},
      h("span", {className: "tp-check__box", "aria-hidden": "true"}, h(T.Icon, {name: "check", size: 14, strokeWidth: 2.5})),
      h("span", {className: "tp-check__text"}, h("span", {className: "body-strong tp-checkitem__title"}, c.title || "Adsız madde"), note ? h("span", {className: "body-sm tp-muted"}, note) : null)),
    h("div", {className: "tp-checkitem__actions"}, h(A.MoreMenu, {ariaLabel: "Seçenekler: " + (c.title || ""), size: "sm", menuWidth: "240px", items: items}))));
}
/* Telefonda grup kartı: dokununca grubun sayfası açılır */
function GroupCard(p){
  var g = p.g, items = p.items, gd = items.filter(function(c){ return c.done; }).length, next = items.find(function(c){ return !c.done; });
  return h("a", {href: A.href("hazirlik", g[0]), className: "app-gcard", style: {"--sc-bg": "var(--category-" + ART[g[0]][1] + "-weak)", "--sc-solid": "var(--category-" + ART[g[0]][1] + ")"}},
    h("span", {className: "app-gcard__art", "aria-hidden": "true"}, h(T.Illustration, {name: ART[g[0]][0], animated: false})),
    h("span", {className: "app-gcard__body"},
      h("span", {className: "heading app-gcard__title"}, g[1]),
      h("span", {className: "app-gcard__meta"}, h("span", {className: "time"}, gd + "/" + items.length),
        h("span", {className: "tp-scard__track"}, h("span", {className: "tp-scard__fill", style: {transform: "scaleX(" + (items.length ? gd / items.length : 0) + ")"}}))),
      h("span", {className: "body-sm app-muted app-ellipsis"}, next ? "Sıradaki: " + next.title : "Hepsi tamam")),
    h(T.Icon, {name: "chevron-right", size: 20, className: "app-gcard__chev"}));
}
function PhoneGroup(p){
  var t = p.t, g = p.g, items = t.checklist.filter(function(c){ return c.group === g[0]; }), gd = items.filter(function(c){ return c.done; }).length;
  return h(F, null,
    h("p", {className: "body-sm app-muted", style: {margin: "0 var(--space-1)"}}, DESC[g[0]]),
    items.length ? h("div", {className: "app-checklist"}, items.map(function(c){ return h(CheckRow, {key: c.id, t: t, c: c}); }))
      : h("div", {className: "app-card"}, h(T.EmptyState, {illustration: ART[g[0]][0], size: "sm", title: "Bu grup boş", text: "Alttaki düğmeden ilk maddeyi ekle."})),
    gd && gd === items.length ? h("p", {className: "body-sm app-muted", style: {margin: "0 var(--space-1)", textAlign: "center"}}, "Bu gruptaki her şey tamam.") : null);
}

function Hazirlik(p){
  var t = p.t;
  var total = t.checklist.length, done = t.checklist.filter(function(c){ return c.done; }).length;
  var head = h(A.PageHead, {title: "Hazırlık", desc: A.isPhone ? null : "Yola çıkmadan halletmen gerekenler. İşaretlediklerin tüm cihazlarda görünür.",
    right: total ? h(T.Chip, {tone: done === total ? "success" : "outline", icon: "check"}, done + " / " + total + " tamam") : null});
  var groups = D.GROUPS.map(function(g){
    var items = t.checklist.filter(function(c){ return c.group === g[0]; });
    var gd = items.filter(function(c){ return c.done; }).length;
    if(!items.length && total) return null;
    return h(T.SectionCard, {key: g[0], title: g[1], count: gd + "/" + items.length, progress: items.length ? gd / items.length : 0, description: DESC[g[0]], illustration: ART[g[0]][0], tone: ART[g[0]][1],
      footer: h(T.Button, {variant: "ghost", size: "sm", icon: "plus", onClick: function(){ S.dialog = {kind: "check", group: g[0]}; A.render(); }}, "Bu gruba ekle")},
      items.map(function(c){
        var due = c.due ? D.fmtDay(c.due).short : "";
        return h(T.ChecklistItem, {key: c.id, title: c.title || "Adsız madde", note: [due ? "Son gün " + due : "", c.note].filter(Boolean).join(", "), checked: c.done,
          link: c.link ? "Bilgi" : undefined, href: c.link || undefined,
          onToggle: function(v){ setDone(t, c, v); },
          onEdit: function(){ S.dialog = {kind: "check", id: c.id}; A.render(); },
          onRemove: function(){ var snap = A.snapshot(); t.checklist.splice(t.checklist.indexOf(c), 1); A.commit(); A.flash("“" + c.title + "” silindi.", function(){ A.restore(snap); }); }});
      }));
  });
  var gsel = A.isPhone ? D.GROUPS.find(function(g){ return g[0] === S.sub; }) : null;
  if(A.isPhone){
    groups = D.GROUPS.map(function(g){ var items = t.checklist.filter(function(c){ return c.group === g[0]; }); return items.length || !total ? h(GroupCard, {key: g[0], g: g, items: items}) : null; });
    if(gsel){
      var gi = t.checklist.filter(function(c){ return c.group === gsel[0]; });
      head = h(A.PageHead, {title: gsel[1], phoneRight: h(F, null,
        h("a", {href: A.href("hazirlik"), className: "app-back"}, h(T.Icon, {name: "chevron-left", size: 20}), h("span", null, "Hazırlık")),
        h("span", {className: "heading app-ellipsis", style: {flex: 1, minWidth: 0}}, gsel[1]),
        h(T.Chip, {tone: gi.length && gi.every(function(c){ return c.done; }) ? "success" : "outline", icon: "check"}, gi.filter(function(c){ return c.done; }).length + " / " + gi.length))});
    }
  }
  var body = gsel ? h(PhoneGroup, {t: t, g: gsel}) : total ? h("div", {className: A.isPhone ? "app-gcards" : "app-groups"}, groups)
    : h("div", {className: "app-card"}, h(T.EmptyState, {illustration: "packing", title: "Hazırlık listen boş", text: "Sağdaki karttan ilk maddeyi ekle."}));
  var aside = h(F, null,
    h("div", null, h("h2", {className: "heading", style:{margin:0}}, "Madde ekle"), h("p", {className: "body-sm app-muted", style:{margin:0}}, "Belge, rezervasyon ya da çantaya girecek bir şey.")),
    h(CheckForm, {t: t, key: "new"}));
  return h(A.Layout, {head: head, aside: aside, asideLabel: "Madde ekle", phoneAside: false,
    pane: A.isPhone ? {id: "hazirlik", label: "Madde ekle", fab: {icon: "plus", label: "Madde"}, peek: h(QuickCheck, {t: t, group: gsel ? gsel[0] : null, key: gsel ? gsel[0] : "all"}), full: aside} : null}, body);
}

function Submenu(t){
  var items = D.GROUPS.map(function(g){
    var items = t.checklist.filter(function(c){ return c.group === g[0]; }); if(!items.length) return null;
    return h(T.NavItem, {key: g[0], icon: ART[g[0]][0] === "documents" ? "passport" : (ART[g[0]][0] === "night" ? "bed" : (ART[g[0]][0] === "route" ? "route" : "suitcase")), label: g[1],
      count: items.filter(function(c){ return c.done; }).length + "/" + items.length, href: "#", onClick: function(){ var el = document.querySelector('[data-scroll]'); if(el) el.scrollTop = 0; }});
  }).filter(Boolean);
  return items.length ? h(A.Submenu, {title: "Gruplar"}, items) : null;
}
A.pages.hazirlik = {view: Hazirlik, submenu: Submenu};
})();
