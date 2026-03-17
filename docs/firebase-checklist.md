# Firebase Checklist

Bu projeyi mock moddan çıkarıp gerçek Firebase altyapısına bağlamak için aşağıdaki bilgilere ihtiyacımız var.

## 1. Firebase Web App Config
`.env.local` içine gireceğimiz değerler:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` (opsiyonel)

## 2. Firebase Admin / Service Account
Server-side Firestore ve Functions erişimi için:

- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

Not:
- `FIREBASE_ADMIN_PRIVATE_KEY` tek satır halinde verilmeli.
- Satır sonları `\n` olarak escape edilmiş olmalı.

## 3. Uygulama Sahibi
Tek kullanıcı modunda sistem verilerini sahip bazlı izole etmek için:

- `APP_OWNER_UID`

Bu UID, Auth üzerinden giriş yaptıktan sonra oluşan gerçek kullanıcı UID'si olmalı.

## 4. Firebase Console Tarafında Açık Olması Gerekenler
- Firestore Database
- Firebase Authentication
- Google Sign-In provider
- Firebase App Hosting
- Firebase Functions
- Blaze plan

## 5. Güvenlik ve Dağıtım İçin İstenecek Ek Bilgiler
- App Hosting için GitHub repo bağlantısı kurulacak mı
- App Check için reCAPTCHA Enterprise site key
- Gerekirse Analytics kullanılacak mı

## 6. Önerilen Secret Yönetimi
Gemini key'i istemciye çıkmamalı. Aşağıdaki yaklaşım önerilir:

- Local geliştirme: `GEMINI_API_KEY` `.env.local` içinde
- Production: Firebase Functions secret veya güvenli deploy env

## 7. Sonraki Adımda Benden İsteyebileceğin İşler
Firebase bilgilerini verdiğinde şu işleri doğrudan bağlayabilirim:

1. Gerçek Firestore repository aktivasyonu
2. Firebase Auth login akışının tamamlanması
3. Functions deploy config ayarları
4. Scheduler job'larının gerçek veriye bağlanması
5. App Check ve production hardening
