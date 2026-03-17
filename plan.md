# Crypto Futures AI Screener - `plan.md`

## Summary
- Bu proje, kişisel kullanım odaklı bir web platformu olacak: Binance USDT perpetual evreninde global market cap top 200 + manuel whitelist coinleri tarayacak, 2x kaldıraç mantığına uygun en iyi 5 futures setup üretip açıklanabilir şekilde gösterecek.
- Sistem yalnızca "coin öneren ekran" olmayacak; aynı zamanda trade journal + performans hafızası + AI koç + dinamik indikatör laboratuvarı olacak.
- İlk sürümde otomatik emir gönderme yok. Kullanıcı sinyali manuel seçecek, açtığı ve kapattığı işlemi sisteme işleyecek. Sistem bu gerçekleşen işlemlerden öğrenip yeni filtre ve indikatör önerecek.
- Bu dosya, ürün kapsamını, teknik mimariyi ve implementasyon sırasını tek yerde toplar.

## Product And Business Design
- Ana değer önerisi:
  - Piyasayı manuel tarama yükünü azaltmak
  - Teknik kuralları standartlaştırmak
  - İşlem disiplini ve hata analizi sağlamak
  - Zamanla kişisel işlem geçmişine göre sistemi daha akıllı hale getirmek
- Ana modüller:
  - `Screener Dashboard`: Son tarama zamanı, aktif market durumu, top 5 sinyal, skor, neden seçildi açıklaması
  - `Signal Detail`: Trend, setup türü, entry/stop/TP, risk/reward, funding/OI özeti, chart overlay, "Bu işlemi seçiyorum" aksiyonu
  - `Trade Journal`: Açık işlemler, kapanmış işlemler, manuel exit fiyatı, notlar, realized PnL, setup bazlı başarı oranı
  - `AI Coach`: "Bu trade'de nerede hata yaptım?", "Şu ana kadarki realize işlemlere göre neyi iyileştireyim?", "Yeni indikatör öner"
  - `Indicator Lab`: Gemini'nin önerdiği indikatör ve filtreleri inceleme, preview, onay, shadow mode, live mode, rollback
  - `Settings`: Manuel coin whitelist, risk tercihleri, aktif indikatörler, tarama davranışı
- Sinyal üretim mantığı:
  - Trend filtresi: 1D ve 4H EMA200
  - Setup türleri: breakout retest, destekten tepki, konsolidasyon breakout
  - RSI, Bollinger, Volume kuralları: verilen prompt kuralları deterministik engine'e çevrilir
  - Funding ve OI: squeeze ve crowded trade analizi için ikincil skor katmanı olur
  - Çıktı: en fazla 5 coin, açıklanabilir skor ve standart format
- V1 kapsam dışı:
  - Binance API ile otomatik order placement
  - Binance hesap geçmişini otomatik çekme
  - Multi-user SaaS, abonelik, ekip rolleri
  - Mobil uygulama

## Technical Architecture
- Monorepo yapı:
  - `apps/web`: Next.js 15, TypeScript, App Router, Tailwind, bileşen kütüphanesi ve chart UI
  - `apps/functions`: Firebase Functions v2, scheduler job'ları, güvenli AI endpoint'leri
  - `packages/analysis-core`: market adapter'ları, indikatör hesaplama, rule engine, ranking engine, shadow evaluator
  - `packages/shared`: Zod schema'ları, DTO'lar, enum'lar, ortak tipler
- Deploy ve platform:
  - Frontend: Firebase App Hosting
  - Backend jobs ve API: Firebase Functions v2
  - Database: Cloud Firestore
  - Auth: Firebase Authentication
  - Abuse protection: Firebase App Check
