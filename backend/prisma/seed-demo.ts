import 'dotenv/config';
import {
  JenisKelamin,
  KategoriPeserta,
  PrismaClient,
  StatusAntrean,
  StatusJadwal,
  StatusPemeriksaan,
} from '@prisma/client';

const prisma = new PrismaClient();

const demoParticipants = [
  {
    nik: '0000000000000001',
    nama: 'Raka',
    tanggalLahir: new Date('2024-08-12T00:00:00.000Z'),
    jenisKelamin: JenisKelamin.LAKI_LAKI,
    kategori: KategoriPeserta.BALITA,
    alamat: 'Alamat contoh — data demo PELITA',
    noTelepon: '081200000001',
  },
  {
    nik: '0000000000000002',
    nama: 'Siti',
    tanggalLahir: new Date('1990-12-02T00:00:00.000Z'),
    jenisKelamin: JenisKelamin.PEREMPUAN,
    kategori: KategoriPeserta.IBU_HAMIL,
    alamat: 'Alamat contoh — data demo PELITA',
    noTelepon: '081200000002',
  },
  {
    nik: '0000000000000003',
    nama: 'Agus',
    tanggalLahir: new Date('1940-07-24T00:00:00.000Z'),
    jenisKelamin: JenisKelamin.LAKI_LAKI,
    kategori: KategoriPeserta.LANSIA,
    alamat: 'Alamat contoh — data demo PELITA',
    noTelepon: '081200000003',
  },
  {
    nik: '0000000000000004',
    nama: 'Budi',
    tanggalLahir: new Date('2023-11-02T00:00:00.000Z'),
    jenisKelamin: JenisKelamin.LAKI_LAKI,
    kategori: KategoriPeserta.BALITA,
    alamat: 'Alamat contoh — data demo PELITA',
    noTelepon: '081200000004',
  },
];

async function main() {
  const participants = [];
  for (const participant of demoParticipants) {
    const saved = await prisma.peserta.upsert({
      where: { nik: participant.nik },
      create: participant,
      update: {},
    });
    participants.push(saved);
  }

  const today = new Date();
  const todayDate = new Date(today);
  todayDate.setHours(8, 0, 0, 0);
  const upcomingDate = new Date(todayDate);
  upcomingDate.setDate(upcomingDate.getDate() + 7);

  const todayDescription = 'Posyandu Melati • 08.00 - 12.00 • PELITA_DEMO_TODAY';
  const upcomingDescription = 'Posyandu Melati • 08.00 - 12.00 • PELITA_DEMO_UPCOMING';

  const todayScheduleData = {
    tanggal: todayDate,
    lokasi: 'Balai Kelurahan',
    deskripsi: todayDescription,
    status: StatusJadwal.BERJALAN,
  };
  const existingTodaySchedule = await prisma.jadwalPosyandu.findFirst({
    where: { deskripsi: todayDescription },
  });
  const todaySchedule = existingTodaySchedule
    ? await prisma.jadwalPosyandu.update({
        where: { id: existingTodaySchedule.id },
        data: todayScheduleData,
      })
    : await prisma.jadwalPosyandu.create({ data: todayScheduleData });

  const upcomingScheduleData = {
    tanggal: upcomingDate,
    lokasi: 'Balai Kelurahan',
    deskripsi: upcomingDescription,
    status: StatusJadwal.MENDATANG,
  };
  const existingUpcomingSchedule = await prisma.jadwalPosyandu.findFirst({
    where: { deskripsi: upcomingDescription },
  });
  const upcomingSchedule = existingUpcomingSchedule
    ? await prisma.jadwalPosyandu.update({
        where: { id: existingUpcomingSchedule.id },
        data: upcomingScheduleData,
      })
    : await prisma.jadwalPosyandu.create({ data: upcomingScheduleData });

  const queueStatuses = [
    StatusAntrean.SELESAI,
    StatusAntrean.DIPERIKSA,
    StatusAntrean.MENUNGGU,
    StatusAntrean.MENUNGGU,
  ];
  const queues = [];
  for (const [index, participant] of participants.entries()) {
    const queue = await prisma.antrean.upsert({
      where: {
        jadwalId_pesertaId: {
          jadwalId: todaySchedule.id,
          pesertaId: participant.id,
        },
      },
      create: {
        noAntrean: index + 1,
        pesertaId: participant.id,
        jadwalId: todaySchedule.id,
        status: queueStatuses[index]!,
      },
      update: {},
    });
    queues.push(queue);
  }

  await prisma.pemeriksaan.upsert({
    where: {
      pesertaId_jadwalId: {
        pesertaId: participants[0]!.id,
        jadwalId: todaySchedule.id,
      },
    },
    create: {
      pesertaId: participants[0]!.id,
      jadwalId: todaySchedule.id,
      tanggalPemeriksaan: todayDate,
      beratBadan: 11.2,
      tinggiBadan: 85,
      lingkarKepala: 46,
      catatan: 'Pemeriksaan contoh untuk demo. Bukan data pasien sebenarnya.',
      statusPemeriksaan: StatusPemeriksaan.SELESAI,
    },
    update: {},
  });

  await prisma.pemeriksaan.upsert({
    where: {
      pesertaId_jadwalId: {
        pesertaId: participants[1]!.id,
        jadwalId: todaySchedule.id,
      },
    },
    create: {
      pesertaId: participants[1]!.id,
      jadwalId: todaySchedule.id,
      tanggalPemeriksaan: todayDate,
      catatan: 'Pemeriksaan belum selesai — data demo.',
      statusPemeriksaan: StatusPemeriksaan.BELUM_DIPERIKSA,
    },
    update: {},
  });

  console.info(
    `Demo data siap: ${participants.length} peserta, 2 jadwal, ${queues.length} antrean, 2 catatan pemeriksaan. ID jadwal demo berikutnya: ${upcomingSchedule.id}`,
  );
  console.warn('Semua data peserta demo bersifat sintetis; jangan gunakan sebagai data pasien sebenarnya.');
}

main()
  .catch((error: unknown) => {
    console.error('Demo data seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
