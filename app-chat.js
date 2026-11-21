/* Gezi sohbeti: mesajlar ve son hareketler tek akışta; mesajda harcama, plan, bilet, madde ya da fotoğraf etiketlenir. */
(function(){
"use strict";
var A = window.TPA, D = A.D, T = A.T, h = A.h, F = A.F, S = A.S;

function chatApi(){ var B = window.TPB; return B && B.chat && B.chat.available() ? B.chat : null; }
A.chatApi = chatApi;
function ChatIcon(p){
  var s = p.size || 22;
  return h("svg", {className: "tp-icon", width: s, height: s, viewBox: "0 0 24 24", "aria-hidden": "true"},
    h("path", {d: "M4.5 6.8c0-1.3 1-2.3 2.3-2.3h10.4c1.3 0 2.3 1 2.3 2.3v7.4c0 1.3-1 2.3-2.3 2.3H11l-4.2 3.2c-.4.3-.9 0-.9-.5v-2.7h-.1c-1.3 0-2.3-1-2.3-2.3V6.8z", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round"}),
    h("path", {d: "M8.5 9.5h7M8.5 12.5h4.5", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round"}));
}
A.ChatIcon = ChatIcon;

/* ---------- Okunmamışlar ---------- */
function msgs(t){ var c = chatApi(); return c ? c.get(t.id).list : []; }
A.unseen = function(t){
  if(!t) return 0;
  var seen = A.view().seenAt || "", n = 0;
  (t.activity || []).forEach(function(a){ if(!A.isMine(a.by) && a.at > seen) n++; });
  msgs(t).forEach(function(m){ if(!A.isMine(m.by) && m.at > seen) n++; });
  return n;
};
A.openChat = function(ref){
  var t = A.trip(); if(!t) return;
  if(ref){ S.chatDraft = S.chatDraft && S.chatDraft.trip === t.id ? S.chatDraft : {trip: t.id, text: "", refs: []};
    if(!S.chatDraft.refs.some(function(r){ return r.k === ref.k && r.id === ref.id; })) S.chatDraft.refs = S.chatDraft.refs.concat([ref]).slice(0, 6); }
  S.dialog = {kind: "activity"}; A.render();
};
A.ActivityButton = function(p){
  var t = A.trip(), c = chatApi();
  React.useEffect(function(){ if(t && c) c.watch(t.id); }, [t && t.id, !!c]);
  if(!t || A.offTrip()) return null;
  var n = A.unseen(t);
  return h("button", {type: "button", className: "app-actbtn" + (p.onShell ? " is-shell" : ""), "aria-label": (c ? "Sohbet" : "Son hareketler") + (n ? ", " + n + " yeni" : ""), title: c ? "Sohbet" : "Son hareketler",
      onClick: function(){ A.openChat(); }},
    c ? h(ChatIcon, {size: p.size || 22}) : h(T.Icon, {name: "bell", size: p.size || 22}), n ? h("span", {className: "app-actbtn__n"}, n > 9 ? "9+" : n) : null);
};

/* ---------- Etiketlenebilir kayıtlar ---------- */
var REF_ICON = {expense: "wallet", plan: "calendar", transit: "route", check: "checklist", photo: "gallery"};
function resolve(t, r){
  if(r.k === "expense"){ var e = t.expenses.find(function(x){ return x.id === r.id; }); return e ? {title: e.title || D.EXP_CATS[e.cat], sub: D.fmtMoney(e.amount, e.currency) + ", " + A.dayLabel(t, e.day) + (e.time ? " " + e.time : ""), act: {kind: "expense", ref: e.id}} : null; }
  if(r.k === "plan" || r.k === "transit"){ var it = t.items[r.id]; if(!it) return null; var w = A.whereIs(t, r.id);
    return {title: it.title || "Plan", sub: (A.dayById(t, w) ? A.dayLabel(t, w) : "Kenar listesi") + (it.time ? ", " + it.time : ""), act: {kind: it.cat === "ulasim" ? "transit" : "plan", ref: r.id}}; }
  if(r.k === "check"){ var c = t.checklist.find(function(x){ return x.id === r.id; }); return c ? {title: c.title, sub: c.done ? "Tamamlandı" : "Hazırlık, yapılacak", act: {kind: "check", ref: c.id}} : null; }
  if(r.k === "photo"){ var ph = t.photos.find(function(x){ return x.id === r.id; }); return ph ? {title: "Fotoğraf", sub: A.dayLabel(t, ph.day), photo: D.photoUrl(ph.asset), act: {kind: "photo", ref: ph.id}} : null; }
  return null;
}
function RefCard(p){
  var t = p.t, r = p.r, x = resolve(t, r);
  var inner = h(F, null,
    x && x.photo ? h("img", {className: "app-ref__img", src: x.photo, alt: ""}) : h("span", {className: "app-ref__icon"}, h(T.Icon, {name: REF_ICON[r.k] || "dot", size: 16})),
    h("span", {className: "app-ref__text"}, h("span", {className: "body-sm-strong app-ellipsis"}, x ? x.title : (r.l || "Kayıt")), h("span", {className: "app-ref__sub app-ellipsis"}, x ? x.sub : "Silinmiş")),
    p.onRemove ? h("span", {role: "button", tabIndex: 0, className: "app-ref__x", "aria-label": "Etiketi kaldır", onClick: function(e){ e.stopPropagation(); p.onRemove(); }}, h(T.Icon, {name: "close", size: 14})) : null);
  if(p.onRemove || !x) return h("span", {className: "app-ref" + (x ? "" : " is-gone")}, inner);
  return h("button", {type: "button", className: "app-ref", onClick: function(){ A.openRef(t, x.act); }}, inner);
}
function candidates(t){
  var out = [];
  t.expenses.slice().reverse().forEach(function(e){ out.push({k: "expense", id: e.id, l: e.title || D.EXP_CATS[e.cat], s: D.fmtMoney(e.amount, e.currency) + ", " + A.dayLabel(t, e.day)}); });
  t.days.forEach(function(d){ d.items.forEach(function(id){ var it = t.items[id]; if(!it) return; out.push({k: it.cat === "ulasim" ? "transit" : "plan", id: id, l: it.title || "Plan", s: A.dayLabel(t, d.id) + (it.time ? ", " + it.time : "")}); }); });
  t.ideas.concat(t.removed).forEach(function(id){ var it = t.items[id]; if(it) out.push({k: "plan", id: id, l: it.title || "Öneri", s: "Kenar listesi"}); });
  t.checklist.forEach(function(c){ out.push({k: "check", id: c.id, l: c.title, s: c.done ? "Tamamlandı" : "Hazırlık"}); });
  t.photos.slice().reverse().forEach(function(ph){ out.push({k: "photo", id: ph.id, l: "Fotoğraf", s: A.dayLabel(t, ph.day), src: D.photoUrl(ph.asset)}); });
  return out;
}
var KIND_LABEL = {"": "Tümü", expense: "Harcamalar", plan: "Plan", transit: "Ulaşım", check: "Hazırlık", photo: "Fotoğraflar"};
function Picker(p){
  var t = p.t, q = React.useState(""), k = React.useState("");
  var all = candidates(t), n = q[0].trim().toLocaleLowerCase("tr");
  var list = all.filter(function(c){ return (!k[0] || c.k === k[0]) && (!n || (c.l + " " + c.s).toLocaleLowerCase("tr").indexOf(n) > -1); }).slice(0, 40);
  return h("div", {className: "app-picker"},
    h("div", {className: "app-picker__head"},
      h("label", {className: "app-search", style: {flex: 1}}, h(T.Icon, {name: "search", size: 16}),
        h("input", {className: "body-sm", type: "search", placeholder: "Harcama, plan, bilet ara", value: q[0], autoFocus: !A.isPhone, onChange: function(e){ q[1](e.target.value); }, "aria-label": "Etiketlenecek kaydı ara"})),
      h(T.IconButton, {icon: "close", label: "Kapat", size: "sm", onClick: p.onClose})),
    h("div", {className: "app-quickchips", role: "group", "aria-label": "Tür", style: {margin: "0 0 var(--space-2)"}}, Object.keys(KIND_LABEL).map(function(x){
      return h("button", {key: x || "all", type: "button", className: "app-quickchip", "aria-pressed": k[0] === x ? "true" : "false", onClick: function(){ k[1](x); }}, KIND_LABEL[x]);
    })),
    h("div", {className: "app-picker__list"}, list.length ? list.map(function(c){
      return h("button", {key: c.k + c.id, type: "button", className: "app-picker__row", onClick: function(){ p.onPick({k: c.k, id: c.id, l: D.str(c.l, 80)}); }},
        c.src ? h("img", {className: "app-ref__img", src: c.src, alt: ""}) : h("span", {className: "app-ref__icon"}, h(T.Icon, {name: REF_ICON[c.k], size: 16})),
        h("span", {className: "app-ref__text"}, h("span", {className: "body-sm-strong app-ellipsis"}, c.l), h("span", {className: "app-ref__sub app-ellipsis"}, c.s)),
        h(T.Icon, {name: "plus", size: 16, className: "app-picker__plus"}));
    }) : h("p", {className: "body-sm app-muted", style: {margin: "var(--space-3)"}}, "Eşleşen kayıt yok.")));
}

/* ---------- Akış ---------- */
var ACT_ICON = {expense: "wallet", plan: "calendar", idea: "calendar", transit: "route", check: "checklist", done: "check", photo: "gallery"};
var ACT_TO_REF = {expense: "expense", plan: "plan", idea: "plan", transit: "transit", check: "check", done: "check", photo: "photo"};
function dayKey(iso){ var d = new Date(iso); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
function hhmm(iso){ var d = new Date(iso); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function Chat(p){
  var t = A.trip(), v = A.view(), api = chatApi();
  var seen = React.useState(v.seenAt || "")[0], text = React.useState(S.chatDraft && S.chatDraft.trip === t.id ? S.chatDraft.text : "");
  var refs = React.useState(S.chatDraft && S.chatDraft.trip === t.id ? S.chatDraft.refs : []), pick = React.useState(false), busy = React.useState(false), err = React.useState("");
  var scRef = React.useRef(null), taRef = React.useRef(null), leaving = React.useState(false), ctx = React.useState(null);
  var chat = api ? api.get(t.id) : {list: [], state: "none"};
  React.useEffect(function(){ if(api){ api.watch(t.id); api.refresh(t.id); } }, []);
  React.useEffect(function(){ v.seenAt = new Date().toISOString(); A.saveViews(); });
  var items = (t.activity || []).slice(0, 150).map(function(a){ return {type: "a", at: a.at, a: a}; })
    .concat(chat.list.map(function(m){ return {type: "m", at: m.at, m: m}; }))
    .sort(function(x, y){ return x.at < y.at ? -1 : (x.at > y.at ? 1 : 0); });
  var count = items.length;
  React.useEffect(function(){ var el = scRef.current; if(el) el.scrollTop = el.scrollHeight; }, [count, pick[0]]);
  function keep(tx, rs){ S.chatDraft = {trip: t.id, text: tx, refs: rs}; }
  function close(){ leaving[1](true); setTimeout(function(){ S.dialog = null; A.render(); }, 200); }
  function send(e){
    if(e) e.preventDefault();
    var body = text[0].trim(); if(!body && !refs[0].length) return;
    if(!api){ err[1]("Sohbet bu sürümde yok."); return; }
    busy[1](true); err[1]("");
    api.send(t.id, D.str(body, 2000), refs[0]).then(function(){ busy[1](false); }, function(x){ busy[1](false); err[1](x && x.code === "permission_denied" ? "Bu geziye mesaj yazma iznin yok." : "Gönderilemedi. Bağlantını kontrol et."); });
    text[1](""); refs[1]([]); keep("", []); pick[1](false);
    /* WhatsApp gibi: gönderince klavye açık kalır */
    if(taRef.current){ taRef.current.style.height = ""; taRef.current.focus(); }
  }
  var me = A.who().by, groups = [], last = null, today = dayKey(new Date().toISOString()), yest = dayKey(new Date(Date.now() - 864e5).toISOString()), prevBy = null;
  items.forEach(function(x){ var k = dayKey(x.at); if(k !== last){ groups.push({k: k, rows: []}); last = k; prevBy = null; } groups[groups.length - 1].rows.push(x); });
  var timeline = groups.map(function(g){
    prevBy = null;
    return h("section", {key: g.k, className: "app-chat__day"},
      h("div", {className: "app-chat__sep"}, h("span", {className: "label"}, g.k === today ? "Bugün" : (g.k === yest ? "Dün" : D.fmtDay(g.k).label))),
      g.rows.map(function(x){
        if(x.type === "a"){
          var a = x.a, nm = A.nameOf(a.by, a.byName); prevBy = null;
          function mention(){
            var r = {k: ACT_TO_REF[a.kind], id: a.ref, l: D.str(a.text, 80)}; if(!resolve(t, r)) return;
            var rs = refs[0].some(function(y){ return y.k === r.k && y.id === r.id; }) ? refs[0] : refs[0].concat([r]).slice(0, 6); refs[1](rs); keep(text[0], rs); if(taRef.current) taRef.current.focus();
          }
          return h("div", {key: "a" + a.id, className: "app-chat__act" + (!A.isMine(a.by) && a.at > seen ? " is-new" : "")},
            h("button", Object.assign({type: "button", className: "app-chat__actmain", onClick: function(){ A.openRef(t, a); }},
              api ? A.longPress(function(rect){ ctx[1]({rect: rect, align: "left", items: [{label: "Sohbette bahset", icon: "share", onClick: mention}, {label: "Göster", icon: "eye", onClick: function(){ A.openRef(t, a); }}]}); }) : {}),
              h(T.Icon, {name: ACT_ICON[a.kind] || "dot", size: 14}), h("span", {className: "app-chat__acttext"}, h("strong", null, nm), " " + a.text), h("span", {className: "app-chat__time"}, hhmm(a.at))));
        }
        var m = x.m, mine = me && m.by === me, first = prevBy !== m.by; prevBy = m.by;
        return h("div", {key: "m" + m.id, className: "app-msg" + (mine ? " is-mine" : "") + (first ? " is-first" : "") + (m.pending ? " is-pending" : "") + (!mine && m.at > seen ? " is-new" : "")},
          !mine ? h("span", {className: "app-msg__who", style: {background: first ? "var(--category-" + A.personColor(m.by) + "-strong)" : "transparent"}, "aria-hidden": "true"}, first ? (m.byName || "?").slice(0, 1).toLocaleUpperCase("tr") : "") : null,
          h("div", Object.assign({className: "app-msg__bubble", tabIndex: 0, "aria-label": (mine ? "Senin mesajın" : (m.byName || "Biri")) + ": " + (m.body || "kayıt") + ". Seçenekler için basılı tut."},
            A.longPress(function(rect){ ctx[1]({rect: rect, align: mine ? "right" : "left", items: [
              m.body && navigator.clipboard ? {label: "Kopyala", icon: "copy", onClick: function(){ navigator.clipboard.writeText(m.body).then(function(){ A.flash("Kopyalandı."); }, function(){}); }} : null,
              mine && !m.pending ? {label: "Sil", icon: "trash", danger: true, onClick: function(){ api.remove(t.id, m.id); }} : null].filter(Boolean)}); }),
            {onKeyDown: function(e){ if(e.key === "Enter" || e.key === "ContextMenu"){ e.preventDefault(); var r = e.currentTarget.getBoundingClientRect(); ctx[1]({rect: r, align: mine ? "right" : "left", items: [
              m.body && navigator.clipboard ? {label: "Kopyala", icon: "copy", onClick: function(){ navigator.clipboard.writeText(m.body); }} : null,
              mine && !m.pending ? {label: "Sil", icon: "trash", danger: true, onClick: function(){ api.remove(t.id, m.id); }} : null].filter(Boolean)}); } }}),
            !mine && first ? h("span", {className: "app-msg__name"}, m.byName || "Biri") : null,
            m.body ? h("p", {className: "app-msg__body"}, m.body) : null,
            m.refs.length ? h("div", {className: "app-msg__refs"}, m.refs.map(function(r, i){ return h(RefCard, {key: i, t: t, r: r}); })) : null,
            h("span", {className: "app-msg__time"}, hhmm(m.at))));
      }));
  });
  var empty = !items.length ? h("div", {className: "app-actempty"}, h(ChatIcon, {size: 28}),
    h("p", {className: "body-sm app-muted", style: {margin: 0}}, api ? "Yol arkadaşlarınla buradan yazış. Bir harcamayı, planı ya da bileti # ile etiketleyebilirsin; eklenenler de burada akar." : "Sen ya da yol arkadaşların plan, bilet, harcama ya da fotoğraf ekledikçe burada görünür.")) : null;
  var notice = api && chat.state === "missing" ? h("p", {className: "app-chat__notice body-sm"}, "Sohbet henüz kurulmadı: Supabase'te chat.sql dosyasını bir kez çalıştırman gerekiyor.") : null;
  return h("div", {className: "app-chatwrap" + (leaving[0] ? " is-leaving" : ""), onMouseDown: function(e){ if(e.target === e.currentTarget) close(); }, onKeyDown: function(e){ if(e.key === "Escape"){ e.stopPropagation(); if(pick[0]) pick[1](false); else close(); } }},
    h("section", {className: "app-chat", role: "dialog", "aria-modal": "true", "aria-label": (api ? "Sohbet" : "Son hareketler") + ": " + t.name},
      h("header", {className: "app-chat__head"},
        h(A.TripMark, {t: t}),
        h("div", {style: {flex: 1, minWidth: 0}}, h("div", {className: "heading app-ellipsis"}, api ? "Sohbet" : "Son hareketler"), h("div", {className: "body-sm app-muted app-ellipsis"}, t.name)),
        h(T.IconButton, {icon: "close", label: "Kapat", onClick: close})),
      h("div", {ref: scRef, className: "app-chat__scroll"}, notice, empty, timeline),
      ctx[0] && ctx[0].items.length ? h(A.ContextMenu, {rect: ctx[0].rect, align: ctx[0].align, items: ctx[0].items, onClose: function(){ ctx[1](null); }}) : null,
      api ? h("form", {className: "app-chat__compose", onSubmit: send},
        pick[0] ? h(Picker, {t: t, onClose: function(){ pick[1](false); }, onPick: function(r){
          var rs = refs[0].some(function(y){ return y.k === r.k && y.id === r.id; }) ? refs[0] : refs[0].concat([r]).slice(0, 6); refs[1](rs); keep(text[0], rs); pick[1](false); if(taRef.current) taRef.current.focus(); }}) : null,
        refs[0].length ? h("div", {className: "app-chat__refs"}, refs[0].map(function(r, i){ return h(RefCard, {key: r.k + r.id, t: t, r: r, onRemove: function(){ var rs = refs[0].filter(function(_, j){ return j !== i; }); refs[1](rs); keep(text[0], rs); }}); })) : null,
        err[0] ? h("p", {className: "body-sm tp-field__error", role: "alert", style: {margin: "0 0 var(--space-2)"}}, err[0]) : null,
        h("div", {className: "app-chat__bar"},
          h("button", {type: "button", className: "app-chat__tag" + (pick[0] ? " is-on" : ""), "aria-label": "Kayıt etiketle", title: "Harcama, plan ya da bilet etiketle", "aria-expanded": pick[0] ? "true" : "false", onClick: function(){ pick[1](!pick[0]); }}, "#"),
          h("textarea", {ref: taRef, className: "app-chat__input", rows: 1, value: text[0], placeholder: "Mesaj yaz", "aria-label": "Mesaj",
            onChange: function(e){ text[1](e.target.value); keep(e.target.value, refs[0]); var el = e.target; el.style.height = "auto"; el.style.height = Math.min(120, el.scrollHeight) + "px"; },
            onKeyDown: function(e){ if(e.key === "Enter" && !e.shiftKey && !A.isPhone){ e.preventDefault(); send(); } }}),
          h("button", {type: "submit", className: "app-quick__go", "aria-label": "Gönder", onMouseDown: function(e){ e.preventDefault(); }, onPointerDown: function(e){ if(e.pointerType !== "mouse") e.preventDefault(); }, disabled: busy[0] || (!text[0].trim() && !refs[0].length)}, h(T.Icon, {name: "arrow-right", size: 20})))) : null));
}
A.Chat = Chat;
})();