- Veri akışı:
  - `refreshUniverse` her 6 saatte bir:
    - CoinGecko'dan global market cap top 200 alınır
    - Kullanıcının whitelist coinleri eklenir
    - Binance `exchangeInfo` ile USDT perpetual kesişimi çıkarılır
  - `runMarketScan` her 15 dakikada bir:
    - Universe için 1D ve 4H kapalı mum verileri çekilir
    - Trend ve setup ön filtre uygulanır
    - Shortlist kalan coinler için funding ve open interest çekilir
    - Skorlama yapılıp top 20 candidate ve top 5 signal kaydedilir
  - `evaluateShadowIndicators`:
    - Shadow moddaki indikatörlerin son taramalara etkisi ölçülür
  - `aggregatePerformance`:
    - Journal sonuçlarından setup win-rate, average RR ve hata pattern'leri üretilir
- Kritik teknik kararlar:
  - İndikatör hesapları yalnızca kapalı candle üstünden yapılır
  - Funding/OI verisi tüm 200 coin için sürekli değil, shortlist için çekilir
  - Ham OHLC verisi Firestore'a yığılmaz; gerekli snapshot ve özetler saklanır
  - Gemini çağrıları yalnızca server-side yapılır; key istemciye çıkmaz

## Public Interfaces, Rules Engine And Data Model
- Web/API arayüzleri:
  - `GET /api/signals`
  - `GET /api/signals/:id`
  - `POST /api/trades`
  - `POST /api/trades/:id/close`
  - `POST /api/ai/review-trade`
  - `POST /api/ai/suggest-indicators`
  - `POST /api/indicator-proposals/:id/approve`
  - `POST /api/indicator-catalog/:id/toggle`
- Paylaşılan tipler:
  - `SignalSnapshot`
  - `TradeJournalEntry`
  - `TradeClosePayload`
  - `IndicatorDefinition`
  - `IndicatorProposal`
  - `TradeReviewReport`
- Firestore koleksiyonları:
  - `users`
  - `settings`
  - `marketUniverse`
  - `scanRuns`
  - `marketState`
  - `signalCandidates`
  - `signals`
  - `trades`
  - `tradeEvents`
  - `indicatorCatalog`
  - `indicatorProposals`
  - `aiReviews`
  - `modelUsageLogs`
- İndikatör sistemi:
  - Built-in primitive set:
    - EMA, SMA, RSI, Bollinger Bands, ATR, ADX, MACD, Stochastic, OBV, Volume SMA, Highest/Lowest, Change, StdDev, OI delta, funding trend
  - Dinamik ekleme modeli:
    - AI keyfi kod üretmez
    - AI, JSON tabanlı güvenli DSL ile indikatör veya filtre önerir
    - DSL; metadata, input parametreleri, derived series, condition tree ve score contribution alanlarından oluşur
  - Onay akışı:
    - `draft -> validated -> shadow -> live`
    - Kullanıcı onaylayınca sisteme eklenir ama varsayılan olarak `shadow` modda başlar
    - Etki preview olumluysa `live` yapılır
    - Versiyonlama ve rollback zorunludur
- Sinyal skorlaması:
  - Trend alignment
  - Setup quality
  - Volume confirmation
  - RSI/BB confluence
  - Funding/OI squeeze bonus
  - Risk/reward quality
  - Penalty: EMA200 yakınlığı, RSI extreme, hacimsiz breakout, stop çok geniş
- Sinyal formatı:
  - `Coin`
  - `Trend`
  - `Setup`
  - `Entry`
  - `Stop`
  - `TP1`
  - `TP2`
  - `Risk/Reward`
  - `Analiz Özeti`

## AI Strategy
- Kullanılacak Gemini yaklaşımı:
  - `gemini-2.5-pro`: trade review, davranış analizi, yeni indikatör önerisi gibi yüksek kalite gereken işler
  - Gerekirse düşük maliyetli özetler için `gemini-2.5-flash-lite`
