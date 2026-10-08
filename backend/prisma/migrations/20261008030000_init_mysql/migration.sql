-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'KADER') NOT NULL DEFAULT 'KADER',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `peserta` (
    `id` VARCHAR(191) NOT NULL,
    `nik` CHAR(16) NOT NULL,
    `nama` VARCHAR(191) NOT NULL,
    `tanggal_lahir` DATE NOT NULL,
    `jenis_kelamin` ENUM('LAKI_LAKI', 'PEREMPUAN') NOT NULL,
    `kategori` ENUM('BALITA', 'IBU_HAMIL', 'LANSIA') NOT NULL,
    `alamat` TEXT NOT NULL,
    `no_telepon` VARCHAR(20) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `peserta_nik_key`(`nik`),
    INDEX `peserta_nama_idx`(`nama`),
    INDEX `peserta_kategori_idx`(`kategori`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jadwal_posyandu` (
    `id` VARCHAR(191) NOT NULL,
    `tanggal` DATETIME(3) NOT NULL,
    `lokasi` VARCHAR(191) NOT NULL,
    `deskripsi` TEXT NULL,
    `status` ENUM('MENDATANG', 'BERJALAN', 'SELESAI') NOT NULL DEFAULT 'MENDATANG',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `jadwal_posyandu_tanggal_status_idx`(`tanggal`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `antrean` (
    `id` VARCHAR(191) NOT NULL,
    `no_antrean` INTEGER NOT NULL,
    `peserta_id` VARCHAR(191) NOT NULL,
    `jadwal_id` VARCHAR(191) NOT NULL,
    `status` ENUM('MENUNGGU', 'DIPERIKSA', 'SELESAI', 'BATAL') NOT NULL DEFAULT 'MENUNGGU',
    `tanggal` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `antrean_jadwal_id_status_no_antrean_idx`(`jadwal_id`, `status`, `no_antrean`),
    UNIQUE INDEX `antrean_jadwal_id_no_antrean_key`(`jadwal_id`, `no_antrean`),
    UNIQUE INDEX `antrean_jadwal_id_peserta_id_key`(`jadwal_id`, `peserta_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pemeriksaan` (
    `id` VARCHAR(191) NOT NULL,
    `peserta_id` VARCHAR(191) NOT NULL,
    `jadwal_id` VARCHAR(191) NOT NULL,
    `tanggal_pemeriksaan` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `tinggi_badan` DECIMAL(5, 2) NULL,
    `berat_badan` DECIMAL(5, 2) NULL,
    `lingkar_kepala` DECIMAL(5, 2) NULL,
    `catatan` TEXT NULL,
    `status_pemeriksaan` ENUM('SELESAI', 'BELUM_DIPERIKSA') NOT NULL DEFAULT 'BELUM_DIPERIKSA',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `pemeriksaan_tanggal_pemeriksaan_status_pemeriksaan_idx`(`tanggal_pemeriksaan`, `status_pemeriksaan`),
    UNIQUE INDEX `pemeriksaan_peserta_id_jadwal_id_key`(`peserta_id`, `jadwal_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `antrean` ADD CONSTRAINT `antrean_peserta_id_fkey` FOREIGN KEY (`peserta_id`) REFERENCES `peserta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `antrean` ADD CONSTRAINT `antrean_jadwal_id_fkey` FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal_posyandu`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pemeriksaan` ADD CONSTRAINT `pemeriksaan_peserta_id_fkey` FOREIGN KEY (`peserta_id`) REFERENCES `peserta`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pemeriksaan` ADD CONSTRAINT `pemeriksaan_jadwal_id_fkey` FOREIGN KEY (`jadwal_id`) REFERENCES `jadwal_posyandu`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
