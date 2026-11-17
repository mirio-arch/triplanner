# Triplanner

Gezi planlayıcı: günler, ulaşım, hazırlık listesi, harcamalar ve fotoğraflar. Telefona "Ana ekrana ekle" ile uygulama olarak kurulur; yol arkadaşlarınla aynı geziyi birlikte düzenlersin.

## Nasıl çalışır

- Site GitHub Pages'te durur; kod bu depodadır.
- Veriler, Google ile giriş ve fotoğraflar Supabase'tedir. Gezi verileri bu depoda **yoktur**.
- `config.js` içindeki anahtar herkese açık türdendir; kimin neyi göreceğini veritabanındaki kurallar (`supabase/schema.sql`) belirler.

## Kurulum

1. Supabase'te proje aç, **SQL Editor**'de `supabase/schema.sql` dosyasını çalıştır.
2. `config.js` dosyasına projenin adresini ve publishable (anon) anahtarını yaz.
3. Google Cloud'da bir OAuth istemcisi (Web application) oluştur. Yönlendirme adresi: `https://<proje>.supabase.co/auth/v1/callback`. İstemci kimliğini ve sırrını Supabase → Authentication → Sign In / Providers → Google'a gir.
4. Supabase → Authentication → URL Configuration: Site URL ve Redirect URLs olarak bu sitenin adresini yaz.
5. GitHub → Settings → Pages: kaynak `main` dalı, kök klasör.

## Paylaşım

Gezi ayarlarında **Paylaşım** bölümüne arkadaşının Google e-postasını ekle. O kişi siteye Google ile girince gezi listesinde görünür.
