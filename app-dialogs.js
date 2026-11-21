/* Pencereler: plan, ulaşım (4 adım), madde, önemli bilgiler, gezi. */
(function(){
"use strict";
var A = window.TPA, D = A.D, T = A.T, h = A.h, F = A.F, S = A.S;
/* close: kaydettikten sonra doğrudan kapatır. ask: kullanıcı kapatmak isteyince; formda değişiklik varsa önce sorar. */
function close(){ S.dirty = false; S.askClose = false; S.dialog = null; A.render(); }
function ask(){ if(S.dirty){ S.askClose = true; A.render(); } else close(); }
function keep(){ S.askClose = false; A.render(); }
A.closeDialog = close; A.askCloseDialog = ask;
/* pencerenin içindeki Escape'i pencerenin kendisi karşılar; bu yalnızca odak dışarıdayken */
document.addEventListener("keydown", function(e){
  if(e.key !== "Escape" || !S.dialog) return;
  if(e.target && e.target.closest && e.target.closest(".tp-scrim,.tp-sheetwrap")) return;
  if(S.askClose) keep(); else ask();
});

function useForm(init){
  var st = React.useState(init);
  return [st[0], function(k, v){ A.markDirty(); st[1](function(o){ var n = Object.assign({}, o); if(typeof k === "object") Object.assign(n, k); else n[k] = v; return n; }); }];
}
function fixLink(s){ s = (s || "").trim(); if(!s) return ""; return D.safeLink(/^https?:/i.test(s) ? s : "https://" + s); }
/* Form pencereleri: telefonda alttan açılan pencere, masaüstünde ortada */
function Modal(p){ return A.isPhone ? h(T.Sheet, Object.assign({placement: "bottom", direction: "none"}, p, {width: undefined})) : h(T.Dialog, p); }
function Foot(p){ return h("div", {className: "app-dialogfoot"}, p.left || h("span"), h("div", {className: "app-row"}, p.children)); }

/* ---------- Plan ---------- */
function PlanDialog(p){
  var t = A.trip(), it = p.id ? t.items[p.id] : null, where = it ? A.whereIs(t, p.id) : (p.newIn || A.view().day);
  var f = useForm(it ? {time: it.time, title: it.title, note: it.note, cat: it.cat, link: it.link, where: where, critical: it.critical}
    : {time: "", title: "", note: "", cat: "gezi", link: "", where: where, critical: false});
  var err = React.useState(""), del = React.useState(false);
  var v = f[0], set = f[1];
  function save(e){
    e.preventDefault();
    if(!v.title.trim()){ err[1]("Yerin ya da etkinliğin adını yaz."); return; }
    var x = it || {id: D.uid("i")};
    x.time = D.str(v.time.trim(), 40); x.title = D.str(v.title.trim(), 160); x.note = D.str(v.note, 800); x.cat = v.cat; x.link = fixLink(v.link); x.critical = !!v.critical;
    if(!it){ t.items[x.id] = x; A.moveItem(t, x.id, v.where, A.dayById(t, v.where) ? "time" : 0); A.stamp(x);
      if(A.dayById(t, v.where)) A.log(t, "plan", x.id, "“" + x.title + "” planını ekledi · " + A.dayLabel(t, v.where));
      else A.log(t, "idea", x.id, "“" + x.title + "” önerisini kenar listesine ekledi"); }
    else if(v.where !== where) A.moveItem(t, x.id, v.where, A.dayById(t, v.where) ? "time" : 0);
    A.commit(); close();
    A.flash(it ? "Plan güncellendi." : "“" + x.title + "” eklendi.");
  }
  function remove(){
    var snap = A.snapshot(), arr = A.listOf(t, where); arr.splice(arr.indexOf(p.id), 1); delete t.items[p.id];
    t.expenses.forEach(function(e){ if(e.ref === p.id && e.source === "plan"){ e.ref = ""; e.source = "manual"; } });
    A.commit(); close(); A.flash("Plan silindi.", function(){ A.restore(snap); });
  }
  var whereOpts = t.days.map(function(d){ return {label: A.dayLabel(t, d.id, true) + " · " + A.dayTitle(t, d), value: d.id}; }).concat([{label: "Kenar listesi · çıkardıkların", value: "removed"}, {label: "Kenar listesi · öneriler", value: "ideas"}]);
  var linked = it ? t.expenses.filter(function(e){ return e.ref === it.id; }) : [];
  var crit = h(T.Checkbox, {label: "Kesin saat", description: A.isPhone ? "Kaçırılmaması gereken saat." : "Kaçırılmaması gereken bir saat (uçuş, sınır, rezervasyon).", checked: v.critical, onChange: function(x){ set("critical", x); }});
  /* telefonda saat tekerlekle, ülke saati düğmeyle seçilir */
  var timeField = A.isPhone
    ? h(A.ClockField, {id: "pdt", label: "Saat", value: v.time, zones: A.tripZones(t), onChange: function(x){ set("time", x); }, extra: crit})
    : h("div", {className: "app-two", style: {alignItems: "end"}}, h(T.TextField, {label: "Saat", value: v.time, placeholder: "14:30", onChange: function(x){ set("time", x); }}), crit);
  var titleField = h(T.TextField, {label: A.req("Yer / etkinlik"), value: v.title, onChange: function(x){ set("title", x); err[1](""); }, error: err[0] || undefined, autoFocus: !it && !A.isPhone});
  return h(Modal, {title: it ? "Planı düzenle" : "Yeni plan", width: "560px", onClose: ask},
    h("form", {className: "app-stack", onSubmit: save},
      titleField,
      timeField,
      h(A.Select, {label: "Tür", value: v.cat, options: Object.keys(D.CATS).map(function(c){ return {label: D.CATS[c], value: c}; }), onChange: function(x){ set("cat", x); }}),
      h(A.Select, {label: "Nerede", value: v.where, options: whereOpts, onChange: function(x){ set("where", x); }}),
      h(T.TextField, {label: "Bağlantı", optional: true, value: v.link, placeholder: "https://", onChange: function(x){ set("link", x); }}),
      h(T.TextField, {label: "Not", optional: true, multiline: true, rows: 3, value: v.note, onChange: function(x){ set("note", x); }}),
      it ? h("div", {className: "app-row app-row--wrap"},
        linked.length ? h(T.Chip, {icon: "wallet"}, linked.length + " harcama bağlı") : null,
        it.cat !== "ulasim" ? h(T.Button, {size: "sm", variant: "ghost", icon: "wallet", onClick: function(){
          var preset = {ref: it.id, title: it.title, cat: D.CAT_TO_EXP[it.cat] || "sights", day: A.dayById(t, where) ? where : (A.todayDayId(t) || "pre")};
          S.dialog = A.isPhone ? {kind: "expense", preset: preset} : null; if(!A.isPhone){ S.expOpen = true; S.expPreset = preset; A.go("harcamalar"); } else A.render(); }}, "Harcama ekle")
          : h(T.Button, {size: "sm", variant: "ghost", icon: "route", onClick: function(){ S.dialog = {kind: "transit", id: it.id}; A.render(); }}, "Ulaşım ayrıntıları")) : null,
      h(Foot, {left: it ? (del[0] ? h(A.Confirm, {text: "Kalıcı olarak silinsin mi?", onYes: remove, onNo: function(){ del[1](false); }}) : h("div", {className: "app-row"}, h(T.Button, {variant: "ghost", icon: "trash", onClick: function(){ del[1](true); }}, "Sil"),
        A.chatApi && A.chatApi() ? h(T.Button, {variant: "ghost", icon: "share", onClick: function(){ close(); A.openChat({k: it.cat === "ulasim" ? "transit" : "plan", id: it.id, l: D.str(it.title || "Plan", 80)}); }}, "Sohbette bahset") : null)) : null},
        h(T.Button, {variant: "ghost", onClick: ask}, "Vazgeç"), h(T.Button, {variant: "primary", type: "submit"}, it ? "Kaydet" : "Ekle"))));
}

/* ---------- Ulaşım: 4 adım ---------- */
var MODE_ITEMS = [["plane","Uçak","plane"],["bus","Otobüs","bus"],["train","Tren","train"],["car","Araç / transfer","car"],["taxi","Taksi / Bolt","car"],["walk","Yürüyüş","walk"],["border","Sınır geçişi","id"]];
function TicketFile(p){
  var ref = React.useRef(null), busy = React.useState(false), err = React.useState("");
  function pick(e){
    var f = e.target.files && e.target.files[0]; e.target.value = ""; if(!f) return;
    busy[1](true); err[1]("");
    A.uploadTicket(f).then(function(r){ busy[1](false); p.onChange(r); }, function(x){ busy[1](false); err[1](x && x.message ? x.message : "Dosya yüklenemedi."); });
  }
  var v = p.value;
  return h("div", {className: "app-stack", style: {gap: "var(--space-2)"}},
    h("span", {className: "body-sm-strong"}, "Bilet dosyası"),
    v ? h("div", {className: "app-tile app-ticketfile"}, h("span", {className: "app-icontile"}, h(T.Icon, {name: v.type === "pdf" ? "paperclip" : "image-add", size: 18})),
        h("span", {className: "body-sm app-ellipsis", style: {flex: 1, minWidth: 0}}, v.name),
        h(T.IconButton, {icon: "close", label: "Dosyayı kaldır", size: "sm", onClick: function(){ p.onChange(null); }}))
      : h(T.Button, {icon: busy[0] ? "refresh" : "paperclip", onClick: function(){ if(!busy[0] && ref.current) ref.current.click(); }}, busy[0] ? "Yükleniyor…" : "Fotoğraf ya da PDF ekle"),
    h("input", {ref: ref, type: "file", accept: "image/*,application/pdf,.pdf", className: "tp-sr", "aria-label": "Bilet dosyası", onChange: pick}),
    err[0] ? h("p", {className: "body-sm tp-field__error", role: "alert", style: {margin: 0}}, err[0]) : h("p", {className: "body-sm app-muted", style: {margin: 0}}, "Biniş kartı ya da e-bilet; kapıda göstermek için tam ekran açılır."));
}
function TransitSheet(p){
  var t = A.trip(), it = p.id ? t.items[p.id] : null, where = it ? A.whereIs(t, p.id) : (p.day || A.view().day);
  var parts = it && !it.origin && /→/.test(it.title || "") ? it.title.split("→").map(function(s){ return s.trim(); }) : null;
  var f = useForm(it ? {mode: A.modeOf(it), origin: it.origin || (parts ? parts[0] : ""), dest: it.dest || (parts ? parts.slice(1).join(" → ") : ""), title: it.title, day: A.dayById(t, where) ? where : A.view().day,
      time: it.time, end: it.end || "", duration: it.duration || "", amount: it.priceAmount ? D.fmtNum(it.priceAmount, it.priceAmount % 1 !== 0) : "", currency: it.priceCur || (t.currency || "TL"),
      addExp: !it.noExpense, note: it.note, link: it.link, critical: it.critical,
      carrier: it.carrier || "", code: it.code || "", seat: it.seat || "", fromCode: it.fromCode || "", toCode: it.toCode || "", flex: A.isFlexTransit(it), flexTouched: typeof it.flex === "boolean", ticket: it.ticket || null}
    : {mode: "bus", origin: "", dest: "", title: "", day: where, time: "", end: "", duration: "", amount: "", currency: t.currency || "TL", addExp: true, note: "", link: "", critical: false,
      carrier: "", code: "", seat: "", fromCode: "", toCode: "", flex: false, flexTouched: false, ticket: null});
  var v = f[0], set = f[1];
  var step = React.useState(p.step || 0), err = React.useState(""), dir = React.useState("forward");
  var title = v.title && it && v.title !== (v.origin + " → " + v.dest) ? v.title : ((v.origin || "?") + " → " + (v.dest || "?"));
  if(v.mode === "border" && !v.dest) title = v.origin ? v.origin + " sınırı" : "Sınır geçişi";
  function next(){
    if(step[0] === 1 && (!v.origin.trim() || (v.mode !== "border" && !v.dest.trim()))){ err[1](v.mode === "border" ? "Sınır kapısının adını yaz." : "Nereden ve nereye yaz."); return; }
    err[1](""); dir[1]("forward"); if(step[0] < 3) step[1](step[0] + 1); else save();
  }
  function back(){ dir[1]("back"); if(step[0] > 0) step[1](step[0] - 1); else ask(); }
  function save(){
    var x = it || {id: D.uid("u"), cat: "ulasim"};
    x.cat = "ulasim"; x.mode = v.mode; x.origin = D.str(v.origin.trim(), 80); x.dest = D.str(v.dest.trim(), 80);
    x.title = D.str(it && v.title && v.title !== (parts ? parts.join(" → ") : "") && v.title !== title && !/→/.test(v.title) ? v.title : title, 160);
    ["carrier", "code", "seat"].forEach(function(k){ var val = D.str(String(v[k] || "").trim(), k === "carrier" ? 60 : (k === "code" ? 24 : 40)); if(val) x[k] = val; else delete x[k]; });
    ["fromCode", "toCode"].forEach(function(k){ var val = v.mode === "plane" ? String(v[k] || "").trim().toUpperCase().slice(0, 5) : ""; if(val) x[k] = val; else delete x[k]; });
    if(v.flexTouched || typeof x.flex === "boolean") x.flex = !!v.flex;
    if(v.ticket) x.ticket = v.ticket; else delete x.ticket;
    x.time = D.str(v.time.trim(), 40); x.end = D.str(v.end.trim(), 20); x.duration = D.str(v.duration.trim(), 40); x.note = D.str(v.note, 800); x.link = fixLink(v.link); x.critical = !!v.critical;
    var amount = D.parseAmount(v.amount);
    if(amount){ x.priceAmount = amount; x.priceCur = v.currency; } else { delete x.priceAmount; delete x.priceCur; }
    if(v.addExp) delete x.noExpense; else x.noExpense = true;
    if(!it){ t.items[x.id] = x; A.moveItem(t, x.id, v.day, "time"); A.stamp(x);
      A.log(t, "transit", x.id, "“" + x.title + "” yolculuğunu ekledi · " + A.dayLabel(t, v.day) + (x.time ? " " + x.time : "")); }
    else if(v.day !== where) A.moveItem(t, x.id, v.day, "time");
    var v2 = A.view(); v2.transit = x.id; v2.day = v.day; A.saveViews();
    A.commit(); close();
    A.flash(it ? "Yolculuk güncellendi." : "“" + x.title + "” eklendi" + (amount && v.addExp ? "; Harcamalar'a da düştü." : "."));
  }
  var dayOpts = t.days.map(function(d){ return {label: A.dayLabel(t, d.id, true) + " · " + A.dayTitle(t, d), value: d.id}; });
  var body;
  if(step[0] === 0) body = h(T.RadioGroup, {label: "Nasıl gidiyorsun?", variant: "tiles", columns: A.isPhone ? 2 : 3, value: v.mode, onChange: function(x){ set(v.flexTouched ? {mode: x} : {mode: x, flex: A.isFlexTransit({mode: x})}); },
    items: MODE_ITEMS.map(function(m){ return {label: m[1], value: m[0], icon: m[2]}; })});
  else if(step[0] === 1) body = h("div", {className: "app-stack"},
    h(T.TextField, {label: A.req(v.mode === "border" ? "Sınır kapısı" : "Nereden"), value: v.origin, placeholder: v.mode === "border" ? "Sarp" : "Batum", onChange: function(x){ set("origin", x); err[1](""); }, autoFocus: !A.isPhone}),
    v.mode === "border" ? null : h(T.TextField, {label: A.req("Nereye"), value: v.dest, placeholder: "Kutaisi", onChange: function(x){ set("dest", x); err[1](""); }}),
    v.mode === "plane" ? h("div", {className: "app-two"},
      h(T.TextField, {label: "Kalkış kodu", optional: true, value: v.fromCode, placeholder: "IST", maxLength: 5, onChange: function(x){ set("fromCode", x.toUpperCase()); }}),
      h(T.TextField, {label: "Varış kodu", optional: true, value: v.toCode, placeholder: "RZV", maxLength: 5, onChange: function(x){ set("toCode", x.toUpperCase()); }})) : null,
    err[0] ? h("p", {className: "body-sm tp-field__error", role: "alert", style:{margin:0}}, err[0]) : null,
    A.isPhone ? h("div", {className: "tp-field"}, h("span", {className: "label tp-field__label"}, "Gün"), h(A.DayWheel, {t: t, id: "trdw", noPre: true, label: "Gün", value: v.day, onChange: function(x){ set("day", x); }}))
      : h(T.Select, {label: "Gün", value: v.day, options: dayOpts, onChange: function(x){ set("day", x); }}),
    A.isPhone ? h(F, null,
        h(A.ClockField, {id: "trk", label: "Kalkış", value: v.time, zones: A.tripZones(t), onChange: function(x){ set("time", x); }}),
        h(A.ClockField, {id: "trv", label: "Varış", optional: true, value: v.end, zones: A.tripZones(t), onChange: function(x){ set("end", x); }}))
      : h("div", {className: "app-two"},
      h(T.TextField, {label: "Kalkış", value: v.time, placeholder: "08:40", onChange: function(x){ set("time", x); }, hint: "Ülke saati farklıysa sonuna TR ya da GE yaz."}),
      h(T.TextField, {label: "Varış", optional: true, value: v.end, placeholder: "11:00", onChange: function(x){ set("end", x); }})));
  else if(step[0] === 2) body = h("div", {className: "app-stack"},
    h(T.Checkbox, {label: "Saati esnek", description: "Taksi, Bolt gibi belli bir bileti olmayan yolculuk. Ulaşım'da sade bir satır olarak durur.", checked: v.flex, onChange: function(x){ set({flex: x, flexTouched: true}); }}),
    v.flex ? null : h("div", {className: "app-stack app-ticketfields"},
      h("h3", {className: "label app-muted", style: {margin: 0}}, "Bilet bilgileri"),
      h("div", {className: "app-two"},
        h(T.TextField, {label: "Firma", value: v.carrier, placeholder: v.mode === "plane" ? "Pegasus" : (v.mode === "train" ? "GR" : "Metro"), onChange: function(x){ set("carrier", x); }}),
        h(T.TextField, {label: "Sefer no", value: v.code, placeholder: v.mode === "plane" ? "PC 2846" : "1234", onChange: function(x){ set("code", x); }})),
      h(T.TextField, {label: "Koltuk, peron ya da kapı", value: v.seat, placeholder: v.mode === "plane" ? "14C" : "Peron 7", onChange: function(x){ set("seat", x); }}),
      h(TicketFile, {value: v.ticket, onChange: function(x){ set("ticket", x); }})),
    h(T.TextField, {label: "Süre", optional: true, value: v.duration, placeholder: "~2,5 saat", onChange: function(x){ set("duration", x); }}),
    h(T.MoneyField, {label: "Bilet fiyatı", optional: true, value: v.amount, currency: v.currency, currencies: D.CURRENCIES, hint: "Gidiş-dönüş tek biletse toplamı yaz.", autoFocus: p.step === 2 && !A.isPhone,
      onChange: function(o){ set({amount: o.value, currency: o.currency}); }}),
    h(T.Checkbox, {label: "Harcamalara ekle", description: "Fiyat girersen Harcamalar'da Ulaşım kategorisine düşer.", checked: v.addExp, strong: true, onChange: function(x){ set("addExp", x); }}),
    h(T.TextField, {label: "Not", optional: true, multiline: true, rows: 2, value: v.note, placeholder: "Peron, rezervasyon kodu, şoför numarası…", onChange: function(x){ set("note", x); }}),
    h(T.TextField, {label: "Bağlantı", optional: true, value: v.link, placeholder: "https://", onChange: function(x){ set("link", x); }}),
    h(T.Checkbox, {label: "Kesin saat", description: "Kaçırılmaması gereken saat; kartta öne çıkar.", checked: v.critical, onChange: function(x){ set("critical", x); }}));
  else {
    var amount = D.parseAmount(v.amount);
    var rows = [["route", D.MODES[v.mode], title], ["calendar", "Gün ve saat", A.dayLabel(t, v.day, true) + (v.time ? " · " + v.time : "") + (v.end ? " → " + v.end : "")],
      ["cash", "Bilet", amount ? D.fmtMoney(amount, v.currency) + (v.addExp ? " · Harcamalar'a eklenecek" : "") : "Fiyat girilmedi"], ["calendar", "Plan", "Günün planında saatine göre yerine oturur"]];
    if(v.duration) rows.splice(2, 0, ["clock", "Süre", v.duration]);
    var tk = [v.carrier, v.code, v.seat].map(function(x){ return String(x || "").trim(); }).filter(Boolean).join(" · ");
    if(v.flex) rows.splice(1, 0, ["car", "Saati esnek", "Ulaşım'da sade satır olarak görünür"]);
    else if(tk || v.ticket) rows.splice(1, 0, ["ticket", "Bilet", (tk || "") + (v.ticket ? (tk ? " · " : "") + "dosya ekli" : "")]);
    body = h("div", {className: "app-stack"}, rows.map(function(r, i){
      return h("div", {key: i, className: "app-tile"}, h("span", {className: "app-icontile"}, h(T.Icon, {name: r[0], size: 18})),
        h("div", {style:{minWidth:0}}, h("div", {className: "body-sm-strong"}, r[1]), h("div", {className: "body-sm app-muted"}, r[2])));
    }));
  }
  return h(T.Sheet, {title: it ? "Yolculuğu düzenle" : "Ulaşım ekle", eyebrow: (step[0] + 1) + "/4", steps: ["Tür", "Güzergah", "Ayrıntı", "Kontrol"], current: step[0],
    placement: A.isPhone ? "bottom" : "right", direction: dir[0], key: step[0],
    primaryLabel: step[0] === 3 ? (it ? "Kaydet" : "Ekle") : "Devam", primaryIconEnd: step[0] === 3 ? undefined : "arrow-right", primaryIcon: step[0] === 3 ? "check" : undefined,
    secondaryLabel: step[0] === 0 ? "Vazgeç" : "Geri", onPrimary: next, onSecondary: back, onClose: ask}, body,
    it && step[0] === 0 ? h("div", {style:{marginTop: "var(--space-4)"}}, h(T.Button, {variant: "ghost", icon: "trash", onClick: function(){
      var snap = A.snapshot(), arr = A.listOf(t, where); if(arr) arr.splice(arr.indexOf(it.id), 1); delete t.items[it.id]; A.commit(); close(); A.flash("Yolculuk silindi.", function(){ A.restore(snap); }); }}, "Yolculuğu sil")) : null);
}

/* ---------- Madde ---------- */
function CheckDialog(p){
  var t = A.trip(), c = p.id ? t.checklist.find(function(x){ return x.id === p.id; }) : null;
  return h(Modal, {title: c ? "Maddeyi düzenle" : "Madde ekle", width: "520px", onClose: ask}, h(A.CheckForm, {t: t, item: c, group: p.group, onDone: close}));
}

/* ---------- Önemli bilgiler ---------- */
function KeyInfoDialog(){
  var t = A.trip();
  var st = React.useState(t.keyinfo.map(function(k){ return Object.assign({}, k); }));
  var rows = st[0];
  function upd(i, k, val){ var n = rows.slice(); n[i] = Object.assign({}, n[i]); n[i][k] = val; st[1](n); }
  return h(Modal, {title: "Önemli bilgiler", description: "Ulaşım'da en üstte durur. Uyarılı olanlar gezi günlerinde öne çıkar.", width: "620px", onClose: ask},
    h("form", {className: "app-stack", onSubmit: function(e){ e.preventDefault(); t.keyinfo = rows.filter(function(r){ return r.label.trim() || r.value.trim(); }).slice(0, 12).map(function(r){ return {id: r.id, label: D.str(r.label, 40), value: D.str(r.value, 80), sub: D.str(r.sub, 120), warn: !!r.warn}; }); A.commit(); close(); }},
      rows.map(function(r, i){
        return h("div", {key: r.id, className: "app-card app-stack"},
          h("div", {className: "app-two"}, h(T.TextField, {label: "Başlık", value: r.label, placeholder: "Gidiş", onChange: function(x){ upd(i, "label", x); }}), h(T.TextField, {label: "Bilgi", value: r.value, placeholder: "30 Ara 19:35 İstanbul", onChange: function(x){ upd(i, "value", x); }})),
          h(T.TextField, {label: "Alt satır", optional: true, value: r.sub, onChange: function(x){ upd(i, "sub", x); }}),
          h("div", {className: "app-row"}, h(T.Checkbox, {label: "Uyarı", checked: r.warn, onChange: function(x){ upd(i, "warn", x); }}), h("span", {style:{flex:1}}),
            h(T.Button, {size: "sm", variant: "ghost", icon: "trash", onClick: function(){ st[1](rows.filter(function(_, j){ return j !== i; })); }}, "Kaldır")));
      }),
      rows.length < 12 ? h(T.Button, {variant: "outline", icon: "plus", onClick: function(){ st[1](rows.concat([{id: D.uid("ki"), label: "", value: "", sub: "", warn: false}])); }}, "Bilgi ekle") : null,
      h(Foot, null, h(T.Button, {variant: "ghost", onClick: ask}, "Vazgeç"), h(T.Button, {variant: "primary", type: "submit"}, "Kaydet"))));
}

/* ---------- Gezi ---------- */
function validRange(a, b){
  if(!D.parseISO(a) || !D.parseISO(b)) return "Başlangıç ve bitiş tarihini seç.";
  if(D.parseISO(b) < D.parseISO(a)) return "Bitiş, başlangıçtan önce olamaz.";
  if((D.parseISO(b) - D.parseISO(a)) / 864e5 + 1 > D.MAX_DAYS) return "Bir gezi en fazla " + D.MAX_DAYS + " gün olabilir.";
  return "";
}
function applyDates(t, start, end){
  var dates = D.datesBetween(start, end), old = t.days;
  t.days = dates.map(function(dt){ return old.find(function(d){ return d.date === dt; }) || {id: D.dayIdOf(dt), date: dt, title: "", night: "", items: []}; });
  old.forEach(function(d){ if(dates.indexOf(d.date) < 0) d.items.forEach(function(id){ delete t.items[id].from; t.removed.unshift(id); }); });
  t.expenses.forEach(function(e){ if(e.day !== "pre" && dates.indexOf(e.day.slice(1, 5) + "-" + e.day.slice(5, 7) + "-" + e.day.slice(7)) < 0) e.day = "pre"; });
  t.start = start; t.end = end;
}
function TripDialog(p){
  var t = p.kind === "trip-settings" ? A.trip() : null;
  var pre = !t && S.dialog && S.dialog.preset || {};
  var f = useForm(t ? {name: t.name, start: t.start, end: t.end, short: t.short, color: A.COLORS[t.color % 6], currency: t.currency || ""} : {name: pre.name || "", start: pre.start || "", end: pre.end || "", short: "", color: A.COLORS[S.app.order.length % 6], currency: ""});
  var v = f[0], set = f[1], err = React.useState(""), del = React.useState(false), reset = React.useState(false);
  var leave = !!(t && window.TPB && !window.TPB.isOwner(t.id));
  function save(e){
    e.preventDefault();
    if(!v.name.trim()){ err[1]("Gezinin adını yaz."); return; }
    var bad = validRange(v.start, v.end); if(bad){ err[1](bad); return; }
    var ci = A.COLORS.indexOf(v.color);
    if(t){ t.name = D.str(v.name.trim(), 60); t.short = D.str(v.short.trim(), 3) || D.initials(t.name); t.color = ci; t.currency = v.currency; applyDates(t, v.start, v.end); A.commit(t.id); close(); A.flash("Gezi kaydedildi."); }
    else {
      var n = D.newTrip(D.str(v.name.trim(), 60), D.str(v.short.trim(), 3), v.start, v.end, ci); n.currency = v.currency;
      S.app.trips[n.id] = n; S.app.order.push(n.id); A.sync.markCreated(n.id); A.commit(n.id); close(); A.go("hazirlik", "", n.id);
    }
  }
  return h(Modal, {title: t ? "Gezi ayarları" : "Yeni gezi", description: t ? t.name : "Tarihleri girince her gün için bir sayfa açılır.", width: "560px", onClose: ask},
    h("form", {className: "app-stack", onSubmit: save},
      h(T.TextField, {label: A.req("Gezi adı"), value: v.name, placeholder: "Örn. Kapadokya bahar", maxLength: 60, autoFocus: !t && !A.isPhone, onChange: function(x){ set("name", x); err[1](""); }}),
      h("div", {className: "app-two"}, h(A.Field, {label: A.req("Başlangıç"), type: "date", value: v.start, onChange: function(x){ set("start", x); err[1](""); }}), h(A.Field, {label: A.req("Bitiş"), type: "date", value: v.end, min: v.start, onChange: function(x){ set("end", x); err[1](""); }})),
      h("div", {className: "app-two"}, h(T.TextField, {label: "Simge yazısı", optional: true, value: v.short, maxLength: 3, placeholder: "En fazla 3 harf", onChange: function(x){ set("short", x); }}),
        h(A.Select, {label: "Yerel para", value: v.currency, options: [{label: "Yok (TL)", value: ""}].concat(D.CURRENCIES.filter(function(c){ return c !== "TL"; })), onChange: function(x){ set("currency", x); }})),
      h(T.SwatchPicker, {label: "Renk", value: v.color, onChange: function(x){ set("color", x); }}),
      err[0] ? h("p", {className: "body-sm tp-field__error", role: "alert", style:{margin:0}}, h(T.Icon, {name: "warning", size: 16}), err[0]) : null,
      t ? h("p", {className: "body-sm app-muted", style:{margin:0}}, "Tarihleri kısaltırsan dışarıda kalan günlerin planları kenar listesine taşınır.") : null,
      h(Foot, null, h(T.Button, {variant: "ghost", onClick: ask}, "Vazgeç"), h(T.Button, {variant: "primary", type: "submit"}, t ? "Kaydet" : "Geziyi oluştur")),
      t && window.TPB ? h(window.TPB.Members, {tripId: t.id}) : null,
      t ? h("div", {className: "app-zone"}, h("h3", {className: "label app-muted", style:{margin:0}}, "Diğer"),
        t.geo === "georgia" ? (reset[0] ? h(A.Confirm, {text: "Tüm değişiklikler silinip başlangıç planına dönülsün mü?", yes: "Evet, dön", onYes: function(){ var n = D.seedGeorgia(); n.id = t.id; n.expenses = t.expenses; n.photos = t.photos; n.rate = t.rate; n.budget = t.budget; S.app.trips[t.id] = n; A.commit(t.id); close(); A.flash("Başlangıç planına dönüldü. Harcamalar ve fotoğraflar duruyor."); }, onNo: function(){ reset[1](false); }})
          : h(T.Button, {variant: "ghost", size: "sm", icon: "refresh", onClick: function(){ reset[1](true); }}, "Başlangıç planına dön")) : null,
        del[0] ? h(A.Confirm, {text: leave ? "“" + t.name + "” listenden kalksın mı? Diğerleri için gezi olduğu gibi kalır." : "“" + t.name + "” ve içindeki her şey silinsin mi?", yes: leave ? "Geziden ayrıl" : "Geziyi sil", onYes: function(){ var id = t.id; delete S.app.trips[id]; S.app.order = S.app.order.filter(function(x){ return x !== id; }); A.sync.remove(id); D.saveLocal(S.app); close(); S.cur = S.app.order[0] || null; if(S.cur) A.go("tarihler"); else { location.hash = ""; A.render(); } }, onNo: function(){ del[1](false); }})
          : h(T.Button, {variant: "ghost", size: "sm", icon: "trash", onClick: function(){ del[1](true); }}, leave ? "Geziden ayrıl" : "Geziyi sil")) : null));
}
function IdeaAdd(p){
  var t = A.trip(), it = t.items[p.id];
  var f = useForm({day: A.dayById(t, p.day) ? p.day : A.view().day, time: it && /\d/.test(it.time || "") ? it.time : ""});
  var v = f[0], set = f[1];
  if(!it) return null;
  function save(e){ if(e) e.preventDefault(); it.time = D.str(v.time.trim(), 40); close(); A.addToDay(t, p.id, v.day); }
  if(A.isPhone) return h(T.Sheet, {title: "“" + (it.title || "Öneri") + "”", eyebrow: "Plana ekle", placement: "bottom", onClose: ask, direction: "none",
      primaryLabel: "Plana ekle", primaryIcon: "plus", onPrimary: save, secondaryLabel: "Vazgeç", onSecondary: ask},
    h(A.DayTimePick, {t: t, id: "ia", noPre: true, day: v.day, onDay: function(x){ set("day", x); }, time: v.time, onTime: function(x){ set("time", x); }}),
    h("p", {className: "body-sm app-muted", style: {margin: 0}}, "Saatsiz seçersen günün sonuna eklenir."));
  var dayOpts = t.days.map(function(d){ return {label: A.dayLabel(t, d.id, true) + " · " + A.dayTitle(t, d), value: d.id}; });
  var body = h("form", {className: "app-stack", onSubmit: save},
    h(T.Select, {label: "Gün", value: v.day, options: dayOpts, onChange: function(x){ set("day", x); }}),
    h(T.TextField, {label: "Saat", optional: true, value: v.time, placeholder: "14:00", inputMode: "numeric", autoFocus: true, hint: "Boş bırakırsan saatsiz plan olarak günün sonuna eklenir.", onChange: function(x){ set("time", x); }}),
    h("div", {className: "app-row", style: {justifyContent: "flex-end"}}, h(T.Button, {variant: "ghost", onClick: ask}, "Vazgeç"), h(T.Button, {variant: "primary", icon: "plus", type: "submit"}, "Plana ekle")));
  return h(T.Dialog, {title: "Plana ekle", description: it.title, width: "440px", onClose: ask}, body);
}
function Activity(){
  var t = A.trip(), v = A.view(), seen = React.useState(v.seenAt || "")[0];
  React.useEffect(function(){ v.seenAt = new Date().toISOString(); A.saveViews(); A.render(); }, []);
  var body = h(A.ActivityFeed, {t: t, seenAt: seen});
  return h(T.Sheet, {title: "Son hareketler", eyebrow: t.name, placement: A.isPhone ? "bottom" : "right", onClose: ask, direction: "none"}, body);
}
function TripMenu(){
  return h(T.Sheet, {title: "Geziler", placement: "bottom", onClose: ask, direction: "none"},
    h("div", {className: "app-stack"}, h("a", {href: "#home", className: A.cx("app-tile app-tile--btn", S.page === "home" && "is-current"), onClick: function(){ S.dialog = null; }},
        h("span", {className: "tp-trip__btn app-rail__home", "aria-hidden": "true"}, h(T.Icon, {name: "home", size: 22})),
        h("span", {style: {flex: 1, minWidth: 0}}, h("span", {className: "body-strong", style: {display: "block"}}, "Ana sayfa"), h("span", {className: "body-sm app-muted"}, "Gezilerin ve tatil fırsatları"))),
      S.app.order.map(function(id){
      var t = S.app.trips[id]; if(!t) return null;
      return h("div", {key: id, className: "app-triprow"}, h("a", {href: A.href(S.page, "", id), className: A.cx("app-tile app-tile--btn", id === S.cur && "is-current"), onClick: function(){ S.dialog = null; }},
        h(T.TripAvatar, {initials: t.short, label: t.name, color: A.COLORS[t.color % 6], active: id === S.cur}),
        h("span", {style:{flex:1, minWidth:0}}, h("span", {className: "body-strong", style:{display:"block"}}, t.name), h("span", {className: "body-sm app-muted"}, D.fmtRange(t.start, t.end)))),
        h(T.IconButton, {icon: "settings", label: "Gezi ayarları: " + t.name, size: "lg", onClick: function(){
          if(id !== S.cur){ try{ history.replaceState(null, "", A.href(S.page, "", id)); }catch(e){} A.route(); }
          S.dialog = {kind: "trip-settings"}; A.render(); }}));
    }), h(T.Button, {variant: "primary", icon: "plus", full: true, onClick: function(){ S.dialog = {kind: "trip-new"}; A.render(); }}, "Yeni gezi")));
}

/* Kaydetmeden çıkış sorusu: açık pencerenin üstünde */
function Discard(){
  return h(T.Dialog, {title: "Kaydetmeden çıkılsın mı?", description: "Girdiğin bilgiler kaydedilmedi; çıkarsan kaybolur.", width: "400px", onClose: keep},
    h(Foot, null, h(T.Button, {variant: "ghost", onClick: keep}, "Düzenlemeye dön"), h(T.Button, {variant: "danger", onClick: close}, "Kaydetmeden çık")));
}
A.Dialogs = function(){
  var d = S.dialog;
  if(!d){ S.dirty = false; S.askClose = false; S._dlgKey = null; return null; }
  /* başka bir pencere açıldıysa değişiklik izi sıfırlanır */
  var key = d.kind + ":" + (d.id || d.newIn || "");
  if(S._dlgKey !== key){ S._dlgKey = key; S.dirty = false; S.askClose = false; }
  var main = h(Route), q = S.askClose ? h(Discard, {key: "discard"}) : null;
  return q ? h(F, null, main, q) : main;
};
function Route(){
  var d = S.dialog; if(!d) return null;
  var t = A.trip();
  if(d.kind === "trip-new" || d.kind === "trip-settings") return h(TripDialog, {kind: d.kind, key: d.kind});
  if(d.kind === "trip-menu") return h(TripMenu);
  if(d.kind === "profile"){ setTimeout(function(){ S.dialog = null; S.profBack = location.hash || "#home"; location.hash = "profil"; }, 0); return null; }
  if(d.kind === "activity" && A.trip()) return h(A.Chat);
  if(d.kind === "idea-add" && A.trip()) return h(IdeaAdd, {id: d.id, day: d.day, key: d.id});
  if(!t) return null;
  if(d.kind === "plan") return h(PlanDialog, {id: d.id, newIn: d.newIn, key: d.id || "new"});
  if(d.kind === "plan-delete"){
    var it = t.items[d.id];
    return h(T.Dialog, {title: "Kalıcı olarak silinsin mi?", description: "“" + (it ? it.title : "") + "” kenar listesinden de kalkar.", width: "440px", onClose: ask},
      h(Foot, null, h(T.Button, {variant: "ghost", onClick: ask}, "Vazgeç"), h(T.Button, {variant: "danger", icon: "trash", onClick: function(){
        var snap = A.snapshot(), w = A.whereIs(t, d.id), arr = A.listOf(t, w); arr.splice(arr.indexOf(d.id), 1); delete t.items[d.id]; A.commit(); close(); A.flash("Silindi.", function(){ A.restore(snap); }); }}, "Sil")));
  }
  if(d.kind === "transit") return h(TransitSheet, {id: d.id, day: d.day, step: d.step, key: (d.id || "new") + (d.step || 0)});
  if(d.kind === "check") return h(CheckDialog, {id: d.id, group: d.group});
  if(d.kind === "ticket") return h(A.TicketView, {id: d.id});
  if(d.kind === "keyinfo") return h(KeyInfoDialog);
  if(d.kind === "expense") return h(T.Sheet, {title: d.id ? "Harcamayı düzenle" : "Harcama ekle", placement: A.isPhone ? "bottom" : "right", onClose: ask, direction: "none"},
    h(A.ExpenseForm, {t: t, id: d.id, preset: d.preset, title: false, onDone: close}));
  if(d.kind === "photo") return h(T.Sheet, {title: "Fotoğraf", placement: "bottom", onClose: function(){ A.view().photo = null; close(); }, direction: "none"}, h(A.GaleriAside, {t: t, v: A.view(), noAdd: true}));
  return null;
};
})();
