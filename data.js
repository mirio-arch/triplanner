/* Triplanner veri katmanı: gezi modeli, başlangıç verisi, doğrulama, bu tarayıcıda ve sunucuda saklama. */
(function(){
"use strict";
/* ================= Sabitler ================= */
var CATS = {tarih:"Tarih", muze:"Müze", doga:"Doğa", gezi:"Gezi", etkinlik:"Etkinlik", yemek:"Yemek", alisveris:"Alışveriş", ulasim:"Ulaşım", konaklama:"Konaklama"};
var GEO_LETTERS = ["ა","ბ","გ","დ","ე"];
var GROUPS = [["belge","Belgeler"],["konaklama","Bilet ve konaklama"],["ulasim","Rezervasyon ve ulaşım"],["canta","Çanta ve diğer"]];
var PAGES = ["tarihler","ulasim","hazirlik"];
var PAGE_LABEL = {tarihler:"tarihler", ulasim:"ulaşım", hazirlik:"ön-gereksinimler"};
var MONTHS = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
var WD = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"], WDS = ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
var GEORGIA_DATES = ["2026-12-30","2026-12-31","2027-01-01","2027-01-02","2027-01-03"];
var MAX_DAYS = 31;

/* ================= Gürcistan gezisinin başlangıç verisi ================= */
var SEED_DAYS = {
  d0:{title:"Havalimanından Batum'a", night:"Gece: Batum · Old City Apartment", items:[
    ["a1","19:35 TR","İstanbul → Rize-Artvin","21:20'de iniş. Bagajı alıp doğrudan çıkışa.","ulasim","",false],
    ["a2","21:40 TR","Havalimanı → Sarp","Önceden ayarlı transfer veya taksi, ~1 saat. Ucuz yol: Havaş'ın Artvin hattıyla Hopa'ya, oradan 15 dakikalık taksi.","ulasim","https://www.e-yasamrehberi.com/havas/artvin-rize-artvin-havalimani-havas-otobus-saatleri.html",false],
    ["a3","~22:50 TR","Sarp sınır geçişi","Çipli kimlik veya pasaport, sağlık + kaza sigortası, önceden ödenmiş çıkış harcı. Geçince saati 1 saat ileri al.","ulasim","",false],
    ["a4","~01:00 GE","Bolt ile Old City Apartment","Piazza'nın yanı, ~25 dakika. Ev sahibine geç giriş saatini önceden yaz.","konaklama","https://www.airbnb.co.uk/rooms/33438687",false]
  ]},
  d1:{title:"Batum ve yılbaşı gecesi", night:"Gece: Batum · Old City Apartment", items:[
    ["b1","10:00","Geç kahvaltı: lobiani","Bir fırından sıcak lobiani (fasulyeli) veya peşmet haçapuri.","yemek","",false],
    ["b2","10:45","Avrupa Meydanı","Medea heykeli Altın Post efsanesine gönderme. 1893'te Bakü–Batum demiryolunun son durağı buradaydı. Yeni Yıl Köyü pazarı da burada kuruluyor.","tarih","https://visitajara.com/en/sights/127",false],
    ["b3","11:15","Piazza ve eski şehir sokakları","Zemini Avrupa'nın en büyük figüratif mermer mozaiklerinden biri.","gezi","https://georgia.travel/family-attractions/batumi-europe-square",false],
    ["b4","11:45","Orta Cami ve Batum Katedrali","Acara'nın Müslüman ve Ortodoks mirasını 10 dakika arayla gör.","tarih","",false],
    ["b5","12:30","Öğle: Acara haçapurisi","Shemoikhede Genatsvale (eski şehir, uygun fiyatlı) ya da sahildeki Retro.","yemek","https://restaurantsforkings.pages.dev/city/batumi/",false],
    ["b6","14:00","Acara Devlet Müzesi","Bölge tarihi ve Gonio Kalesi'nde bulunan Roma dönemi altın takılar (Gonio Hazinesi).","muze","",false],
    ["b7","15:15","Acara Sanat Müzesi","Pirosmani'den modern döneme Gürcü resmi. Salı–Pazar 10:00–18:00, ~6 GEL; yılbaşı günü erken kapanabilir.","muze","https://holidify.com/places/batumi/adjara-art-museum-sightseeing-1271253.html",false],
    ["b8","16:15","Boni Pazarı","Çurçhela, Svan tuzu, baharat, şarap. Satın almadan önce bir tur atıp fiyatları karşılaştır.","alisveris","https://yandex.com.ge/maps/org/rynok_boni/4936362384/reviews",false],
    ["b9","17:00","Sahil Bulvarı: Alfabe Kulesi, Ali ve Nino","Kule Gürcü alfabesinin 33 harfini taşıyor. Ali ve Nino heykelleri hareket edip birleşip ayrılıyor.","gezi","",false],
    ["b10","17:45","Argo teleferiği (isteğe bağlı)","Hava açıksa şehir ve liman manzarası.","gezi","",false],
    ["b11","18:30","Dairede dinlenme","Gece uzun.","konaklama","",false],
    ["b12","21:00","Yılbaşı yemeği","Rezervasyonlu. Aday: Café Literaturuli (eski şehir, modern Acara mutfağı).","yemek","https://restaurantsforkings.com/city/batumi/",false],
    ["b13","23:15","Avrupa Meydanı ve Bulvar","Açık hava konseri; gece yarısı her köşede havai fişek. Kalabalığın ortasında değil kenarında dur.","etkinlik","https://infobatumi.ge/en/?p=26017",false]
  ]},
  d2:{title:"Botanik Bahçesi ve Kutaisi'ye geçiş", night:"Gece: Kutaisi", items:[
    ["c1","10:30","Geç kahvaltı, daireden çıkış","Resmi tatil: bankalar kapalı, restoranlar genelde açık.","konaklama","",false],
    ["c2","11:15","Batum Botanik Bahçesi","1912'de kuruldu. Yabancılar için 20 GEL. Deniz manzaralı patikalar için 2 saat ayır.","doga","https://old.visitajara.com/en/discounts-place/Batumi_Botanical_Garden",false],
    ["c3","13:30","Öğle yemeği","","yemek","",false],
    ["c4","14:30","Kutaisi'ye hareket (~2,5–3 saat)","GoTrip şoförlü araç (molalar ücretsiz), City Bus ya da marshrutka (~20 GEL). 1 Ocak'ta seferler azalabilir.","ulasim","https://gotrip.ge",false],
    ["c5","17:30","Kutaisi'de yerleşme","","konaklama","",false],
    ["c6","18:30","Kolhis Çeşmesi ve Beyaz Köprü","Çeşmedeki altın figürler antik Kolhis eserlerinin büyütülmüş kopyaları: Altın Post efsanesinin toprakları.","tarih","",false],
    ["c7","20:00","Akşam: Palaty","İmeruli haçapuri: yuvarlak, ince hamurlu, içi İmeret peyniri. 1 Ocak'ta açık mı, ara.","yemek","https://atlys.com/blog/best-georgian-food",false]
  ]},
  d3:{title:"Gelati, mağaralar ve Bagrati", night:"Gece: Kutaisi", items:[
    ["e1","09:30","Gelati Manastırı (UNESCO)","1106'da IV. David kurdu; ortaçağın önemli akademilerinden. 1130'lardan Meryem ve Çocuk mozaiği. Ücretsiz; ana kilise restorasyonda olabilir.","tarih","https://www.triplinkhub.com/en/georgia/kutaisi/places/gelati-monastery",false],
    ["e2","11:00","Motsameta Manastırı","Rioni vadisine bakan uçurum kenarında, Gelati'den 10 dakika.","tarih","",false],
    ["e3","12:00","Sataplia Koruma Alanı","1934'te bulunan dinozor ayak izleri, karst mağarası, cam seyir terası. 10:00–17:00, ~17 GEL, rehber dahil.","doga","https://www.nationalparks.ge/en/site/sataplia",false],
    ["e4","13:30","Öğle yemeği","","yemek","",false],
    ["e5","14:30","Prometheus Mağarası","1,4 km yürüyüş, içerisi ~14 °C. 10:00–17:00, ~25 GEL. Su seviyesi uygunsa tekne turu.","doga","https://nationalparks.ge/en/site/prometheuscave",false],
    ["e6","16:45","Bagrati Katedrali","1003'te III. Bagrat yaptırdı. Tartışmalı restorasyonu yüzünden 2017'de UNESCO listesinden çıkarıldı. Gün batımı manzarası.","tarih","https://appsavvytraveller.com/things-to-do-in-kutaisi/",false],
    ["e7","19:30","Akşam: Lilestan","İmeret yemeklerinden tadım tabağı.","yemek","https://wander-lush.org/best-kutaisi-restaurants/",false]
  ]},
  d4:{title:"Yeşil Pazar, Gonio ve dönüş", night:"Dönüş: 4 Oca 00:10 İstanbul", items:[
    ["f1","08:00","Kutaisi Yeşil Pazar","Kısa bir tur: çurçhela, baharat, tkemali. Satıcılar tadım yaptırıyor.","alisveris","https://georgia.to/places-to-go/imereti/kutaisi/kutaisi-green-bazaar/",false],
    ["f2","08:40","Batum'a hareket","City Bus 08:40 → 11:00 (saati TKT.GE'den teyit et) ya da marshrutka ~3 saat.","ulasim","https://tkt.ge/en/citybus",false],
    ["f3","11:30","Batum: öğle ve son alışveriş","Acara haçapurisi için son şans; eski şehirde hediyelik.","yemek","",false],
    ["f4","15:00","Gonio-Apsaros Kalesi","1. yüzyıl Roma kalesi; Havari Matthias'ın sembolik mezarı. 16 numaralı otobüs kapısında duruyor.","tarih","https://www.triplinkhub.com/en/georgia/batumi/places/gonio-apsaros-fortress",false],
    ["f5","16:15","Gonio → Sarp","16 numaralı otobüs veya Bolt, ~10 dakika.","ulasim","",false],
    ["f6","16:30 GE","Sarp sınırı: en geç bu saatte","Türkiye saatiyle 15:30. Tatil dönüşü kuyruğu 1–3 saat sürebilir; saatini 1 saat geri al.","ulasim","",true],
    ["f7","~18:00 TR","Sarp → Rize-Artvin Havalimanı","Transferi önceden ayarla, ~1 saat. Yedek: Hopa'dan son Havaş 19:45.","ulasim","https://e-yasamrehberi.com/havaalanlari/rize-artvin-havalimani-ulasim.html",false],
    ["f8","22:10 TR","İstanbul uçuşu","4 Ocak 00:10'da iniş; havalimanından eve dönüşü ayarla.","ulasim","",false]
  ]}
};
var SEED_IDEAS = [
  ["s1","","Retro","Sahil bulvarında; Acara haçapurisinin en eski ve en bilinen adreslerinden. Hep kalabalık.","yemek","https://www.airbnb.se/things-to-do/places/531269",false],
  ["s2","","Batum Balık Pazarı","Şehir girişinde; taze Karadeniz balığı.","yemek","https://georgia.travel/markets/batumi-seafood-market",false],
  ["s3","","Batumi Art House","Seçilmiş Gürcü el sanatları ve tasarım, Parnavaz Mepe Sokağı. Pazardan pahalı ama kaliteli.","alisveris","https://www.tripbase.com/destinations/batumi-georgia/shopping/",false],
  ["s4","","Batum Arkeoloji Müzesi","Eylül 2024'ten beri restorasyon için kapalıydı; açıldıysa Acara Devlet Müzesi yerine git.","muze","https://madloba.info/en/blog/museums-of-georgia/batumskiy-arkheologicheskiy-muzey/",false],
  ["s5","","Doli (Communal Hotel)","Kutaisi'nin iddialı restoranı; Tiflis'in iyi restoranlarını işleten grubun.","yemek","https://wander-lush.org/best-kutaisi-restaurants/",false],
  ["s6","","Gala","Gürcü klasikleri, iyi hinkali ve İmeret şarapları.","yemek","https://wander-lush.org/best-kutaisi-restaurants/",false],
  ["s7","","Rehberli manastır turu","Bagrati, Gelati ve Motsameta; 3 saat, 24 USD'den.","tarih","https://magpie.travel/things-to-do/kutaisi-monasteries-gelati-motsameta-bagrati-3-hour-tour/1667d7c8-61f1-4018-a66c-65db0748b2f5",false],
  ["s8","","Hopa'da konaklama (B planı)","Uçak rötar yaparsa geceyi Hopa'da geçirip sınırı sabah geç. Cihan Otel ~50 USD.","konaklama","https://www.expedia.com/Hopa.dx6330716",false],
  ["s9","","Tiflis alternatifi","Yeni tünelle Batum–Tiflis treni ~4 saat. Mtskheta, Narikala, kükürt hamamları; Kutaisi günlerinin yerine.","gezi","https://wander-lush.org/tbilisi-to-batumi-train-bus/",false]
];
var SEED_CHECK = [
  ["k1","belge","Çipli kimlik kartı veya pasaport","Eski nüfus cüzdanı geçmez. Kimlikle 90 gün, pasaportla 1 yıla kadar vizesiz.","https://www.isinolsa.com/?p=55043",false],
  ["k2","belge","Sağlık + kaza sigortası","1 Ocak 2026'dan beri zorunlu. En az 30.000 GEL teminat; poliçede “sağlık” ve “kaza” yazmalı, 30 Ara–3 Oca'yı kapsamalı. Telefonda PDF + bir çıktı.","https://www.allianz.com.tr/tr_TR/seninle-guzel/vize-rehberi/gurcistan-seyahat-saglik-sigortasi-zorunlu-mu-sartlar-ve-fiyatlar.html",false],
  ["k3","belge","Yurt dışı çıkış harcı","2026 tutarı 1.250 TL. e-Devlet veya GİB'den önceden öde; sınırdaki kiosk kuyruğuna kalma.","https://www.sigortam.net/yurt-disi-cikis-harci",false],
  ["k4","konaklama","Uçak biletleri","30 Ara 19:35 → 21:20 · 3 Oca 22:10 → 00:10","",true],
  ["k5","konaklama","Batum: Old City Apartment (30 Ara – 1 Oca)","Piazza'nın yanı, Avrupa Meydanı'na 5 dakika.","https://www.airbnb.co.uk/rooms/33438687",true],
  ["k6","konaklama","Ev sahibine 01:00 geç girişi bildir","Anahtar kutusu mu, karşılama mı? WhatsApp numarasını al. 1 Ocak geç çıkışı ve bavul bırakmayı da sor.","",false],
  ["k7","konaklama","Kutaisi konaklaması (1 – 3 Oca)","Kolhis Çeşmesi çevresi; ücretsiz iptalli seç.","https://www.airbnb.com/colchis-fountain-kutaisi-georgia/stays",false],
  ["k8","ulasim","Yılbaşı yemeği rezervasyonu","31 Ara 21:00. Aday: Café Literaturuli.","https://restaurantsforkings.com/city/batumi/",false],
  ["k9","ulasim","Havalimanı ↔ Sarp transferi","30 Ara ~21:40 ve 3 Oca ~18:00 (Türkiye saati). Gece için önceden ayarla.","",false],
  ["k10","ulasim","Batum → Kutaisi (1 Oca)","GoTrip ile Botanik Bahçesi molalı, ya da City Bus / marshrutka.","https://gotrip.ge",false],
  ["k11","ulasim","Kutaisi → Batum (3 Oca)","City Bus 08:40 → 11:00 ya da GoTrip; saati TKT.GE'den teyit et.","https://tkt.ge/en/citybus",false],
  ["k12","ulasim","İstanbul'da 00:10'dan sonra eve ulaşım","Gece toplu taşıma seyrek: taksi ya da seni alacak biri.","",false],
  ["k13","canta","eSIM / internet","Bolt için Gürcistan'da mobil internet şart; Türk hattıyla dolaşım pahalı.","",false],
  ["k14","canta","Bolt uygulaması","Batum, Kutaisi ve Sarp → Batum için.","https://bolt.eu",false],
  ["k15","canta","Biraz dolar veya avro nakit","Batum'daki döviz bürolarında bozdur; pazar ve marshrutka için lari lazım.","",false],
  ["k16","canta","Kış kıyafeti, şemsiye","Batum 5–12 °C ve yağışlı. Kiliseler için başörtüsü ve etek, erkekler uzun pantolon.","",false]
];
var SEED_KEYINFO = [
  ["ki1","Gidiş","30 Ara 19:35 İstanbul","Rize-Artvin'e iniş 21:20",false],
  ["ki2","Dönüş","3 Oca 22:10 Rize-Artvin","İstanbul'a iniş 4 Oca 00:10",false],
  ["ki3","Sarp sınırı","En geç 3 Oca 16:30 GE","Türkiye saatiyle 15:30; kuyruk 1–3 saat",true],
  ["ki4","Saat farkı","Gürcistan +1 saat","TR = Türkiye, GE = Gürcistan saati",false]
];

/* ================= Tarih yardımcıları ================= */
function parseISO(s){ var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if(!m) return null; var d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3])); return isNaN(d) ? null : d; }
function isoOf(d){ return d.toISOString().slice(0,10); }
function fmtDay(s){ var d = parseISO(s); if(!d) return {label:s, short:s, wd:""}; return {label:d.getUTCDate()+" "+MONTHS[d.getUTCMonth()]+" "+WDS[d.getUTCDay()], short:d.getUTCDate()+" "+MONTHS[d.getUTCMonth()], wd:WD[d.getUTCDay()]}; }
function fmtRange(a, b){
  var A = parseISO(a), B = parseISO(b); if(!A || !B) return "";
  var left = A.getUTCDate()+" "+MONTHS[A.getUTCMonth()] + (A.getUTCFullYear() !== B.getUTCFullYear() ? " "+A.getUTCFullYear() : "");
  return left + " – " + B.getUTCDate()+" "+MONTHS[B.getUTCMonth()]+" "+B.getUTCFullYear();
}
function datesBetween(a, b){ var A = parseISO(a), B = parseISO(b), out = []; if(!A || !B || B < A) return out; for(var d = new Date(A); d <= B && out.length < MAX_DAYS; d.setUTCDate(d.getUTCDate()+1)) out.push(isoOf(d)); return out; }
function dayIdOf(date){ return "d" + date.replace(/-/g,""); }

