/* Hazırlık: gruplu kontrol listesi, sağ kartta madde ekleme. */
(function(){
"use strict";
var A = window.TPA, D = A.D, T = A.T, h = A.h, F = A.F, S = A.S;
var ART = {belge: ["documents", "blue"], konaklama: ["night", "violet"], ulasim: ["route", "teal"], canta: ["packing", "amber"]};
var DESC = {belge: "Kimlik, sigorta, harç: sınırda istenenler.", konaklama: "Uçak ve kalacak yerler.", ulasim: "Önceden ayarlanacak yolculuklar ve rezervasyonlar.", canta: "Yanına alacakların ve uygulamalar."};

function CheckForm(p){
  var t = p.t, c = p.item;
  var st = React.useState(c ? {group: c.group, title: c.title, note: c.note, link: c.link, due: c.due || ""} : {group: p.group || "belge", title: "", note: "", link: "", due: ""});
  var f = st[0], set = function(k, v){ var n = Object.assign({}, f); n[k] = v; st[1](n); };
  var err = React.useState("");
  function save(e){
    e.preventDefault();
    if(!f.title.trim()){ err[1]("Maddenin adını yaz."); return; }
    var link = f.link.trim() ? D.safeLink(/^https?:/i.test(f.link.trim()) ? f.link.trim() : "https://" + f.link.trim()) : "";
    if(c){ c.group = f.group; c.title = D.str(f.title.trim(), 160); c.note = D.str(f.note, 600); c.link = link; c.due = f.due; }
    else { var n = {id: D.uid("k"), group: f.group, title: D.str(f.title.trim(), 160), note: D.str(f.note, 600), link: link, done: false, due: f.due}; t.checklist.push(n); S.justAdded = n.id; }
    A.commit(); A.flash(c ? "Madde güncellendi." : "“" + f.title.trim() + "” eklendi.");
    if(c || p.onDone) (p.onDone || function(){})(); else st[1]({group: f.group, title: "", note: "", link: "", due: ""});
  }
  return h("form", {className: "app-stack", onSubmit: save},
    h(T.Select, {label: "Grup", value: f.group, options: D.GROUPS.map(function(g){ return {label: g[1], value: g[0]}; }), onChange: function(v){ set("group", v); }}),
    h(T.TextField, {label: "Madde", value: f.title, placeholder: "Örn. Seyahat sağlık sigortası", onChange: function(v){ set("title", v); err[1](""); }, error: err[0] || undefined, autoFocus: !!c}),
    h(T.TextField, {label: "Not", optional: true, multiline: true, rows: 2, value: f.note, onChange: function(v){ set("note", v); }}),
    h(T.TextField, {label: "Bağlantı", optional: true, value: f.link, placeholder: "https://", onChange: function(v){ set("link", v); }}),
    h(A.Field, {label: "Son gün", optional: true, type: "date", value: f.due, max: t.start, onChange: function(v){ set("due", v); }}),
    h("div", {className: "app-row"},
      c ? h(T.Button, {variant: "ghost", onClick: p.onDone}, "Vazgeç") : null,
      h(T.Button, {variant: "primary", icon: c ? "check" : "plus", type: "submit", full: !c}, c ? "Kaydet" : "Ekle")));
}
A.CheckForm = CheckForm;

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
        return h(T.ChecklistItem, {key: c.id, title: c.title || "Adsız madde", note: [due ? "Son gün " + due : "", c.note].filter(Boolean).join(" · "), checked: c.done,
          link: c.link ? "Bilgi" : undefined, href: c.link || undefined,
          onToggle: function(v){ c.done = v; A.commit(); },
          onEdit: function(){ S.dialog = {kind: "check", id: c.id}; A.render(); },
          onRemove: function(){ var snap = A.snapshot(); t.checklist.splice(t.checklist.indexOf(c), 1); A.commit(); A.flash("“" + c.title + "” silindi.", function(){ A.restore(snap); }); }});
      }));
  });
  var body = total ? h("div", {className: "app-groups"}, groups)
    : h("div", {className: "app-card"}, h(T.EmptyState, {illustration: "packing", title: "Hazırlık listen boş", text: "Sağdaki karttan ilk maddeyi ekle."}));
  var aside = h(F, null,
    h("div", null, h("h2", {className: "heading", style:{margin:0}}, "Madde ekle"), h("p", {className: "body-sm app-muted", style:{margin:0}}, "Belge, rezervasyon ya da çantaya girecek bir şey.")),
    h(CheckForm, {t: t, key: "new"}));
  return h(A.Layout, {head: head, aside: aside, asideLabel: "Madde ekle", phoneAside: false}, body,
    A.isPhone ? h(T.Button, {variant: "primary", icon: "plus", full: true, onClick: function(){ S.dialog = {kind: "check", group: "belge"}; A.render(); }}, "Madde ekle") : null);
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
