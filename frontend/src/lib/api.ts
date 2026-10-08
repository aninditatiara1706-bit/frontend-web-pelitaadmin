export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number };
};

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'KADER';
};

export type Category = 'BALITA' | 'IBU_HAMIL' | 'LANSIA';

export type Participant = {
  id: string;
  nik: string;
  nama: string;
  tanggalLahir: string;
  jenisKelamin: 'LAKI_LAKI' | 'PEREMPUAN';
  kategori: Category;
  alamat: string;
  noTelepon: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Schedule = {
  id: string;
  tanggal: string;
  lokasi: string;
  deskripsi: string | null;
  status: 'MENDATANG' | 'BERJALAN' | 'SELESAI';
  _count?: { antrean: number; pemeriksaan: number };
};

export type QueueRecord = {
  id: string;
  noAntrean: number;
  pesertaId: string;
  jadwalId: string;
  status: 'MENUNGGU' | 'DIPERIKSA' | 'SELESAI' | 'BATAL';
  tanggal: string;
  peserta: Participant;
  jadwal: Schedule;
};

export type Examination = {
  id: string;
  pesertaId: string;
  jadwalId: string;
  tanggalPemeriksaan: string;
  tinggiBadan: string | number | null;
  beratBadan: string | number | null;
  lingkarKepala: string | number | null;
  catatan: string | null;
  statusPemeriksaan: 'SELESAI' | 'BELUM_DIPERIKSA';
  peserta: Participant;
  jadwal: Schedule;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ??
  'http://localhost:4000/api';

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  let response: Response;
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error(
      `Tidak dapat terhubung ke backend (${apiBaseUrl}). Pastikan server backend berjalan.`,
    );
  }

  const result = (await response.json().catch(() => null)) as
    | ApiResponse<T> & { details?: Array<{ message: string }> }
    | null;
  if (!response.ok || !result?.success) {
    const detail = result?.details?.map((item) => item.message).join(', ');
    throw new ApiError(detail || result?.message || 'Permintaan gagal', response.status);
  }

  return result;
}

export function displayCategory(category: Category) {
  return {
    BALITA: 'Balita',
    IBU_HAMIL: 'Ibu Hamil',
    LANSIA: 'Lansia',
  }[category];
}
