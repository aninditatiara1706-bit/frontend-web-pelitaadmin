-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'KADER');

-- CreateEnum
CREATE TYPE "JenisKelamin" AS ENUM ('LAKI_LAKI', 'PEREMPUAN');

-- CreateEnum
CREATE TYPE "KategoriPeserta" AS ENUM ('BALITA', 'IBU_HAMIL', 'LANSIA');

-- CreateEnum
CREATE TYPE "StatusJadwal" AS ENUM ('MENDATANG', 'BERJALAN', 'SELESAI');

-- CreateEnum
CREATE TYPE "StatusAntrean" AS ENUM ('MENUNGGU', 'DIPERIKSA', 'SELESAI', 'BATAL');

-- CreateEnum
CREATE TYPE "StatusPemeriksaan" AS ENUM ('SELESAI', 'BELUM_DIPERIKSA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'KADER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peserta" (
    "id" TEXT NOT NULL,
    "nik" CHAR(16) NOT NULL,
    "nama" TEXT NOT NULL,
    "tanggal_lahir" DATE NOT NULL,
    "jenis_kelamin" "JenisKelamin" NOT NULL,
    "kategori" "KategoriPeserta" NOT NULL,
    "alamat" TEXT NOT NULL,
    "no_telepon" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peserta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jadwal_posyandu" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMPTZ(3) NOT NULL,
    "lokasi" TEXT NOT NULL,
    "deskripsi" TEXT,
    "status" "StatusJadwal" NOT NULL DEFAULT 'MENDATANG',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jadwal_posyandu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "antrean" (
    "id" TEXT NOT NULL,
    "no_antrean" INTEGER NOT NULL,
    "peserta_id" TEXT NOT NULL,
    "jadwal_id" TEXT NOT NULL,
    "status" "StatusAntrean" NOT NULL DEFAULT 'MENUNGGU',
    "tanggal" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "antrean_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pemeriksaan" (
    "id" TEXT NOT NULL,
    "peserta_id" TEXT NOT NULL,
    "jadwal_id" TEXT NOT NULL,
    "tanggal_pemeriksaan" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tinggi_badan" DECIMAL(5,2),
    "berat_badan" DECIMAL(5,2),
    "lingkar_kepala" DECIMAL(5,2),
    "catatan" TEXT,
    "status_pemeriksaan" "StatusPemeriksaan" NOT NULL DEFAULT 'BELUM_DIPERIKSA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pemeriksaan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "peserta_nik_key" ON "peserta"("nik");

-- CreateIndex
CREATE INDEX "peserta_nama_idx" ON "peserta"("nama");

-- CreateIndex
CREATE INDEX "peserta_kategori_idx" ON "peserta"("kategori");

-- CreateIndex
CREATE INDEX "jadwal_posyandu_tanggal_status_idx" ON "jadwal_posyandu"("tanggal", "status");

-- CreateIndex
CREATE INDEX "antrean_jadwal_id_status_no_antrean_idx" ON "antrean"("jadwal_id", "status", "no_antrean");

-- CreateIndex
CREATE UNIQUE INDEX "antrean_jadwal_id_no_antrean_key" ON "antrean"("jadwal_id", "no_antrean");

-- CreateIndex
CREATE UNIQUE INDEX "antrean_jadwal_id_peserta_id_key" ON "antrean"("jadwal_id", "peserta_id");

-- CreateIndex
CREATE INDEX "pemeriksaan_tanggal_pemeriksaan_status_pemeriksaan_idx" ON "pemeriksaan"("tanggal_pemeriksaan", "status_pemeriksaan");

-- CreateIndex
CREATE UNIQUE INDEX "pemeriksaan_peserta_id_jadwal_id_key" ON "pemeriksaan"("peserta_id", "jadwal_id");

-- AddForeignKey
ALTER TABLE "antrean" ADD CONSTRAINT "antrean_peserta_id_fkey" FOREIGN KEY ("peserta_id") REFERENCES "peserta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "antrean" ADD CONSTRAINT "antrean_jadwal_id_fkey" FOREIGN KEY ("jadwal_id") REFERENCES "jadwal_posyandu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pemeriksaan" ADD CONSTRAINT "pemeriksaan_peserta_id_fkey" FOREIGN KEY ("peserta_id") REFERENCES "peserta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pemeriksaan" ADD CONSTRAINT "pemeriksaan_jadwal_id_fkey" FOREIGN KEY ("jadwal_id") REFERENCES "jadwal_posyandu"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
