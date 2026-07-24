# Skyverse Development

Platform game berbasis Next.js. Skybound Obby tersedia sebagai game pertama di `public/games/skybound-obby`.

## Menjalankan lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`. Jangan lagi membuka file HTML secara langsung; jalankan melalui development server.

Proyek menggunakan bundler Webpack karena binary native Turbopack tidak selalu tersedia pada environment Windows yang dibatasi.

## Environment PostgreSQL

1. Pastikan PostgreSQL berjalan dan buat database bernama `skyverse`.
2. Salin `.env.example` menjadi `.env.local`.
3. Sesuaikan `DATABASE_URL` dengan username, password, host, dan port PostgreSQL.
4. Jalankan migrasi dengan `npm run db:migrate`.

### Menjalankan PostgreSQL lewat Docker

```bash
docker compose up -d
```

Gunakan nilai bawaan dari `.env.example`, lalu jalankan `npm run db:migrate` dan `npm run db:check`.

Connection pool server-only tersedia di `src/lib/db.ts`. Skema awal mencakup user, katalog game, dan progres pemain. Form login/register masih berupa UI sampai endpoint autentikasi dihubungkan.

## Pemeriksaan

```bash
npm run typecheck
npm run lint
npm run build
```
