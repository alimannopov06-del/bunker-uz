BUNKER UZ — TELEGRAM MINI APP STARTER

MUHIM:
Bu arxiv boshlang‘ich ishlaydigan mobil interfeys va o‘yin demo-skeletini beradi.
Demo holatida xona faqat bitta brauzer/qurilmada ishlaydi. Haqiqiy ko‘p o‘yinchili
rejim uchun Supabase Edge Functions va Telegram initData tekshiruvi ulanadi.
Bot tokeni yoki Supabase service_role kalitini hech qachon frontend kodiga yozmang.

1. ARXIVNI OCHISH
Telefoningizda ZIP faylni yuklab oling va arxivdan chiqaring.

2. SUPABASE
- https://supabase.com saytida bepul loyiha yarating.
- SQL Editor bo‘limini oching.
- supabase/schema.sql ichidagi SQL kodni joylashtirib Run bosing.
- Project URL va anon/public key qiymatlarini Project Settings > API bo‘limidan oling.
- app.js boshidagi CONFIG ichiga SUPABASE_URL va SUPABASE_ANON_KEY qiymatlarini kiriting.
  Eslatma: bu hozircha faqat mijoz kutubxonasini tayyorlaydi; real multiplayer
  amallari uchun server Edge Functions talab qilinadi.

3. WEB HOSTING
- GitHub hisob oching: https://github.com
- Yangi public repository yarating: bunker-uz
- ZIP ichidagi fayllarni repositoryga yuklang.
- Vercel orqali GitHub repositoryni import qilib deploy qiling:
  https://vercel.com
- Deploy bo‘lgach, sizga HTTPS sayt manzili beriladi.

4. TELEGRAM MINI APP
- @BotFather ga kiring.
- /mybots -> @Bunnkergamesbot -> Bot Settings -> Menu Button -> Configure menu button.
- Vercel bergan HTTPS URL ni kiriting.
- Tugma matni uchun Play yoki O‘ynash deb yozing.

5. KEYINGI XAVFSIZLIK ISHLARI
To‘liq real multiplayerni ommaga chiqarishdan oldin:
- Telegram WebApp initData serverda Bot Token yordamida tekshirilsin.
- Room create/join/start, card reveal va vote faqat server Edge Function orqali bajarilsin.
- Har bir foydalanuvchi faqat o‘zining maxfiy kartalarini ko‘rsin.
- Ovozlar serverda tekshirilsin; bir raundda bir kishi bir marta ovoz bersin.
- Rate limit va host huquqlari qo‘shilsin.

FAYLLAR
index.html           Asosiy sahifa
style.css            Qora-oltin dizayn
app.js               Interfeys va demo o‘yin mexanikasi
supabase/schema.sql  Ma’lumotlar bazasi jadvallari

HOZIRGI HOLAT
Interfeys va lokal demo funksiyalari mavjud. Bu hali ishlab chiqarishga tayyor
to‘liq multiplayer emas. Haqiqiy multiplayer backendini keyingi bosqichda
server funksiyalari bilan ulash zarur.
