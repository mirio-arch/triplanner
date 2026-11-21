/* Harcamalar (liste, özet, kategori) ve Galeri. */
(function(){
"use strict";
var A = window.TPA, D = A.D, T = A.T, h = A.h, F = A.F, S = A.S;
var SRC = {transport: ["Ulaşım’dan", "route"], plan: ["Plandan", "calendar"], check: ["Hazırlık’tan", "checklist"]};

/* ---------- Hesaplar ---------- */
function eTL(t, e){ return D.toTL(t, e.amount, e.currency); }
function inPeriod(e, period){ return period === "Yola çıkmadan" ? e.day === "pre" : (period === "Gezide" ? e.day !== "pre" : true); }
function stats(t, filter){
  var list = t.expenses.filter(filter || function(){ return true; });
  var total = 0, missing = 0, byCat = {}, byDay = {};
  list.forEach(function(e){
    var v = eTL(t, e); if(v === null){ missing++; return; }
    total += v; byCat[e.cat] = (byCat[e.cat] || 0) + v;
    var d = byDay[e.day] || (byDay[e.day] = {total: 0, n: 0, parts: {}}); d.total += v; d.n++; d.parts[e.cat] = (d.parts[e.cat] || 0) + v;
  });
  return {list: list, total: total, missing: missing, byCat: byCat, byDay: byDay};
}
A.expStats = stats;
function shares(st){
  var items = D.EXP_ORDER.filter(function(c){ return st.byCat[c] > 0; }).map(function(c){ return {color: c, value: Math.round(st.byCat[c])}; });
  items.sort(function(a, b){ return b.value - a.value; });
  var sum = items.reduce(function(a, x){ return a + x.value; }, 0) || 1, used = 0;
  /* yüzdeler toplamı 100: en büyük kalan */
  var raw = items.map(function(x){ return x.value / sum * 100; }), fl = raw.map(Math.floor), rest = 100 - fl.reduce(function(a, b){ return a + b; }, 0);
  raw.map(function(r, i){ return [r - fl[i], i]; }).sort(function(a, b){ return b[0] - a[0]; }).slice(0, rest).forEach(function(x){ fl[x[1]]++; });
  return items.map(function(x, i){ return Object.assign(x, {share: fl[i], display: D.fmtMoney(x.value, "TL")}); });
}
function rateHint(t, cur){ var r = t.rate[cur]; return r ? "1 " + cur + " = " + D.fmtNum(r, true) + " TL" : null; }
function convText(t, e){ if(e.currency === "TL") return undefined; var v = eTL(t, e); return v === null ? "kur girilmedi" : "≈ " + D.fmtMoney(Math.round(v), "TL"); }
function sortedDays(t, st){
  var ids = t.days.map(function(d){ return d.id; }).filter(function(id){ return st.byDay[id] || st.list.some(function(e){ return e.day === id; }); }).reverse();
  if(st.list.some(function(e){ return e.day === "pre"; })) ids.push("pre");
  return ids;
}
function photoOf(t, pid){ return t.photos.find(function(p){ return p.id === pid; }); }

/* ---------- Fotoğraf yükleme ---------- */
A.getAssets = function(){
  if(S.assets || S.assetsTried) return Promise.resolve(S.assets);
  if(window.TPB){ S.assets = window.TPB.assets; S.assetsTried = true; return Promise.resolve(S.assets); }
  if(!(window.claude && window.claude.use)) { S.assetsTried = true; return Promise.resolve(null); }
  return window.claude.use("assets").then(function(a){ S.assets = a; S.assetsTried = true; return a; }, function(){ S.assetsTried = true; return null; });
};
function shrink(file){
  return new Promise(function(res){
    if(!/^image\/(jpeg|png|webp|heic|heif)/i.test(file.type) || !window.createImageBitmap){ res(file); return; }
    createImageBitmap(file).then(function(bmp){
      var max = 1600, k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      if(k >= 1 && file.size < 1.5e6){ res(file); return; }
      var c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      c.toBlob(function(b){ res(b || file); }, "image/jpeg", 0.85);
    }, function(){ res(file); });
  });
}
A.shrinkImage = shrink;
A.uploadPhotos = function(t, files, meta){
  return A.getAssets().then(function(assets){
    if(!assets){ A.flash("Fotoğraf yüklenemiyor: bu görünümde yükleme izni yok."); return []; }
    return Promise.all(files.slice(0, 8).map(function(f){
      return shrink(f).then(function(b){ return assets.upload(b); }).then(function(r){
        var p = {id: D.uid("p"), asset: r.id, day: meta.day || "pre", ref: meta.ref || "", refKind: meta.refKind || "", note: "", at: new Date().toISOString()};
        t.photos.push(p); return p;
      }, function(){ return null; });
    })).then(function(ps){ ps = ps.filter(Boolean); if(ps.length < files.length) A.flash("Bazı fotoğraflar yüklenemedi."); return ps; });
  });
};

/* ---------- Harcama formu ---------- */
function blank(t, v){
  var day = A.todayDayId(t) || "pre";
  return {title: "", amount: "", currency: t.currency || "TL", cat: "food", day: day, time: "", ref: "", photos: []};
}
function ExpenseForm(p){
  var t = p.t, e = p.id ? t.expenses.find(function(x){ return x.id === p.id; }) : null;
  var item = e && e.source === "transport" ? t.items[e.ref] : null;
  var st = React.useState(function(){ return e ? {title: e.title, amount: D.fmtNum(e.amount, e.amount % 1 !== 0), currency: e.currency, cat: e.cat, day: e.day, time: e.time, ref: e.ref, photos: e.photos.slice()} : Object.assign(blank(t), p.preset || {}); });
  var f = st[0], set = function(k, v){ var n = Object.assign({}, st[0]); n[k] = v; st[1](n); };
  var err = React.useState(""), up = React.useState(false), del = React.useState(false);
  var plans = f.day !== "pre" && A.dayById(t, f.day) ? A.dayById(t, f.day).items.filter(function(id){ return t.items[id] && t.items[id].cat !== "ulasim"; }) : [];
  function onFiles(files){
    up[1](true);
    A.uploadPhotos(t, files, {day: f.day, refKind: "expense"}).then(function(ps){ up[1](false); if(ps.length){ var n = Object.assign({}, st[0]); n.photos = n.photos.concat(ps.map(function(x){ return x.id; })); st[1](n); A.commit(); } });
  }
  function save(ev){
    ev.preventDefault();
    var amount = D.parseAmount(f.amount);
    if(!amount){ err[1]("Tutarı yaz."); return; }
    var title = f.title.trim() || (f.ref && t.items[f.ref] ? t.items[f.ref].title : D.EXP_CATS[f.cat]);
    if(item){ item.priceAmount = amount; item.priceCur = f.currency; }
    var x = e || {id: D.uid("x"), source: f.ref ? "plan" : "manual", at: new Date().toISOString()};
    x.title = D.str(title, 120); x.amount = amount; x.currency = f.currency; x.cat = f.cat; x.day = f.day; x.time = D.str(f.time, 5); x.ref = f.ref || (item ? x.ref : ""); x.photos = f.photos;
    if(!item) x.source = f.ref ? "plan" : (x.source === "check" ? "check" : "manual");
    if(!e) t.expenses.push(x);
    f.photos.forEach(function(pid){ var ph = photoOf(t, pid); if(ph){ ph.ref = x.id; ph.refKind = "expense"; ph.day = f.day; } });
    S.newExp = x.id; A.commit();
    A.flash(e ? "Harcama güncellendi." : "“" + x.title + "” eklendi · " + D.fmtMoney(amount, f.currency));
    if(p.onDone) p.onDone(); else st[1](Object.assign(blank(t), {day: f.day, currency: f.currency, cat: f.cat}));
  }
  function remove(){
    var snap = A.snapshot();
    if(item){ item.noExpense = true; }
    t.expenses.splice(t.expenses.indexOf(e), 1);
    A.commit(); A.flash("Harcama silindi.", function(){ A.restore(snap); }); if(p.onDone) p.onDone();
  }
  var catOpts = D.EXP_ORDER.map(function(c){ return {label: D.EXP_CATS[c], value: c, icon: D.EXP_ICON[c]}; });
  var dayOpts = [{label: "Yola çıkmadan", value: "pre"}].concat(t.days.map(function(d){ return {label: A.dayLabel(t, d.id, true), value: d.id}; }));
  var conv = f.currency !== "TL" && D.parseAmount(f.amount) ? (t.rate[f.currency] ? "≈ " + D.fmtMoney(Math.round(D.parseAmount(f.amount) * t.rate[f.currency]), "TL") + " · " + rateHint(t, f.currency) : "Kur girilmedi; TL karşılığı için sağdaki Kur'u doldur.") : undefined;
  return h("form", {className: "app-stack", onSubmit: save},
    p.title !== false ? h("div", {className: "app-row"}, h("h2", {className: "heading", style:{margin:0, flex:1}}, e ? "Harcamayı düzenle" : "Yeni harcama"),
      p.onDone ? h(T.IconButton, {icon: "close", label: "Kapat", size: "sm", onClick: p.onDone}) : null) : null,
    item ? h("p", {className: "body-sm app-muted", style:{margin:0}}, "Bu tutar Ulaşım'daki “" + item.title + "” biletinden geliyor; değiştirirsen orada da değişir.") : null,
    h(T.PhotoInput, {label: "Fotoğraf", optional: true, photos: f.photos.map(function(pid){ var ph = photoOf(t, pid); return ph ? {src: D.photoUrl(ph.asset), alt: "Harcama fotoğrafı"} : null; }).filter(Boolean),
      hint: "Galeri’ye de eklenir. Fişi de çekebilirsin.", busy: up[0], onFiles: onFiles, onRemove: function(i){ set("photos", f.photos.filter(function(_, j){ return j !== i; })); }}),
    h(T.MoneyField, {label: "Tutar", value: f.amount, currency: f.currency, currencies: D.CURRENCIES, hint: conv, autoFocus: !e && !A.isPhone,
      onChange: function(o){ var n = Object.assign({}, st[0]); n.amount = o.value; n.currency = o.currency; st[1](n); err[1](""); }}),
    err[0] ? h("p", {className: "body-sm tp-field__error", role: "alert", style:{margin:0}}, err[0]) : null,
    item ? null : h(T.TextField, {label: "Ne için", value: f.title, placeholder: "Örn. Akşam: hinkali", onChange: function(v){ set("title", v); }}),
    item ? null : h(T.Select, {label: "Kategori", value: f.cat, options: catOpts, onChange: function(v){ set("cat", v); }}),
    item ? null : h("div", {className: "app-two"},
      h(T.Select, {label: "Gün", value: f.day, options: dayOpts, onChange: function(v){ var n = Object.assign({}, st[0]); n.day = v; n.ref = ""; st[1](n); }}),
      h(T.TextField, {label: "Saat", value: f.time, placeholder: "20:30", onChange: function(v){ set("time", v); }, maxLength: 5, inputMode: "numeric"})),
    item || !plans.length ? null : h(T.Select, {label: "Bağlı plan", optional: true, value: f.ref || "", options: [{label: "Bağlı değil", value: ""}].concat(plans.map(function(id){ var it = t.items[id]; return {label: (it.time ? it.time + " · " : "") + it.title, value: id}; })),
      hint: "Plan kartında tutar görünür.", onChange: function(v){ var n = Object.assign({}, st[0]); n.ref = v; if(v && t.items[v]){ if(!n.title) n.title = t.items[v].title; n.cat = D.CAT_TO_EXP[t.items[v].cat] || n.cat; } st[1](n); }}),
    h(T.Button, {variant: "primary", icon: e ? "check" : "plus", full: true, type: "submit"}, e ? "Kaydet" : "Ekle"),
    e ? (del[0] ? h(A.Confirm, {text: "Bu harcama silinsin mi?", onYes: remove, onNo: function(){ del[1](false); }}) : h(T.Button, {variant: "ghost", icon: "trash", full: true, onClick: function(){ del[1](true); }}, "Harcamayı sil")) : null);
}
A.ExpenseForm = ExpenseForm;

function RateBox(p){
  var t = p.t, cur = t.currency || "GEL";
  var st = React.useState(null), b = React.useState(null);
  var rate = t.rate[cur];
  return h("div", {className: "app-stack"},
    st[0] === null ? h("div", {className: "app-row"},
      h("div", {style:{flex:1, minWidth:0}}, h("span", {className: "label app-muted", style:{display:"block"}}, "Kur"),
        h("span", {className: "body-strong", style:{fontVariantNumeric:"tabular-nums"}}, rate ? "1 " + cur + " = " + D.fmtNum(rate, true) + " TL" : "Kur girilmedi"),
        h("span", {className: "body-sm app-muted", style:{display:"block"}}, rate ? "Elle girdin. " + cur + " tutarları bununla çevrilir." : cur + " harcamaların TL toplamına girmesi için kuru yaz.")),
      h(T.IconButton, {icon: "edit", label: "Kuru değiştir", size: "sm", onClick: function(){ st[1](rate ? D.fmtNum(rate, true) : ""); }}))
    : h("form", {className: "app-stack", onSubmit: function(e){ e.preventDefault(); var r = D.parseAmount(st[0]); if(r){ t.rate[cur] = r; } else delete t.rate[cur]; st[1](null); A.commit(); }},
        h(T.Select, {label: "Gezinin para birimi", value: cur, options: D.CURRENCIES.filter(function(c){ return c !== "TL"; }), onChange: function(v){ t.currency = v; A.commit(); }}),
        h(T.TextField, {label: "1 " + cur + " kaç TL?", value: st[0], placeholder: "16,00", autoFocus: true, inputMode: "decimal", onChange: function(v){ st[1](v); }}),
        h("div", {className: "app-row"}, h(T.Button, {variant: "ghost", size: "sm", onClick: function(){ st[1](null); }}, "Vazgeç"), h(T.Button, {variant: "primary", size: "sm", type: "submit"}, "Kaydet"))),
    b[0] === null ? h("div", {className: "app-row"},
      h("div", {style:{flex:1, minWidth:0}}, h("span", {className: "label app-muted", style:{display:"block"}}, "Bütçe"),
        h("span", {className: "body-strong"}, t.budget ? D.fmtMoney(t.budget, "TL") : "Bütçe girilmedi")),
      h(T.IconButton, {icon: "edit", label: "Bütçeyi değiştir", size: "sm", onClick: function(){ b[1](t.budget ? String(t.budget) : ""); }}))
    : h("form", {className: "app-stack", onSubmit: function(e){ e.preventDefault(); t.budget = Math.round(D.parseAmount(b[0])) || 0; b[1](null); A.commit(); }},
        h(T.TextField, {label: "Gezi bütçesi (TL)", value: b[0], placeholder: "36.000", autoFocus: true, inputMode: "numeric", onChange: function(v){ b[1](v); }}),
        h("div", {className: "app-row"}, h(T.Button, {variant: "ghost", size: "sm", onClick: function(){ b[1](null); }}, "Vazgeç"), h(T.Button, {variant: "primary", size: "sm", type: "submit"}, "Kaydet"))));
}

function Aside(p){
  var t = p.t, v = p.v;
  var editing = S.expEdit && t.expenses.some(function(e){ return e.id === S.expEdit; }) ? S.expEdit : null;
  var unpriced = [];
  t.days.forEach(function(d){ A.transitOf(t, d).forEach(function(id){ var it = t.items[id]; if(!it.priceAmount && !it.noExpense) unpriced.push([id, d.id]); }); });
  var recent = t.photos.slice(-3).reverse();
  return h(F, null,
    S.expOpen || editing ? h(ExpenseForm, {key: editing || "new", t: t, id: editing, preset: editing ? null : S.expPreset, onDone: function(){ S.expOpen = false; S.expEdit = null; S.expPreset = null; A.render(); }})
      : h(F, null,
        h(T.Button, {variant: "primary", icon: "plus", full: true, onClick: function(){ S.expOpen = true; S.expEdit = null; A.render(); }}, "Harcama ekle"),
        h("p", {className: "body-sm app-muted", style:{margin:0}}, "Yemeği ya da fişi çek, tutarı yaz; gün kendiliğinden bugün seçilir.")),
    h("hr", {className: "app-hr"}),
    h(RateBox, {t: t}),
    unpriced.length ? h(F, null, h("hr", {className: "app-hr"}),
      h("div", null, h("h2", {className: "heading", style:{margin:0}}, "Fiyatı girilmemiş"), h("p", {className: "body-sm app-muted", style:{margin:0}}, "Ulaşım’da fiyatı boş " + unpriced.length + " yolculuk. Girersen buraya eklenir.")),
      unpriced.slice(0, 5).map(function(x){
        var it = t.items[x[0]];
        return h("div", {key: x[0], className: "app-tile"},
          h("span", {className: "app-weak"}, h(T.Icon, {name: A.modeOf(it) === "plane" ? "plane" : (A.modeOf(it) === "bus" ? "bus" : "car"), size: 20})),
          h("div", {style:{flex:1, minWidth:0}}, h("div", {className: "body-sm-strong app-ellipsis"}, it.title), h("div", {className: "body-sm app-muted"}, A.dayLabel(t, x[1]) + (it.time ? " · " + it.time : ""))),
          h(T.IconButton, {icon: "plus", label: "Fiyat ekle: " + it.title, variant: "outline", size: "sm", onClick: function(){ S.dialog = {kind: "transit", id: x[0], step: 2}; A.render(); }}));
      }), unpriced.length > 5 ? h(T.Button, {variant: "ghost", size: "sm", href: A.href("ulasim")}, "Tümü Ulaşım'da") : null) : null,
    recent.length ? h(F, null, h("hr", {className: "app-hr"}),
      h("div", {className: "app-row"}, h("h2", {className: "heading", style:{margin:0, flex:1}}, "Son fotoğraflar"), h(T.Button, {variant: "ghost", size: "sm", href: A.href("galeri"), iconEnd: "arrow-right"}, "Galeri")),
      h("div", {className: "app-thumbs"}, recent.map(function(ph){ return h(T.Photo, {key: ph.id, src: D.photoUrl(ph.asset), alt: "Gezi fotoğrafı", ratio: "1 / 1", href: A.href("galeri")}); }))) : null);
}

function rowFor(t, e){
  var ph = e.photos.map(function(pid){ return photoOf(t, pid); }).filter(Boolean);
  var src = SRC[e.source];
  return h(T.ExpenseRow, {key: e.id, title: e.title || D.EXP_CATS[e.cat], category: e.cat, amount: D.fmtMoney(e.amount, e.currency), converted: convText(t, e),
    time: e.time || undefined, source: src ? src[0] : undefined, sourceIcon: src ? src[1] : undefined, photoSrc: ph[0] ? D.photoUrl(ph[0].asset) : undefined, photoAlt: ph[0] ? "Harcama fotoğrafı" : undefined, photos: ph.length,
    highlighted: S.newExp === e.id, actionIcon: "edit", actionLabel: "Düzenle",
    onClick: function(){ edit(e.id); }, onMore: function(){ edit(e.id); }});
}
function edit(id){ if(A.isPhone){ S.dialog = {kind: "expense", id: id}; } else { S.expEdit = id; S.expOpen = false; } S.newExp = null; A.render(); }

function ExpenseList(p){
  var t = p.t, st = p.st;
  var days = sortedDays(t, st);
  if(!st.list.length) return h("div", {className: "app-card"}, h(T.EmptyState, {illustration: "documents", size: "sm", headingLevel: 3, title: p.emptyTitle || "Henüz harcama yok",
    text: p.emptyText || "Yemek, bilet, müze girişi: ne harcadıysan ekle. Ulaşım’da bilet fiyatı girersen kendiliğinden buraya düşer."},
    h(T.Button, {variant: "primary", icon: "plus", onClick: function(){ if(A.isPhone) S.dialog = {kind: "expense"}; else S.expOpen = true; A.render(); }}, "Harcama ekle")));
  return h("div", {className: "app-stack app-stack--lg"}, days.map(function(id){
    var items = st.list.filter(function(e){ return e.day === id; }).sort(function(a, b){ return (b.time || "").localeCompare(a.time || ""); });
    var sum = items.reduce(function(a, e){ var v = eTL(t, e); return a + (v || 0); }, 0);
    var d = A.dayById(t, id);
    return h("section", {key: id, className: "app-card app-card--list", "aria-labelledby": "ex-" + id},
      h("div", {className: "app-listhead"}, h("h3", {id: "ex-" + id, className: "body-strong", style:{flex:1, minWidth:0, margin:0}}, A.dayLabel(t, id, true),
        d ? h("span", {className: "body app-muted"}, " · " + A.dayTitle(t, d)) : h("span", {className: "body app-muted"}, " · rezervasyon ve belgeler")),
        h("span", {className: "body-sm-strong", style:{fontVariantNumeric:"tabular-nums"}}, D.fmtMoney(Math.round(sum), "TL"))),
      items.map(function(e){ return rowFor(t, e); }));
  }));
}

function periodTabs(v){ return h(T.Tabs, {key: v.period || "Tümü", label: "Dönem", value: v.period || "Tümü", items: ["Tümü", "Yola çıkmadan", "Gezide"], onChange: function(l){ v.period = l; A.saveViews(); A.render(); }}); }

function Widget(p){
  var t = p.t, st = p.st, sh = p.sh;
  var meter = t.budget ? h(T.Meter, {label: "Bütçe · " + D.fmtMoney(t.budget, "TL"), value: Math.round(st.total), max: t.budget, parts: sh.map(function(x){ return {color: x.color, value: x.value}; }),
      valueText: st.total <= t.budget ? "%" + Math.round(st.total / t.budget * 100) + " · " + D.fmtMoney(Math.round(t.budget - st.total), "TL") + " kaldı" : D.fmtMoney(Math.round(st.total - t.budget), "TL") + " aştı"})
    : h(T.Button, {variant: "secondary", size: "sm", icon: "plus", onClick: function(){ S.expOpen = false; A.flash("Bütçeyi sağdaki karttan gir."); }}, "Bütçe ekle");
  return h("section", {className: "tp-onshell tp-aurora-card app-widget", "aria-label": "Özet"},
    h("div", {className: "app-widget__top"},
      h("div", {style:{flex:"1 1 240px", minWidth:0}}, h(T.Stat, {size: "hero", label: "Toplam harcama", value: D.fmtNum(Math.round(st.total)), unit: "TL",
        sub: st.list.length + " harcama" + (t.rate[t.currency] ? " · " + t.currency + " tutarları " + rateHint(t, t.currency) + " ile" : "") + (st.missing ? " · " + st.missing + " harcamanın kuru yok" : "")})),
      h("div", {style:{flex:"1 1 260px", minWidth:0}}, meter)),
    sh.length ? h("ul", {className: "tp-legend", "aria-label": "Kategoriler"}, sh.map(function(x){
      return h("li", {key: x.color, className: "tp-legend__item body-sm", style:{color: "var(--foreground-on-shell-weak)"}}, h("span", {className: "tp-legend__key", style:{background: "var(--chart-" + x.color + ")"}}), D.EXP_CATS[x.color] + " ", h("span", {style:{color: "var(--foreground-on-shell)"}}, "%" + x.share));
    })) : null);
}

function dayItems(t, st, cat){
  return t.days.map(function(d){
    var b = st.byDay[d.id], f = D.fmtDay(d.date), future = D.parseISO(d.date).getTime() > Date.now() + 864e5 && !b;
    var val = b ? Math.round(cat ? (b.parts[cat] || 0) : b.total) : null;
    var today = A.todayDayId(t) === d.id;
    return {label: today ? "Bugün" : f.short, longLabel: f.short + " " + D.WDS[D.parseISO(d.date).getUTCDay()], sub: val ? D.fmtMoney(val, "TL") : "—", value: val || null, today: today,
      count: b ? b.n + " harcama" : "", parts: b && !cat ? D.EXP_ORDER.filter(function(c){ return b.parts[c]; }).map(function(c){ return {color: c, value: Math.round(b.parts[c])}; }) : undefined,
      tipLabel: f.short + " " + D.WDS[D.parseISO(d.date).getUTCDay()], emptyLabel: future ? "—" : "0", ariaLabel: f.short};
  });
}
function ticks(max){ var step = max > 8000 ? 4000 : (max > 4000 ? 2000 : (max > 1500 ? 1000 : 500)); var out = [0]; for(var v = step; v < max + step; v += step) out.push(v); return out; }

function Harcamalar(p){
  var t = p.t, v = p.v, sub = S.sub;
  var period = v.period || "Tümü";
  var st = stats(t, function(e){ return inPeriod(e, period); });
  var aside = h(Aside, {t: t, v: v});
  var right = h(F, null, A.todayDayId(t) ? h(T.Chip, {tone: "tertiary", icon: "calendar"}, "Bugün " + D.fmtDay(A.todayISO()).short + " · gezinin " + (A.dayIndex(t, A.todayDayId(t)) + 1) + ". günü") : null, periodTabs(v));
  var phoneTabs = A.isPhone ? h(F, null,
    h(T.Button, {variant: "primary", icon: "plus", full: true, onClick: function(){ S.dialog = {kind: "expense"}; A.render(); }}, "Harcama ekle"),
    h(T.Tabs, {key: sub || "liste", label: "Görünüm", full: true, value: sub === "ozet" ? "Özet" : "Liste", items: [{label: "Liste", count: t.expenses.length}, "Özet"], onChange: function(l){ A.go("harcamalar", l === "Özet" ? "ozet" : ""); }}),
    h("div", {className: "app-chips"}, h("a", {href: A.href("harcamalar"), className: "app-chiplink"}, h(T.Chip, {tone: !sub || sub === "ozet" ? "tertiary" : "outline"}, "Tümü · " + t.expenses.length)),
      D.EXP_ORDER.map(function(c){ return h("a", {key: c, href: A.href("harcamalar", c), className: "app-chiplink"}, h(T.Chip, {tone: sub === c ? "tertiary" : "outline", icon: D.EXP_ICON[c]}, D.EXP_CATS[c])); }))) : null;
  if(sub === "ozet"){
    var sh = shares(st);
    var ds = dayItems(t, stats(t, function(e){ return e.day !== "pre"; }));
    var max = Math.max.apply(null, ds.map(function(x){ return x.value || 0; }).concat([1]));
    var trip = stats(t, function(e){ return e.day !== "pre"; }), nd = Object.keys(trip.byDay).length;
    var head = h(A.PageHead, {title: "Harcama özeti", desc: A.isPhone ? null : "Toplam, bütçe ve paranın nereye gittiği.", right: A.isPhone ? null : right});
    var body = h(F, null, phoneTabs, h(Widget, {t: t, st: st, sh: sh}),
      sh.length ? h(T.ShareCards, {key: period, label: "Kategorilere göre harcama", compact: A.isPhone, items: sh.map(function(x){ var n = st.list.filter(function(e){ return e.cat === x.color; }).length; return Object.assign({}, x, {sub: n + " harcama"}); })}) : null,
      nd ? h("section", {className: "app-card", "aria-labelledby": "hr-gun"},
        h("div", {className: "app-card__head"}, h("h2", {id: "hr-gun", className: "heading", style:{margin:0, flex:1}}, "Günlere göre"),
          h(T.Chip, {icon: "calendar"}, nd + " günde " + D.fmtMoney(Math.round(trip.total), "TL")), h(T.Chip, {icon: "chart"}, "Günde ortalama " + D.fmtMoney(Math.round(trip.total / nd), "TL"))),
        h(T.DaySpend, {key: t.expenses.length, items: ds, ticks: ticks(max), reference: Math.round(trip.total / nd), referenceLabel: "Ortalama", height: 150})) : null,
      !st.list.length ? h(ExpenseList, {t: t, st: st}) : null);
    return h(A.Layout, {head: head, aside: aside, phoneAside: false}, body);
  }
  if(D.EXP_CATS[sub]){
    var cs = stats(t, function(e){ return e.cat === sub && inPeriod(e, period); });
    var all = stats(t, function(e){ return inPeriod(e, period); });
    var share = all.total ? Math.round(cs.total / all.total * 100) : 0;
    var trip2 = stats(t, function(e){ return e.cat === sub && e.day !== "pre"; }), nd2 = Object.keys(trip2.byDay).length;
    var ds2 = dayItems(t, trip2, sub);
    var max2 = Math.max.apply(null, ds2.map(function(x){ return x.value || 0; }).concat([1]));
    var biggest = cs.list.slice().sort(function(a, b){ return (eTL(t, b) || 0) - (eTL(t, a) || 0); })[0];
    var head2 = h(A.PageHead, {title: D.EXP_CATS[sub], desc: A.isPhone ? null : cs.list.length + " harcama", right: A.isPhone ? null : right});
    var summary = cs.list.length ? h("section", {className: "app-card app-katsum", "aria-label": D.EXP_CATS[sub] + " özeti"},
      h("div", {className: "app-katsum__left"}, h(T.Stat, {label: D.EXP_CATS[sub], value: D.fmtNum(Math.round(cs.total)), unit: "TL", sub: cs.list.length + " harcama"}),
        h("div", {className: "app-row app-row--wrap"}, h(T.Chip, {icon: "chart"}, "Toplamın %" + share + "’i"), nd2 ? h(T.Chip, {icon: "calendar"}, "Günde ort. " + D.fmtMoney(Math.round(trip2.total / nd2), "TL")) : null),
        biggest ? h("p", {className: "body-sm app-muted", style:{margin:0}}, "En büyük: " + biggest.title + ", " + D.fmtMoney(biggest.amount, biggest.currency) + ".") : null),
      nd2 ? h("div", {className: "app-katsum__chart", style: {"--chart-single": "var(--chart-" + sub + ")"}}, h(T.ColumnChart, {label: "Günlere göre " + D.EXP_CATS[sub], items: ds2, ticks: ticks(max2), height: 132, shape: "pill", mono: true})) : null) : null;
    return h(A.Layout, {head: head2, aside: aside, phoneAside: false}, phoneTabs, summary,
      h("h2", {className: "section-title", style:{margin:0}}, D.EXP_CATS[sub] + " harcamaları"),
      h(ExpenseList, {t: t, st: cs, emptyTitle: "Bu kategoride harcama yok", emptyText: "Harcama eklerken kategori olarak " + D.EXP_CATS[sub] + " seç."}));
  }
  var head3 = h(A.PageHead, {title: "Harcamalar", desc: A.isPhone ? null : (st.list.length ? "Toplam " + D.fmtMoney(Math.round(st.total), "TL") + " · " + st.list.length + " harcama. " : "") + "Ulaşım’da girdiğin bilet fiyatları ve plana bağladığın harcamalar buraya kendiliğinden düşer.", right: A.isPhone ? null : right});
  return h(A.Layout, {head: head3, aside: aside, phoneAside: false}, phoneTabs,
    h("div", {className: "app-row"}, h("h2", {className: "section-title", style:{margin:0, flex:1}}, "Tüm harcamalar"), A.isPhone ? null : null),
    h(ExpenseList, {t: t, st: st}));
}

function Submenu(t){
  var st = stats(t), sh = shares(st), share = {}; sh.forEach(function(x){ share[x.color] = x.share; });
  var det = [h(T.NavItem, {key: "o", icon: "chart", label: "Harcama özeti", href: A.href("harcamalar", "ozet"), active: S.page === "harcamalar" && S.sub === "ozet"}),
    h(T.NavItem, {key: "l", icon: "receipt", label: "Harcama listesi", count: t.expenses.length || undefined, href: A.href("harcamalar"), active: S.page === "harcamalar" && !S.sub})];
  var cats = D.EXP_ORDER.map(function(c){ return h(T.NavItem, {key: c, icon: D.EXP_ICON[c], label: D.EXP_CATS[c], count: share[c] ? "%" + share[c] : undefined, href: A.href("harcamalar", c), active: S.page === "harcamalar" && S.sub === c}); });
  return h(A.Submenu, {sections: [{title: "Detaylar", items: det}, {title: "Kategoriler", items: cats}]});
}
A.pages.harcamalar = {view: Harcamalar, submenu: Submenu};

/* ================= Galeri ================= */
function GaleriAside(p){
  var t = p.t, v = p.v, sel = v.photo ? photoOf(t, v.photo) : null;
  var up = React.useState(false), day = React.useState(A.todayDayId(t) || (t.days[0] && t.days[0].id) || "pre"), del = React.useState(false);
  var add = h(F, null,
    h(T.PhotoInput, {label: "Fotoğraf ekle", addLabel: "Seç", busy: up[0], hint: "Seçtiğin güne eklenir. Harcamaya bağlamak için Harcamalar'dan ekle.", onFiles: function(files){
      up[1](true); A.uploadPhotos(t, files, {day: day[0]}).then(function(ps){ up[1](false); if(ps.length){ v.photo = ps[0].id; A.saveViews(); A.commit(); A.flash(ps.length + " fotoğraf eklendi."); } }); }}),
    h(T.Select, {label: "Gün", value: day[0], options: [{label: "Yola çıkmadan", value: "pre"}].concat(t.days.map(function(d){ return {label: A.dayLabel(t, d.id, true), value: d.id}; })), onChange: day[1]}));
  if(!sel) return h(F, null, add, h("p", {className: "body-sm app-muted", style:{margin:0}}, "Bir fotoğrafa bas: bağlı olduğu plan ve harcama burada açılır."));
  var exp = sel.refKind === "expense" ? t.expenses.find(function(e){ return e.id === sel.ref; }) : null;
  var plan = exp && exp.ref && t.items[exp.ref] ? t.items[exp.ref] : (sel.refKind === "item" ? t.items[sel.ref] : null);
  function link(icon, label, value, onClick){ return h("button", {type: "button", className: "app-tile app-tile--btn", onClick: onClick}, h("span", {className: "app-weak"}, h(T.Icon, {name: icon, size: 20})),
    h("span", {style:{flex:1, minWidth:0, textAlign:"left"}}, h("span", {className: "label app-muted", style:{display:"block"}}, label), h("span", {className: "body-sm-strong app-ellipsis", style:{display:"block"}}, value)), h(T.Icon, {name: "chevron-right", size: 18})); }
  return h(F, null, add, h("hr", {className: "app-hr"}),
    h(T.Photo, {src: D.photoUrl(sel.asset), alt: sel.note || "Gezi fotoğrafı", ratio: "4 / 3"}),
    h("div", null, h("h2", {className: "heading", style:{margin:0}}, exp ? exp.title : A.dayLabel(t, sel.day, true)), h("p", {className: "body-sm app-muted", style:{margin:0}}, A.dayLabel(t, sel.day, true) + (exp && exp.time ? " · " + exp.time : ""))),
    plan ? link("calendar", "Plan", (plan.time ? plan.time + " · " : "") + plan.title, function(){ var w = A.whereIs(t, plan.id); if(A.dayById(t, w)){ A.view().day = w; A.saveViews(); } A.go("tarihler"); }) : null,
    exp ? link("wallet", "Harcama · " + D.EXP_CATS[exp.cat], D.fmtMoney(exp.amount, exp.currency) + (convText(t, exp) && exp.currency !== "TL" ? " · " + convText(t, exp) : ""), function(){ S.expEdit = exp.id; A.go("harcamalar"); }) : null,
    h(T.TextField, {label: "Not", optional: true, multiline: true, rows: 2, value: sel.note, onChange: function(val){ sel.note = D.str(val, 300); A.commit(); }}),
    del[0] ? h(A.Confirm, {text: "Fotoğraf kalıcı olarak silinsin mi?", onYes: function(){
        var asset = sel.asset; t.photos.splice(t.photos.indexOf(sel), 1);
        t.expenses.forEach(function(e){ e.photos = e.photos.filter(function(x){ return x !== sel.id; }); });
        v.photo = null; A.saveViews(); A.commit(); del[1](false);
        A.getAssets().then(function(a){ if(a) a.delete(asset).catch(function(){}); });
        A.flash("Fotoğraf silindi.");
      }, onNo: function(){ del[1](false); }})
      : h("div", {className: "app-row"}, h(T.Button, {size: "sm", variant: "ghost", icon: "trash", onClick: function(){ del[1](true); }}, "Sil"), h(T.Button, {size: "sm", variant: "ghost", icon: "close", onClick: function(){ v.photo = null; A.saveViews(); A.render(); }}, "Kapat")));
}
function Galeri(p){
  var t = p.t, v = p.v;
  var days = ["pre"].concat(t.days.map(function(d){ return d.id; })).reverse().filter(function(id){ return t.photos.some(function(ph){ return ph.day === id; }); });
  var priceOf = {}; t.expenses.forEach(function(e){ e.photos.forEach(function(pid){ priceOf[pid] = D.fmtMoney(e.amount, e.currency); }); });
  var head = h(A.PageHead, {title: "Galeri", desc: A.isPhone ? null : "Gezide çektiklerin, gününe göre. Harcamaya eklediğin fotoğraflar da burada.", right: t.photos.length ? h(T.Chip, {tone: "outline", icon: "gallery"}, t.photos.length + " fotoğraf") : null});
  var body = days.length ? days.map(function(id){
    var ps = t.photos.filter(function(ph){ return ph.day === id; });
    return h("section", {key: id, id: "gal-" + id, className: "app-stack", "aria-labelledby": "galh-" + id},
      h("div", {className: "app-row"}, h("h2", {id: "galh-" + id, className: "heading", style:{margin:0, flex:1}}, A.dayLabel(t, id, true)), h("span", {className: "body-sm app-muted"}, ps.length + " fotoğraf")),
      h("div", {className: "app-gallery"}, ps.map(function(ph){
        return h(T.Photo, {key: ph.id, src: D.photoUrl(ph.asset), alt: ph.note || "Gezi fotoğrafı", button: true, selected: v.photo === ph.id, price: priceOf[ph.id], label: "Fotoğrafı aç",
          onClick: function(){ v.photo = ph.id; A.saveViews(); if(A.isPhone){ S.dialog = {kind: "photo"}; } A.render(); }});
      })));
  }) : h("div", {className: "app-card"}, h(T.EmptyState, {illustration: "celebrate", title: "Galeri boş", text: "Harcamaya, bilete ya da doğrudan buraya eklediğin fotoğraflar güne göre dizilir."}));
  return h(A.Layout, {head: head, aside: h(GaleriAside, {t: t, v: v}), asideLabel: "Seçili fotoğraf"}, body);
}
A.GaleriAside = GaleriAside;
function GSubmenu(t){
  var items = ["pre"].concat(t.days.map(function(d){ return d.id; })).reverse().map(function(id, i){
    var n = t.photos.filter(function(ph){ return ph.day === id; }).length; if(!n) return null;
    var d = A.dayById(t, id);
    return h(T.NavItem, {key: id, mark: d ? String(A.dayIndex(t, id) + 1) : undefined, icon: d ? undefined : "suitcase", label: A.dayLabel(t, id), sub: d ? A.dayTitle(t, d) : undefined, count: n, href: "#", onClick: function(){ var el = document.getElementById("gal-" + id); if(el) el.scrollIntoView({behavior: "smooth", block: "start"}); }});
  }).filter(Boolean);
  return items.length ? h(A.Submenu, {title: "Günler"}, items) : null;
}
A.pages.galeri = {view: Galeri, submenu: GSubmenu};
})();