- AI kullanım alanları:
  - `Trade Review`: Seçilen sinyal ile gerçekleşen trade sonucunu karşılaştırır
  - `Mistake Mining`: Kullanıcının sık yaptığı hataları çıkarır
  - `Indicator Proposal`: Realized trade geçmişine göre yeni filtre veya indikatör önerir
  - `Filter Tuning`: Setup bazında hangi eşiklerin daha iyi çalıştığını önerir
- Güvenlik kuralları:
  - Gemini her zaman structured output döndürür
  - Bilinmeyen primitive, geçersiz schema veya güvensiz ifade reddedilir
  - AI hiçbir zaman canlı skora kendiliğinden etki etmez
  - Onay ve aktivasyon tamamen kontrollüdür

## Test Plan
- Tarama ve evren:
  - Top 200 + whitelist mantığı doğru çalışmalı
  - Binance'ta olmayan veya delist coinler elenmiş olmalı
- Rule engine:
  - EMA200 üstü yalnız LONG, altı yalnız SHORT
  - RSI > 80 ve RSI < 20 olduğunda sinyal üretilmemeli
  - Hacimsiz breakout reddedilmeli
  - Funding negatif + OI artıyor + sıkışma varsa squeeze bonusu doğru uygulanmalı
- Ranking:
  - Aynı symbol tekrar etmemeli
  - Sonuç her taramada en fazla 5 coin dönmeli
  - Aynı input ile skor sıralaması deterministik olmalı
- Journal:
  - "Bu işlemi seçiyorum" ile trade açılmalı
  - Manuel close sonrası realized PnL ve setup metrikleri doğru güncellenmeli
- AI:
  - Schema dışı öneri reddedilmeli
  - Approved indicator önce shadow modda başlamalı
  - Shadow indicator live ranking'i etkilememeli
- Güvenlik:
  - Firestore rules başka kullanıcı verisini okumaya ve yazmaya izin vermemeli
  - App Check olmadan kritik endpoint'ler erişilememeli
  - Gemini key client bundle'a sızmamalı
- Operasyon:
  - Scheduled function'lar idempotent olmalı
  - Aynı scan yeniden tetiklenirse duplicate kayıt oluşmamalı

## Inputs Needed, Assumptions And Defaults
- Gerekli Firebase bilgileri:
  - `projectId`
  - Web app config: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
  - Varsa `measurementId`
  - Firebase Admin veya service account erişimi
  - Firestore'un aktif olduğu bilgisi
  - Authentication içinde Google provider'ın açık olması
  - Blaze plan aktif mi bilgisi
  - App Hosting için GitHub bağlantısı kurulacak mı kararı
  - App Check için reCAPTCHA Enterprise site key
- Varsayılan ürün kararları:
  - Arayüz dili Türkçe olacak; ticker ve teknik terimler gerektiğinde İngilizce kalabilir
  - Kullanıcı tek kişi olacak
  - Trade capture manuel olacak
  - Bildirimler ilk sürümde uygulama içi olacak
  - Bölge tercihi `europe-west1`
- Güvenlik varsayımı:
  - Mevcut paylaşılan Gemini anahtarı production'da kullanılmadan önce rotate edilecek ve secret olarak saklanacak
- Uygulama sırası:
  1. Monorepo ve Firebase/Next iskeleti
  2. Analysis engine ve deterministic rule set
  3. Scheduler + persistence
  4. Dashboard + signal detail
  5. Trade journal
  6. AI coach
  7. Indicator lab + shadow/live geçişi
  8. Hardening, security, cost tuning

## Reference Notes
- Binance Futures resmi veri uçları:
  - Exchange Information
  - Open Interest
  - Open Interest Statistics
  - Funding Rate History
- Universe kaynağı:
  - CoinGecko Coins Markets
- Firebase:
  - App Hosting
  - Schedule Functions
  - Firebase Auth Web
  - Firestore Security Rules
  - App Check Web
- Gemini:
  - Gemini Models
  - Function Calling
  - Gemini JS/TS SDK
