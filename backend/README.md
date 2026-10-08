# PELITA Express API

Backend REST API mandiri untuk aplikasi PELITA. Server berjalan terpisah dari folder `frontend` di port `4000` secara default.

## Persiapan

1. Pastikan Node.js 20+ dan layanan MySQL/MariaDB aktif. Gambar phpMyAdmin menunjukkan server lokal di port standar MySQL `3306`.
2. Di phpMyAdmin, pilih **New**, buat database bernama `pelita_db`, dan pilih collation `utf8mb4_unicode_ci`.
3. Buat akun aplikasi khusus melalui tab **SQL** (ganti password contoh secara lokal):

   ```sql
   CREATE USER 'pelita_backend_app'@'127.0.0.1' IDENTIFIED BY 'GANTI_DENGAN_PASSWORD_KUAT';
   GRANT ALL PRIVILEGES ON pelita_db.* TO 'pelita_backend_app'@'127.0.0.1';
   ```

4. Dari folder `backend`, salin `.env.example` menjadi `.env` dan isi password akun aplikasi tersebut di `DATABASE_URL`. Gunakan password URL-safe (huruf, angka, `_`, `-`) atau URL-encode karakter khusus. Jangan kirim password ke chat atau commit file `.env`.
5. Pastikan `JWT_SECRET` berisi rahasia acak minimal 32 karakter dan atur kredensial admin seed.
6. Pasang dependensi dengan `npm install`.
7. Buat Prisma Client, terapkan skema MySQL, dan seed akun admin:

   ```sh
   npm run db:generate
   npm run db:deploy
   npm run db:seed
   ```

8. Jalankan API dengan `npm run dev`. Cek `GET http://localhost:4000/api/health`; status harus `200` dengan `databaseConfigured: true`.
   Gunakan `SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD` dari `.env` untuk login ke frontend. Jangan bagikan nilai rahasia tersebut.

Untuk mengisi tampilan dengan data contoh yang mirip frontend, jalankan `npm run db:seed-demo` dari folder `backend`. Perintah ini menambahkan empat peserta, jadwal hari ini dan minggu depan, antrean dengan status beragam, serta contoh hasil pemeriksaan. Data peserta dan pemeriksaan seluruhnya sintetis, bukan data pasien. Perintah aman dijalankan ulang dan tidak menghapus data yang ada.

Jika perlu mengganti password admin di Windows, jalankan perintah berikut dari folder `backend`. Terminal akan meminta password secara tersembunyi, kemudian memperbarui akun admin yang sama:

```powershell
npm run db:reset-admin
```

Untuk perubahan schema lokal selanjutnya, gunakan `npm run db:migrate -- --name nama_perubahan`. Untuk deployment, jalankan `npm run db:deploy`, `npm run build`, lalu `npm start`.

## Endpoint

Endpoint selain login, logout, dan health memerlukan cookie `pelita_session` atau header `Authorization: Bearer <token>`.

- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `/api/peserta` — CRUD peserta, filter kategori, pencarian, dan pagination
- `/api/jadwal` — jadwal posyandu
- `/api/antrean` — antrean dan perubahan status
- `/api/pemeriksaan` — pencatatan dan riwayat pemeriksaan
- `/api/rekapitulasi/stats`, `/summary`, `/trends`, `/riwayat`

Respons mengikuti format `{ success, message, data, meta? }`. CORS mengizinkan origin frontend yang ditentukan oleh `FRONTEND_ORIGIN` (pisahkan beberapa origin dengan koma).
