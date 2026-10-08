import express from 'express';
import cookieParser from 'cookie-parser';
import { authenticate } from './middleware/auth.js';
import authRouter from './routes/auth.routes.js';
import pesertaRouter from './routes/peserta.routes.js';
import jadwalRouter from './routes/jadwal.routes.js';
import antreanRouter from './routes/antrean.routes.js';
import examinationRouter from './routes/pemeriksaan.routes.js';
import analyticsRouter from './routes/rekapitulasi.routes.js';
import { errorHandler, failure, success } from './utils/response.js';

export const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000').split(',').map((origin) => origin.trim());
app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.get('/api', (req, res) => {
  const acceptsHtml = req.get('accept')?.split(',').some((contentType) =>
    contentType.split(';', 1)[0]?.trim() === 'text/html',
  );
  if (acceptsHtml) {
    return res.type('html').send(`<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PELITA API</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f8f7fc;color:#1f2937;font:16px/1.6 system-ui,sans-serif}
      main{max-width:34rem;margin:1rem;padding:2rem;border:1px solid #e9d5ff;border-radius:1.5rem;background:white;box-shadow:0 12px 35px #312e8112}
      h1{margin:0;color:#6d28d9}p{color:#4b5563}.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}
      a{display:inline-block;padding:.7rem 1rem;border-radius:.8rem;background:linear-gradient(100deg,#7e3af2,#e14eca);color:white;text-decoration:none;font-weight:650}
      a.secondary{border:1px solid #ddd6fe;background:white;color:#6d28d9}
      code{padding:.15rem .4rem;border-radius:.35rem;background:#f3f4f6}
    </style>
  </head>
  <body>
    <main>
      <h1>PELITA API aktif</h1>
      <p>Alamat ini untuk layanan backend, bukan halaman aplikasi. Buka frontend PELITA untuk masuk dan menggunakan sistem.</p>
      ${process.env.DATABASE_URL ? '' : '<p><strong>Database belum dikonfigurasi.</strong> Isi DATABASE_URL di backend/.env, jalankan migrasi dan seed admin, lalu mulai ulang backend agar login dapat digunakan.</p>'}
      <div class="actions">
        <a href="http://localhost:3000/login">Buka aplikasi PELITA</a>
        <a class="secondary" href="/health">Cek status API</a>
      </div>
      <p>API tersedia di <code>/api/auth</code>, <code>/api/peserta</code>, <code>/api/jadwal</code>, <code>/api/antrean</code>, <code>/api/pemeriksaan</code>, dan <code>/api/rekapitulasi</code>.</p>
    </main>
  </body>
</html>`);
  }

  return success(res, {
    status: 'ok',
    health: '/api/health',
    frontend: 'http://localhost:3000/login',
    endpoints: ['/api/auth', '/api/peserta', '/api/jadwal', '/api/antrean', '/api/pemeriksaan', '/api/rekapitulasi'],
  }, 'PELITA API is running');
});
app.get('/api/health', (_req, res) => {
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  if (!databaseConfigured) {
    return failure(res, 'API aktif, tetapi database belum dikonfigurasi', 503, {
      status: 'needs_configuration',
      databaseConfigured: false,
    });
  }
  return success(res, { status: 'ok', databaseConfigured: true }, 'API is healthy');
});
app.use('/api/auth', authRouter);
app.use('/api/peserta', authenticate, pesertaRouter);
app.use('/api/jadwal', authenticate, jadwalRouter);
app.use('/api/antrean', authenticate, antreanRouter);
app.use('/api/pemeriksaan', authenticate, examinationRouter);
app.use('/api/rekapitulasi', authenticate, analyticsRouter);
app.use((_req, res) => failure(res, 'Route not found', 404));
app.use(errorHandler);