function str(v,max){ return typeof v === "string" ? v.slice(0,max) : ""; }
function safeLink(l){ return (typeof l === "string" && /^https?:\/\//i.test(l)) ? l.slice(0,600) : ""; }
function esc(v){ return String(v == null ? "" : v).replace(/[&<>"']/g,function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
function uid(p){ return p + Date.now().toString(36) + Math.floor(Math.random()*1e6).toString(36); }
function initials(name){ var w = (name || "").trim().split(/\s+/).filter(Boolean); var s = w.length > 1 ? w[0][0] + w[1][0] : (w[0] || "?").slice(0,2); return s.toLocaleUpperCase("tr"); }

/* ================= Gezi üretimi ================= */
function toItem(a){ return {id:a[0], time:a[1], title:a[2], note:a[3], cat:a[4], link:a[5], critical:!!a[6]}; }
function seedGeorgia(){
  var t = {id:"gurcistan", name:"Gürcistan Yılbaşı", short:"GE", color:0, start:GEORGIA_DATES[0], end:GEORGIA_DATES[4], geo:"georgia",
    guide:"https://claude.ai/artifact/QD7cmpCyymzA7CG5LWPEMi", days:[], items:{}, removed:[], ideas:[], checklist:[], keyinfo:[], expenses:[], photos:[], rate:{}, budget:0, currency:"GEL", countries:["GE"], dest:[{c:"GE", n:"Batum"}, {c:"GE", n:"Kutaisi"}]};
  GEORGIA_DATES.forEach(function(dt, i){
    var sd = SEED_DAYS["d"+i], day = {id:dayIdOf(dt), date:dt, title:sd.title, night:sd.night, items:[]};
    sd.items.forEach(function(a){ var it = toItem(a); t.items[it.id] = it; day.items.push(it.id); });
    t.days.push(day);
  });
  SEED_IDEAS.forEach(function(a){ var it = toItem(a); t.items[it.id] = it; t.ideas.push(it.id); });
  SEED_CHECK.forEach(function(a){ t.checklist.push({id:a[0], group:a[1], title:a[2], note:a[3], link:a[4], done:!!a[5]}); });
  SEED_KEYINFO.forEach(function(a){ t.keyinfo.push({id:a[0], label:a[1], value:a[2], sub:a[3], warn:!!a[4]}); });
  return t;
}
function newTrip(name, short, start, end, color){
  var t = {id:uid("t"), name:name, short:short || initials(name), color:color, start:start, end:end, geo:"", guide:"", days:[], items:{}, removed:[], ideas:[], checklist:[], keyinfo:[], expenses:[], photos:[], rate:{}, budget:0, currency:"", countries:[], dest:[]};
  datesBetween(start, end).forEach(function(dt){ t.days.push({id:dayIdOf(dt), date:dt, title:"", night:"", items:[]}); });
  [["belge","Kimlik veya pasaport","Geçerlilik tarihini ve vize şartını kontrol et."],["belge","Seyahat sağlık sigortası",""],
   ["konaklama","Ulaşım biletleri",""],["konaklama","Konaklama",""],["canta","İnternet / SIM",""],["canta","Yerel para",""]
  ].forEach(function(c){ t.checklist.push({id:uid("k"), group:c[0], title:c[1], note:c[2], link:"", done:false}); });
  t.keyinfo.push({id:uid("ki"), label:"Gidiş", value:fmtDay(start).label, sub:"Saat ve yer ekle", warn:false});
  t.keyinfo.push({id:uid("ki"), label:"Dönüş", value:fmtDay(end).label, sub:"Saat ve yer ekle", warn:false});
  return t;
}

var GEO = {lon0:40.55, lat0:42.6, kx:74.5, ky:100};
function proj(lat, lon){ return [(lon - GEO.lon0) * GEO.kx, (GEO.lat0 - lat) * GEO.ky]; }
var PLACES = {
  rzv:[41.170,40.850,"Rize-Artvin Hav.",1], hopa:[41.395,41.425,"Hopa",1], sarp:[41.522,41.548,"Sarp",1],
  gonio:[41.573,41.573,"Gonio",0], batum:[41.650,41.636,"Batum",1], botanik:[41.693,41.708,"Botanik Bahçesi",0],
  kobuleti:[41.820,41.776,"Kobuleti",1], lanchkhuti:[42.090,42.030,"Lançhuti",1], samtredia:[42.160,42.340,"Samtredia",1],
  kutaisi:[42.271,42.705,"Kutaisi",1], gelati:[42.295,42.768,"Gelati",0], motsameta:[42.283,42.759,"Motsameta",0],
  sataplia:[42.311,42.673,"Sataplia",0], prometheus:[42.377,42.601,"Prometheus",0]
};
var STOPS = {rzv:1, sarp:1, batum:1, botanik:1, kutaisi:1, gelati:1, motsameta:1, sataplia:1, prometheus:1, gonio:1};
var COAST = [[41.06,40.30],[41.06,40.60],[41.10,40.75],[41.18,40.88],[41.19,41.00],[41.27,41.14],[41.35,41.30],[41.41,41.42],[41.48,41.52],[41.52,41.55],[41.57,41.57],[41.62,41.60],[41.66,41.645],[41.68,41.67],[41.70,41.69],[41.73,41.73],[41.82,41.77],[41.92,41.765],[42.00,41.77],[42.08,41.73],[42.15,41.65],[42.30,41.58],[42.40,41.56],[42.70,41.50]];
var BORDER = [[41.522,41.548],[41.50,41.65],[41.47,41.80],[41.52,41.95],[41.57,42.10],[41.55,42.30],[41.50,42.50],[41.45,42.70],[41.35,42.85],[41.28,43.20]];
var RIONI = [[42.40,42.98],[42.31,42.76],[42.27,42.70],[42.21,42.50],[42.17,42.30],[42.15,42.05],[42.17,41.80],[42.15,41.66]];
var ROUTES = {
  d0:{path:["rzv","hopa","sarp","batum"], off:3},
  d1:{loop:"batum"},
  d2:{path:["batum","botanik","kobuleti","lanchkhuti","samtredia","kutaisi"], off:3},
  d3:{path:["kutaisi","gelati","motsameta","sataplia","prometheus","kutaisi"], off:0},
  d4:{path:["kutaisi","samtredia","lanchkhuti","kobuleti","batum","gonio","sarp","hopa","rzv"], off:3}
};
var LEGS = {
  d0:{sub:"Rize-Artvin → Sarp → Batum · gece", legs:[
    ["Rize-Artvin Hav. → Sarp","Transfer veya taksi · <b>~1 saat</b>","Hopa'ya taksi 816–878 TL; Sarp biraz daha uzak. Ucuz yol: Havaş Artvin hattı her inen uçuşa servis yapıyor, Hopa'da in, 15 dakika taksi."],
    ["Sarp sınırı","Yaya geçiş","Kimlik veya pasaport, sigorta poliçesi, ödenmiş çıkış harcı. Gece kuyruk genelde kısa."],
    ["Sarp → Batum (Old City Apartment)","Bolt veya taksi · <b>~25 dakika</b>","16 numaralı otobüsün son seferi 23:06; o saatte Bolt kullan."]]},
  d1:{sub:"Batum içi · yürüyerek", legs:[
    ["Eski şehir ve sahil","Yürüyüş","Avrupa Meydanı, Piazza, Boni Pazarı ve Bulvar birbirine 5–15 dakika."],
    ["Uzun mesafeler","Bolt","Fiyatı uygulama baştan gösteriyor; gece de çalışıyor."]]},
  d2:{sub:"Batum → Botanik Bahçesi → Kutaisi", legs:[
    ["Batum → Botanik Bahçesi","Bolt ~15 dakika ya da 10 no'lu otobüs / 31 no'lu minibüs","Bahçe şehrin ~9 km kuzeyinde, Kutaisi yolu üzerinde."],
    ["Botanik Bahçesi → Kutaisi","GoTrip şoförlü araç · <b>~2,5 saat</b>","Kutaisi–Batum arası araç başı 185 GEL'den; yol boyunca molalar ücretsiz, ödeme varışta nakit."],
    ["Alternatifler","City Bus ~2 sa 10 dk · marshrutka ~3 sa, ~20 GEL · tren (Kopitnari) ~1 sa 45 dk","1 Ocak resmi tatil: seferler azalabilir, saatleri önceden kontrol et."]]},
  d3:{sub:"Kutaisi çevresi · günlük şoför", legs:[
    ["Kutaisi → Gelati → Motsameta","Şoförlü araç","Gelati şehrin ~11 km dışında; Motsameta 10 dakika ötede."],
    ["→ Sataplia → Prometheus → Bagrati","Şoförlü araç","Yerel taksiyle tam gün 100–150 GEL. Alternatif: 3 saatlik rehberli manastır turu, 24 USD'den."]]},
  d4:{sub:"Kutaisi → Batum → Gonio → Sarp → Rize-Artvin", legs:[
    ["Kutaisi → Batum","City Bus 08:40 → 11:00 · marshrutka ~3 sa · GoTrip","Bavul derdi olmasın istersen GoTrip'i Sarp'a kadar tut."],
    ["Batum → Gonio → Sarp","16 no'lu otobüs, 17 dakikada bir · Bolt","Otobüs Çavçavadze Caddesi'nden geçip Gonio Kalesi'nin önünde durur, sınıra kadar gider."],
    ["Sarp sınırı","Yaya geçiş · <b>en geç 16:30 GE</b>","Tatil dönüşü kuyruğu 1–3 saat; saatini 1 saat geri al."],
    ["Sarp → Rize-Artvin Hav.","Transfer · <b>~1 saat</b>","Önceden ayarla. Yedek: Hopa'dan son Havaş 19:45, havalimanına 60 dakika."]]}
};
var GKEY = {}; GEORGIA_DATES.forEach(function(dt, i){ GKEY[dayIdOf(dt)] = "d"+i; });
function gk(dayId){ return GKEY[dayId]; }


/* ================= Harcama, fotoğraf, ulaşım alanları ================= */
var EXP_CATS = {transport:"Ulaşım", stay:"Konaklama", food:"Yemek", fees:"Belge ve harç", shopping:"Alışveriş", sights:"Gezi ve müze"};
var EXP_ORDER = ["transport","stay","food","fees","shopping","sights"];
var EXP_ICON = {transport:"route", stay:"bed", food:"food", fees:"passport", shopping:"bag", sights:"landmark"};
var CURRENCIES = ["TL","GEL","EUR","USD"];
/* Ülkeler: kod (saat kısaltması da bu), ad, saat dilimi, para birimi */
var COUNTRIES = [
  ["TR","Türkiye","Europe/Istanbul","TL"],["KKTC","Kuzey Kıbrıs","Asia/Famagusta","TL"],
  ["GE","Gürcistan","Asia/Tbilisi","GEL"],["AZ","Azerbaycan","Asia/Baku","AZN"],["AM","Ermenistan","Asia/Yerevan","AMD"],
  ["GR","Yunanistan","Europe/Athens","EUR"],["BG","Bulgaristan","Europe/Sofia","EUR"],["RO","Romanya","Europe/Bucharest","RON"],
  ["RS","Sırbistan","Europe/Belgrade","RSD"],["BA","Bosna-Hersek","Europe/Sarajevo","BAM"],["ME","Karadağ","Europe/Podgorica","EUR"],
  ["MK","Kuzey Makedonya","Europe/Skopje","MKD"],["AL","Arnavutluk","Europe/Tirane","ALL"],["XK","Kosova","Europe/Belgrade","EUR"],
  ["HR","Hırvatistan","Europe/Zagreb","EUR"],["SI","Slovenya","Europe/Ljubljana","EUR"],["HU","Macaristan","Europe/Budapest","HUF"],
  ["AT","Avusturya","Europe/Vienna","EUR"],["CZ","Çekya","Europe/Prague","CZK"],["SK","Slovakya","Europe/Bratislava","EUR"],
  ["PL","Polonya","Europe/Warsaw","PLN"],["DE","Almanya","Europe/Berlin","EUR"],["NL","Hollanda","Europe/Amsterdam","EUR"],
  ["BE","Belçika","Europe/Brussels","EUR"],["FR","Fransa","Europe/Paris","EUR"],["ES","İspanya","Europe/Madrid","EUR"],
  ["PT","Portekiz","Europe/Lisbon","EUR"],["IT","İtalya","Europe/Rome","EUR"],["CH","İsviçre","Europe/Zurich","CHF"],
  ["GB","Birleşik Krallık","Europe/London","GBP"],["IE","İrlanda","Europe/Dublin","EUR"],["DK","Danimarka","Europe/Copenhagen","DKK"],
  ["SE","İsveç","Europe/Stockholm","SEK"],["NO","Norveç","Europe/Oslo","NOK"],["FI","Finlandiya","Europe/Helsinki","EUR"],
  ["IS","İzlanda","Atlantic/Reykjavik","ISK"],["EE","Estonya","Europe/Tallinn","EUR"],["LV","Letonya","Europe/Riga","EUR"],
  ["LT","Litvanya","Europe/Vilnius","EUR"],["MT","Malta","Europe/Malta","EUR"],["CY","Kıbrıs","Asia/Nicosia","EUR"],
  ["RU","Rusya","Europe/Moscow","RUB"],["UA","Ukrayna","Europe/Kyiv","UAH"],
  ["AE","Birleşik Arap Emirlikleri","Asia/Dubai","AED"],["QA","Katar","Asia/Qatar","QAR"],["SA","Suudi Arabistan","Asia/Riyadh","SAR"],
  ["OM","Umman","Asia/Muscat","OMR"],["JO","Ürdün","Asia/Amman","JOD"],["LB","Lübnan","Asia/Beirut","USD"],["EG","Mısır","Africa/Cairo","EGP"],
  ["IR","İran","Asia/Tehran","IRR"],["MA","Fas","Africa/Casablanca","MAD"],["TN","Tunus","Africa/Tunis","TND"],
  ["TZ","Tanzanya","Africa/Dar_es_Salaam","TZS"],["KE","Kenya","Africa/Nairobi","KES"],["ZA","Güney Afrika","Africa/Johannesburg","ZAR"],
  ["UZ","Özbekistan","Asia/Tashkent","UZS"],["KZ","Kazakistan","Asia/Almaty","KZT"],["KG","Kırgızistan","Asia/Bishkek","KGS"],
  ["IN","Hindistan","Asia/Kolkata","INR"],["LK","Sri Lanka","Asia/Colombo","LKR"],["MV","Maldivler","Indian/Maldives","USD"],["NP","Nepal","Asia/Kathmandu","NPR"],
  ["TH","Tayland","Asia/Bangkok","THB"],["VN","Vietnam","Asia/Ho_Chi_Minh","VND"],["ID","Endonezya","Asia/Makassar","IDR"],
  ["MY","Malezya","Asia/Kuala_Lumpur","MYR"],["SG","Singapur","Asia/Singapore","SGD"],["PH","Filipinler","Asia/Manila","PHP"],
  ["CN","Çin","Asia/Shanghai","CNY"],["HK","Hong Kong","Asia/Hong_Kong","HKD"],["JP","Japonya","Asia/Tokyo","JPY"],["KR","Güney Kore","Asia/Seoul","KRW"],
  ["US","ABD","America/New_York","USD"],["CA","Kanada","America/Toronto","CAD"],["MX","Meksika","America/Mexico_City","MXN"],
  ["CU","Küba","America/Havana","USD"],["BR","Brezilya","America/Sao_Paulo","BRL"],["AR","Arjantin","America/Argentina/Buenos_Aires","ARS"],
  ["PE","Peru","America/Lima","PEN"],["CO","Kolombiya","America/Bogota","COP"],["AU","Avustralya","Australia/Sydney","AUD"],["NZ","Yeni Zelanda","Pacific/Auckland","NZD"]
];
var COUNTRY = {}; COUNTRIES.forEach(function(c){ COUNTRY[c[0]] = c; });
/* Şehirler: ad, ülke kodu, (isteğe bağlı) başka yazılışlar */
var CITIES = [
  ["İstanbul","TR"],["Kapadokya","TR","nevşehir göreme ürgüp"],["Antalya","TR"],["Bodrum","TR"],["Fethiye","TR"],["Kaş","TR"],["İzmir","TR"],["Trabzon","TR"],["Mardin","TR"],["Ankara","TR"],["Çeşme","TR"],["Alaçatı","TR"],
  ["Girne","KKTC"],["Lefkoşa","KKTC"],["Gazimağusa","KKTC"],
  ["Tiflis","GE","tbilisi"],["Batum","GE","batumi"],["Kutaisi","GE"],["Kazbegi","GE","stepantsminda"],["Mtskheta","GE"],["Sighnaghi","GE"],["Bakü","AZ","baku"],["Erivan","AM","yerevan"],
  ["Atina","GR","athens"],["Selanik","GR","thessaloniki"],["Santorini","GR"],["Mikonos","GR","mykonos"],["Rodos","GR","rhodes"],["Girit","GR","crete"],
  ["Sofya","BG","sofia"],["Filibe","BG","plovdiv"],["Bükreş","RO","bucharest"],["Belgrad","RS","belgrade"],["Novi Sad","RS"],["Saraybosna","BA","sarajevo"],["Mostar","BA"],
  ["Kotor","ME"],["Budva","ME"],["Podgorica","ME"],["Üsküp","MK","skopje"],["Ohri","MK","ohrid"],["Tiran","AL","tirana"],["Saranda","AL"],["Priştine","XK","pristina"],["Prizren","XK"],
  ["Dubrovnik","HR"],["Split","HR"],["Zagreb","HR"],["Ljubljana","SI"],["Budapeşte","HU","budapest"],["Viyana","AT","vienna wien"],["Salzburg","AT"],["Prag","CZ","prague praha"],["Bratislava","SK"],
  ["Krakov","PL","krakow"],["Varşova","PL","warsaw"],["Berlin","DE"],["Münih","DE","munich münchen"],["Hamburg","DE"],["Köln","DE","cologne"],["Frankfurt","DE"],
  ["Amsterdam","NL"],["Rotterdam","NL"],["Brüksel","BE","brussels"],["Brugge","BE","bruges"],["Paris","FR"],["Nice","FR","nis"],["Lyon","FR"],["Marsilya","FR","marseille"],["Strazburg","FR","strasbourg"],
  ["Barselona","ES","barcelona"],["Madrid","ES"],["Sevilla","ES","seville endülüs"],["Granada","ES","endülüs"],["Valensiya","ES","valencia"],["Malaga","ES","endülüs"],["Mallorca","ES","palma"],
  ["Lizbon","PT","lisbon lisboa"],["Porto","PT"],["Madeira","PT"],["Roma","IT","rome"],["Milano","IT","milan"],["Floransa","IT","florence firenze"],["Venedik","IT","venice venezia"],["Napoli","IT","naples"],
  ["Palermo","IT","sicilya"],["Bologna","IT"],["Como","IT"],["Zürih","CH","zurich"],["Cenevre","CH","geneva"],["Luzern","CH","lucerne"],["Interlaken","CH"],
  ["Londra","GB","london"],["Edinburgh","GB"],["Manchester","GB"],["Dublin","IE"],["Kopenhag","DK","copenhagen"],["Stockholm","SE"],["Oslo","NO"],["Bergen","NO"],["Tromsø","NO","tromso"],
  ["Helsinki","FI"],["Rovaniemi","FI","laponya"],["Reykjavik","IS"],["Tallinn","EE"],["Riga","LV"],["Vilnius","LT"],["Valletta","MT"],["Larnaka","CY","larnaca"],["Baf","CY","paphos"],
  ["Moskova","RU","moscow"],["St. Petersburg","RU","petersburg"],["Dubai","AE"],["Abu Dabi","AE","abu dhabi"],["Doha","QA"],["Maskat","OM","muscat"],["Amman","JO"],["Petra","JO"],["Beyrut","LB","beirut"],
  ["Kahire","EG","cairo"],["Hurgada","EG","hurghada"],["Şarm El-Şeyh","EG","sharm"],["Luksor","EG","luxor"],["Marakeş","MA","marrakech"],["Fes","MA","fez"],["Kazablanka","MA","casablanca"],["Şefşavan","MA","chefchaouen"],
  ["Tunus","TN","tunis"],["Zanzibar","TZ"],["Nairobi","KE"],["Cape Town","ZA"],["Semerkant","UZ","samarkand"],["Buhara","UZ","bukhara"],["Taşkent","UZ","tashkent"],["Almatı","KZ","almaty"],["Bişkek","KG","bishkek"],
  ["Delhi","IN"],["Mumbai","IN"],["Goa","IN"],["Kolombo","LK","colombo"],["Male","MV"],["Katmandu","NP","kathmandu"],["Bangkok","TH"],["Phuket","TH"],["Chiang Mai","TH"],["Hanoi","VN"],["Ho Chi Minh","VN","saigon"],
  ["Bali","ID"],["Kuala Lumpur","MY"],["Singapur","SG","singapore"],["Manila","PH"],["Pekin","CN","beijing"],["Şanghay","CN","shanghai"],["Hong Kong","HK"],["Tokyo","JP"],["Kyoto","JP"],["Osaka","JP"],
  ["Seul","KR","seoul"],["Busan","KR"],["New York","US"],["Los Angeles","US"],["San Francisco","US"],["Miami","US"],["Las Vegas","US"],["Chicago","US"],["Toronto","CA"],["Vancouver","CA"],["Montreal","CA"],
  ["Meksiko","MX","mexico city"],["Cancun","MX"],["Havana","CU"],["Rio de Janeiro","BR"],["Buenos Aires","AR"],["Lima","PE"],["Cusco","PE"],["Bogota","CO"],["Cartagena","CO"],["Sidney","AU","sydney"],["Melbourne","AU"],["Auckland","NZ"]
];
/* gezinin gidilecek yerleri: [{c: ülke, n: şehir (isteğe bağlı)}] */
function normDest(raw, countries){
  var out = [], seen = {};
  (Array.isArray(raw) ? raw : []).slice(0, 30).forEach(function(x){
    if(!x || !COUNTRY[x.c]) return; var n = x.n ? str(x.n, 60) : "", k = x.c + "|" + n.toLowerCase(); if(seen[k]) return; seen[k] = true;
    out.push(n ? {c: x.c, n: n} : {c: x.c});
  });
  (countries || []).forEach(function(c){ if(!out.some(function(x){ return x.c === c; })) out.push({c: c}); });
  return out;
}
/* kayıtta kabul edilen para birimleri: temel dört + ülkelerin paraları */
var ALLCUR = CURRENCIES.slice(); COUNTRIES.forEach(function(c){ if(ALLCUR.indexOf(c[3]) < 0) ALLCUR.push(c[3]); });
function isCur(c){ return ALLCUR.indexOf(c) > -1; }
/* gezide gösterilen para birimleri: TL, gezinin parası, gidilen ülkelerin paraları, EUR, USD */
function curList(t){
  var out = ["TL"];
  function add(c){ if(c && isCur(c) && out.indexOf(c) < 0) out.push(c); }
  if(t){ add(t.currency); (t.countries || []).forEach(function(k){ if(COUNTRY[k]) add(COUNTRY[k][3]); }); }
  ["EUR", "USD"].forEach(add);
  if(t && t.geo === "georgia") add("GEL");
  return out;
}
var MODES = {plane:"Uçak", bus:"Otobüs", train:"Tren", car:"Araç", taxi:"Taksi", walk:"Yürüyüş", border:"Sınır"};
/* plan türünden harcama kategorisine */
var CAT_TO_EXP = {yemek:"food", alisveris:"shopping", ulasim:"transport", konaklama:"stay", tarih:"sights", muze:"sights", doga:"sights", gezi:"sights", etkinlik:"sights"};
/* plan türünden design system kart kategorisine */
var CAT_TO_DS = {tarih:"history", muze:"museum", doga:"walk", gezi:"walk", etkinlik:"event", yemek:"food", alisveris:"shopping", ulasim:"transit", konaklama:"stay"};

function guessMode(it){
  var t = ((it.title || "") + " " + (it.note || "")).toLocaleLowerCase("tr");
  if(/uçuş|uçak|istanbul →|→ istanbul|flight/.test(t)) return "plane";
  if(/sınır/.test(t)) return "border";
  if(/bolt|taksi/.test(t)) return "taxi";
  if(/otobüs|city bus|marshrutka|minibüs/.test(t)) return "bus";
  if(/tren/.test(t)) return "train";
  if(/yürü/.test(t)) return "walk";
  return "car";
}
function num(v){ var n = typeof v === "number" ? v : parseFloat(String(v || "").replace(/\./g, "").replace(",", ".")); return isFinite(n) ? n : 0; }
function parseAmount(s){ if(typeof s === "number") return s; s = String(s || "").trim(); if(!s) return 0; if(/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); else s = s.replace(/[.,](?=\d{3}(\D|$))/g, ""); var n = parseFloat(s); return isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0; }
function fmtNum(n, dec){ var v = Math.round((Number(n) || 0) * (dec ? 100 : 1)) / (dec ? 100 : 1); var parts = (dec ? v.toFixed(2) : String(Math.round(v))).split("."); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, "."); return parts.length > 1 && parts[1] !== "00" ? parts[0] + "," + parts[1] : parts[0]; }
function fmtMoney(n, cur){ return fmtNum(n, n % 1 !== 0) + " " + (cur || "TL"); }
/* Otomatik kurlar (günde bir, ücretsiz kur servisi): bu cihazda saklanır. Elle girilen kur her zaman önce gelir. */
var FX_KEY = "triplanner-fx", FX = {rates: {}, at: "", fetched: 0};
try{ var fxs = JSON.parse(localStorage.getItem(FX_KEY) || "null"); if(fxs && fxs.rates) FX = fxs; }catch(e){}
function setFx(o){ FX = o; try{ localStorage.setItem(FX_KEY, JSON.stringify(o)); }catch(e){} }
function autoRate(cur){ var r = FX.rates && FX.rates[cur]; return r > 0 ? r : null; }
function rateOf(t, cur){ if(!cur || cur === "TL") return 1; var m = t && t.rate && t.rate[cur]; return m || autoRate(cur); }
function toTL(t, amount, cur){ if(!cur || cur === "TL") return amount; var r = rateOf(t, cur); return r ? amount * r : null; }

/* kim ekledi: kullanıcı kimliği ve o anki görünen adı */
function byOf(r, o){
  if(r && typeof r.by === "string" && /^[\w-]{1,64}$/.test(r.by)) o.by = r.by;
  if(r && r.byName) o.byName = str(r.byName, 40);
  return o;
}
var ACT_KINDS = {expense:1, plan:1, transit:1, check:1, done:1, photo:1, idea:1};
function normActivity(a){
  if(!a || typeof a !== "object" || typeof a.id !== "string" || !ACT_KINDS[a.kind]) return null;
  return byOf(a, {id:a.id.slice(0,40), at:str(a.at,30), kind:a.kind, ref:str(a.ref,40), text:str(a.text,160).replace(/ · /g, ", ")});
}
function normExpense(e){
  if(!e || typeof e !== "object" || typeof e.id !== "string") return null;
  var amount = num(e.amount); if(!(amount > 0)) return null;
  return byOf(e, {id:e.id.slice(0,40), title:str(e.title,120), cat: EXP_CATS[e.cat] ? e.cat : "sights", amount:Math.round(amount*100)/100,
    currency: isCur(e.currency) ? e.currency : "TL", day: (e.day === "pre" || /^d\d{8}$/.test(e.day || "")) ? e.day : "pre",
    time:str(e.time,10), source: ["manual","transport","plan","check"].indexOf(e.source) > -1 ? e.source : "manual", ref:str(e.ref,40),
    photos:(Array.isArray(e.photos) ? e.photos : []).filter(function(p){ return typeof p === "string" && /^[\w-]{1,80}$/.test(p); }).slice(0,8),
    at: str(e.at, 30)});
}
function normPhoto(p){
  if(!p || typeof p !== "object" || typeof p.id !== "string" || typeof p.asset !== "string" || !/^[\w-]{1,80}$/.test(p.asset)) return null;
  return byOf(p, {id:p.id.slice(0,40), asset:p.asset, day:(p.day === "pre" || /^d\d{8}$/.test(p.day || "")) ? p.day : "pre", ref:str(p.ref,40), refKind: ["expense","item"].indexOf(p.refKind) > -1 ? p.refKind : "", note:str(p.note,300), at:str(p.at,30)});
}
function photoUrl(asset){ return window.TPB ? window.TPB.photoUrl(asset) : "/_blob/" + asset; }

/* Paylaşılan veri güvenilmez sayılır: her geziyi doğrula */
function normalizeTrip(raw, id){
  try{
    if(!raw || typeof raw !== "object" || !/^[A-Za-z0-9]{1,40}$/.test(id)) return null;
    var start = parseISO(raw.start) ? raw.start : null, end = parseISO(raw.end) ? raw.end : null;
    if(!start || !end) return null;
    var dates = datesBetween(start, end); if(!dates.length) return null;
    var t = {id:id, name:str(raw.name,60) || "Adsız gezi", short:str(raw.short,3), color:(raw.color|0) % 6, start:start, end:end,
      geo: raw.geo === "georgia" ? "georgia" : "", guide:safeLink(raw.guide), days:[], items:{}, removed:[], ideas:[], checklist:[], keyinfo:[],
      expenses:[], photos:[], rate:{}, budget:0, currency:"", activity:[]};
    if(!t.short) t.short = initials(t.name);
    var items = raw.items && typeof raw.items === "object" ? raw.items : {};
    Object.keys(items).slice(0,1500).forEach(function(k){
      var r = items[k]; if(!r || typeof r !== "object" || !/^[\w-]{1,40}$/.test(k)) return;
      var it = {id:k, time:str(r.time,40), title:str(r.title,160), note:str(r.note,800), cat:CATS[r.cat] ? r.cat : "gezi", link:safeLink(r.link), critical:!!r.critical};
      if(typeof r.from === "string" && /^d\d{8}$/.test(r.from)) it.from = r.from;
      if(MODES[r.mode]) it.mode = r.mode;
      if(r.origin) it.origin = str(r.origin,80);
      if(r.dest) it.dest = str(r.dest,80);
      if(r.duration) it.duration = str(r.duration,40);
      if(r.end) it.end = str(r.end,20);
      var pa = num(r.priceAmount); if(pa > 0){ it.priceAmount = Math.round(pa*100)/100; it.priceCur = isCur(r.priceCur) ? r.priceCur : "TL"; }
      if(r.noExpense) it.noExpense = true;
      if(r.carrier) it.carrier = str(r.carrier,60);
      if(r.code) it.code = str(r.code,24);
      if(r.seat) it.seat = str(r.seat,40);
      if(r.fromCode) it.fromCode = str(r.fromCode,5).toUpperCase();
      if(r.toCode) it.toCode = str(r.toCode,5).toUpperCase();
      if(typeof r.flex === "boolean") it.flex = r.flex;
      byOf(r, it); if(r.at) it.at = str(r.at, 30);
      if(r.ticket && typeof r.ticket === "object" && /^[\w-]{1,80}$/.test(r.ticket.asset || "")) it.ticket = {asset: r.ticket.asset, name: str(r.ticket.name,80) || "Bilet", type: r.ticket.type === "pdf" ? "pdf" : "image"};
      t.items[k] = it;
    });
    var seen = {};
    function ids(arr){ return (Array.isArray(arr)?arr:[]).filter(function(x){ if(typeof x !== "string" || !t.items[x] || seen[x]) return false; seen[x] = true; return true; }); }
    var rdays = Array.isArray(raw.days) ? raw.days : [];
    dates.forEach(function(dt){
      var rd = rdays.find(function(d){ return d && (d.date === dt || d.id === dayIdOf(dt)); }) || {};
      t.days.push({id:dayIdOf(dt), date:dt, title:str(rd.title,120), night:str(rd.night,120), items:ids(rd.items)});
    });
    t.removed = ids(raw.removed); t.ideas = ids(raw.ideas);
    Object.keys(t.items).forEach(function(k){ if(!seen[k]) t.removed.push(k); });
    var gids = GROUPS.map(function(g){ return g[0]; });
    (Array.isArray(raw.checklist) ? raw.checklist : []).slice(0,300).forEach(function(c){
      if(!c || typeof c !== "object" || typeof c.id !== "string") return;
      var ck = byOf(c, {id:c.id.slice(0,40), group: gids.indexOf(c.group) > -1 ? c.group : "canta", title:str(c.title,160), note:str(c.note,600), link:safeLink(c.link), done:!!c.done, due:str(c.due,20)});
      if(c.done && typeof c.doneBy === "string" && /^[\w-]{1,64}$/.test(c.doneBy)){ ck.doneBy = c.doneBy; ck.doneByName = str(c.doneByName, 40); }
      t.checklist.push(ck);
    });
    (Array.isArray(raw.keyinfo) ? raw.keyinfo : []).slice(0,12).forEach(function(k){
      if(!k || typeof k !== "object" || typeof k.id !== "string") return;
      t.keyinfo.push({id:k.id.slice(0,40), label:str(k.label,40), value:str(k.value,80), sub:str(k.sub,120), warn:!!k.warn});
    });
    (Array.isArray(raw.expenses) ? raw.expenses : []).slice(0,2000).forEach(function(e){ var x = normExpense(e); if(x) t.expenses.push(x); });
    (Array.isArray(raw.photos) ? raw.photos : []).slice(0,2000).forEach(function(p){ var x = normPhoto(p); if(x) t.photos.push(x); });
    (Array.isArray(raw.activity) ? raw.activity : []).slice(0,300).forEach(function(a){ var x = normActivity(a); if(x) t.activity.push(x); });
    if(raw.rate && typeof raw.rate === "object") ALLCUR.forEach(function(c){ var r = num(raw.rate[c]); if(c !== "TL" && r > 0) t.rate[c] = Math.round(r*10000)/10000; });
    var b = num(raw.budget); if(b > 0) t.budget = Math.round(b);
    t.currency = isCur(raw.currency) && raw.currency !== "TL" ? raw.currency : (t.geo === "georgia" ? "GEL" : "");
    t.countries = (Array.isArray(raw.countries) ? raw.countries : []).filter(function(c, i, a){ return typeof c === "string" && COUNTRY[c] && a.indexOf(c) === i; }).slice(0, 12);
    if(!t.countries.length && t.geo === "georgia") t.countries = ["GE"];
    t.dest = normDest(raw.dest, t.countries);
    if(!raw.dest && t.geo === "georgia") t.dest = [{c: "GE", n: "Batum"}, {c: "GE", n: "Kutaisi"}];
    t.dest.forEach(function(x){ if(t.countries.indexOf(x.c) < 0) t.countries.push(x.c); });
    /* gezi simgesi: harfler (short) ya da gidilen ülkelerden birinin bayrağı */
    t.flag = typeof raw.flag === "string" && t.countries.indexOf(raw.flag) > -1 && /^[A-Z]{2}$/.test(raw.flag) ? raw.flag : "";
    /* kapak: galeriden seçilen fotoğraf */
    t.cover = typeof raw.cover === "string" && t.photos.some(function(x){ return x.id === raw.cover; }) ? raw.cover : "";
    syncTransportExpenses(t);
    return t;
  }catch(e){ return null; }
}

/* Ulaşım kartında fiyat girildiyse harcama listesinde karşılığı olsun (işaretini kaldırmadıysa). */
function syncTransportExpenses(t){
  var byRef = {};
  t.expenses.forEach(function(e){ if(e.source === "transport" && e.ref) byRef[e.ref] = e; });
  var dayOf = {};
  t.days.forEach(function(d){ d.items.forEach(function(id){ dayOf[id] = d.id; }); });
  Object.keys(t.items).forEach(function(k){
    var it = t.items[k];
    var want = it.cat === "ulasim" && it.priceAmount > 0 && !it.noExpense && dayOf[k];
    var e = byRef[k];
    if(want){
      if(!e){ e = {id:"x" + k, source:"transport", ref:k, photos:[], at:new Date().toISOString(), cat:"transport"}; t.expenses.push(e); }
      e.title = it.title || "Ulaşım"; e.amount = it.priceAmount; e.currency = it.priceCur || "TL"; e.cat = "transport";
      e.day = dayOf[k]; e.time = (it.time || "").replace(/\s*(TR|GE)$/, "").replace(/^~/, "").slice(0,5);
    } else if(e){ t.expenses.splice(t.expenses.indexOf(e), 1); }
    delete byRef[k];
  });
  Object.keys(byRef).forEach(function(k){ var e = byRef[k]; t.expenses.splice(t.expenses.indexOf(e), 1); });
}

/* ================= Saklama ================= */
var LS_KEY = "triplanner-v3", LS_VIEW = "triplanner-v4-view";
function loadLocal(){
  try{
    var raw = JSON.parse(localStorage.getItem(LS_KEY) || "null"); if(!raw || !Array.isArray(raw.order)) return null;
    var a = {order:[], trips:{}};
    raw.order.forEach(function(id){ var t = normalizeTrip(raw.trips && raw.trips[id], id); if(t){ a.order.push(id); a.trips[id] = t; } });
    return a;
  }catch(e){ return null; }
}
function saveLocal(app){ try{ localStorage.setItem(LS_KEY, JSON.stringify(app)); }catch(e){} }
function loadViews(){ try{ return JSON.parse(localStorage.getItem(LS_VIEW) || "{}") || {}; }catch(e){ return {}; } }
function saveViews(v){ try{ localStorage.setItem(LS_VIEW, JSON.stringify(v)); }catch(e){} }

/* Sunucu: her gezi trips/<id> belgesi. Bağlantı yoksa bu tarayıcıda tutulur. */
function Sync(opts){
  var db = null, connected = false, readOnly = false, metaInit = false, metaWriting = false, tripsKnown = false, remote = {};
  var timers = {}, writing = {}, again = {}, lastW = {}, created = {}, status = "connecting", migrated = false;
  /* bağlantı yokken değişen geziler: bir dahaki açılışta sunucuya gönderilir */
  var PKEY = "triplanner-pending", pending = {};
  try{ pending = JSON.parse(localStorage.getItem(PKEY) || "{}") || {}; }catch(e){ pending = {}; }
  function savePending(){ try{ localStorage.setItem(PKEY, JSON.stringify(pending)); }catch(e){} }
  function donePending(id){ if(pending[id]){ delete pending[id]; savePending(); } }
  function setStatus(k){ status = k; opts.onStatus(k); }
  function busy(){ return Object.keys(timers).length > 0 || Object.keys(writing).some(function(k){ return writing[k]; }); }
  function maybeSaved(){ if(connected && !readOnly && !busy() && ["error","quota"].indexOf(status) < 0) setStatus("saved"); }
  function ensureMeta(){ if(metaInit || metaWriting || !db) return; metaWriting = true; db.doc("meta/app").set({initialized:true}).then(function(){ metaInit = true; }, function(){}).then(function(){ metaWriting = false; }); }
  function onErr(e, retry, isRetry){
    var code = e && e.code;
    if(code === "invalid_argument" || code === "permission_denied"){ readOnly = true; setStatus("readonly"); }
    else if(code === "quota_exceeded") setStatus("quota");
    else if(!isRetry && (code === "unavailable" || !code)) setTimeout(retry, 800 + Math.random()*1200);
    else setStatus("error");
  }
  function flush(id, isRetry){
    var app = opts.getApp(), t = app.trips[id]; if(!t || !connected || readOnly) return;
    if(writing[id]){ again[id] = true; return; }
    var json = JSON.stringify(t);
    if(json === lastW[id]){ donePending(id); maybeSaved(); return; }
    writing[id] = true; ensureMeta();
    db.doc("trips/"+id).set({trip:JSON.parse(json), order:app.order.indexOf(id), updatedAt:new Date().toISOString()}).then(function(){
      lastW[id] = json; delete created[id]; if(JSON.stringify(opts.getApp().trips[id]) === json) donePending(id);
    }, function(e){ onErr(e, function(){ flush(id, true); }, isRetry); }).then(function(){
      writing[id] = false; if(again[id]){ again[id] = false; flush(id, false); } else maybeSaved();
    });
  }
  function schedule(id){
    saveLocal(opts.getApp());
    if(!id || !opts.getApp().trips[id]) return;
    if(!pending[id]){ pending[id] = true; savePending(); }
    if(!connected || readOnly){ if(!connected && status !== "connecting" && !readOnly) setStatus("local"); return; }
    setStatus("saving");
    clearTimeout(timers[id]);
    timers[id] = setTimeout(function(){ delete timers[id]; flush(id, false); }, 700);
  }
  function remove(id){
    clearTimeout(timers[id]); delete timers[id]; delete lastW[id]; delete created[id]; donePending(id);
    if(!connected || readOnly){ if(!connected) setStatus("local"); return; }
    ensureMeta(); setStatus("saving");
    db.doc("trips/"+id).delete().then(maybeSaved, function(e){ onErr(e, function(){ remove(id); }, false); });
  }
  function apply(){
    if(!tripsKnown) return;
    var app = opts.getApp(), ids = Object.keys(remote);
    if(!ids.length && !metaInit){
      /* sunucu boş: bu tarayıcıdaki gezileri bir kez yükle */
      if(!migrated && !readOnly){ migrated = true; app.order.forEach(function(id){ created[id] = true; schedule(id); }); }
      return;
    }
    var before = JSON.stringify(app), next = {order:[], trips:{}};
    ids.sort(function(a,b){ return remote[a].order - remote[b].order; }).forEach(function(id){
      if((timers[id] || writing[id] || pending[id] || opts.isBusy(id)) && app.trips[id]){ next.trips[id] = app.trips[id]; next.order.push(id); return; }
      var t = normalizeTrip(remote[id].trip, id); if(!t) return;
      next.trips[id] = t; next.order.push(id); lastW[id] = JSON.stringify(t);
    });
    app.order.forEach(function(id){ if(!next.trips[id] && (created[id] || pending[id] || timers[id] || writing[id])){ next.trips[id] = app.trips[id]; next.order.push(id); } });
    if(JSON.stringify(next) === before) return;
    saveLocal(next); opts.setApp(next);
  }
  function connect(){
    var getDb = window.TPB ? window.TPB.db : (window.claude && typeof window.claude.use === "function" ? function(){ return window.claude.use("db"); } : null);
    if(!getDb){ setStatus("local"); return; }
    var timer = setTimeout(function(){ if(status === "connecting") setStatus("offline"); }, 10000);
    getDb().then(function(d){
      if(!d){ clearTimeout(timer); setStatus("local"); return; }
      db = d; connected = true;
      var fail = function(err){ clearTimeout(timer); if(err && err.code === "revoked") readOnly = true; connected = false; setStatus("local"); };
      try{
        db.doc("meta/app").onSnapshot(function(s){ var b = s.exists ? s.data() : null; metaInit = !!(b && b.initialized); apply(); }, fail);
        db.collection("trips").onSnapshot(function(qs){
          if(!qs.metadata || !qs.metadata.fromCache) clearTimeout(timer);
          remote = {};
          qs.docs.forEach(function(doc){ var b = doc.data(); if(b && b.trip) remote[doc.id] = {trip:b.trip, order: typeof b.order === "number" ? b.order : 999}; });
          tripsKnown = true; apply();
          if(!busy() && !readOnly && status !== "error") setStatus("saved");
          Object.keys(created).concat(Object.keys(pending)).forEach(function(id){ if(opts.getApp().trips[id] && !timers[id] && !writing[id]) schedule(id); });
        }, fail);
      }catch(e){ fail(e); }
    }, function(){ clearTimeout(timer); setStatus("local"); });
  }
  return {connect:connect, schedule:schedule, remove:remove, markCreated:function(id){ created[id] = true; }, status:function(){ return status; }};
}

window.TPD = {CATS:CATS, GROUPS:GROUPS, MONTHS:MONTHS, WD:WD, WDS:WDS, MAX_DAYS:MAX_DAYS, GEORGIA_DATES:GEORGIA_DATES,
  EXP_CATS:EXP_CATS, EXP_ORDER:EXP_ORDER, EXP_ICON:EXP_ICON, CURRENCIES:CURRENCIES, COUNTRIES:COUNTRIES, COUNTRY:COUNTRY, CITIES:CITIES, ALLCUR:ALLCUR, isCur:isCur, curList:curList, MODES:MODES, CAT_TO_EXP:CAT_TO_EXP, CAT_TO_DS:CAT_TO_DS,
  parseISO:parseISO, isoOf:isoOf, fmtDay:fmtDay, fmtRange:fmtRange, datesBetween:datesBetween, dayIdOf:dayIdOf, str:str, safeLink:safeLink, uid:uid, initials:initials,
  seedGeorgia:seedGeorgia, newTrip:newTrip, normalizeTrip:normalizeTrip, syncTransportExpenses:syncTransportExpenses, guessMode:guessMode,
  parseAmount:parseAmount, fmtNum:fmtNum, fmtMoney:fmtMoney, toTL:toTL, rateOf:rateOf, autoRate:autoRate, fx:function(){ return FX; }, setFx:setFx, photoUrl:photoUrl,
  loadLocal:loadLocal, saveLocal:saveLocal, loadViews:loadViews, saveViews:saveViews, Sync:Sync,
  GEO:{PLACES:PLACES, STOPS:STOPS, COAST:COAST, BORDER:BORDER, RIONI:RIONI, ROUTES:ROUTES, LEGS:LEGS, proj:proj, gk:gk}};
})();
