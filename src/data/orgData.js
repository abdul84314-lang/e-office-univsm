/**
 * orgData.js — Production organizational structure for Universitas Sapta Mandiri
 * Extracted from official org charts and SOP Penomoran Surat.
 */

// ─────────────────────────────────────────────────────────────────────────────
// ROLE CATEGORIES (maps to SPPD allowance columns)
// ─────────────────────────────────────────────────────────────────────────────
export const JABATAN_ROLES = [
  { id: 'rektor', label: 'Rektor / Direktur', sppdKey: 'rektor' },
  { id: 'warek', label: 'Wakil Rektor / Senat', sppdKey: 'warek' },
  { id: 'dekan', label: 'Dekan', sppdKey: 'dekan' },
  { id: 'wakil_dekan', label: 'Wakil Dekan / Kaprodi / Ka UJM / Ka.LPPM', sppdKey: 'wakil_dekan' },
  { id: 'sek_prodi', label: 'Sek Prodi / Kabiro / Ka UPT', sppdKey: 'sek_prodi' },
  { id: 'kabag', label: 'Sek.UJM / Sek.LPPM / Kabag / Gugus Tugas', sppdKey: 'kabag' },
  { id: 'staf', label: 'Jabatan Lainnya / Tanpa Jabatan (Staf/Tendik)', sppdKey: 'staf' },
]

// ─────────────────────────────────────────────────────────────────────────────
// REKTORAT & BAGIAN NON AKADEMIK (Berdasarkan SOP Tabel C)
// ─────────────────────────────────────────────────────────────────────────────
export const REKTORAT_UNITS = [
  { id: 'senat', label: 'Senat Universitas', kode: 'SNU', type: 'rektorat' },
  { id: 'rektor', label: 'Rektorat', kode: 'REK', type: 'rektorat' },
  { id: 'upm', label: 'Unit Penjaminan Mutu', kode: 'UPM', type: 'rektorat' },
  { id: 'lppm', label: 'Lembaga Penelitian dan Pengabdian Masyarakat', kode: 'LPPM', type: 'lembaga' },
  { id: 'sru', label: 'Sekretaris Universitas', kode: 'SRU', type: 'rektorat' },
  { id: 'aka', label: 'Bagian Akademik', kode: 'AKA', type: 'bagian' },
  { id: 'kea1', label: 'Bagian Kemahasiswaan dan Alumni', kode: 'KEA', type: 'bagian' }, // Note: KEA used twice in SOP
  { id: 'keu', label: 'Bagian Keuangan', kode: 'KEU', type: 'bagian' },
  { id: 'kep', label: 'Bagian Kepegawaian', kode: 'KEP', type: 'bagian' },
  { id: 'bal', label: 'Bagian Alumni', kode: 'BAL', type: 'bagian' },
  { id: 'bam', label: 'Bagian Administrasi Umum', kode: 'BAM', type: 'bagian' },
  { id: 'sr', label: 'Bagian Sarana', kode: 'SR', type: 'bagian' },
  { id: 'ps', label: 'Bagian Prasarana', kode: 'PS', type: 'bagian' },
  { id: 'tsi', label: 'Bagian Teknologi dan Sistem Informasi', kode: 'TSI', type: 'bagian' },
  { id: 'pub', label: 'Bagian Publikasi', kode: 'PUB', type: 'bagian' },
  { id: 'jur', label: 'Bagian Jurnal', kode: 'JUR', type: 'bagian' },
  { id: 'keb', label: 'Bagian Kebersihan', kode: 'KEB', type: 'bagian' },
  { id: 'kea2', label: 'Bagian Stabilitas dan Keamanan', kode: 'KEA', type: 'bagian' }, // Note: KEA used twice in SOP
  { id: 'hpp', label: 'Bagian Hukum & Peraturan Perundang-undangan', kode: 'HPP', type: 'bagian' },
  { id: 'tu', label: 'Bagian Tata Usaha Pimpinan', kode: 'TU', type: 'bagian' },
  { id: 'dp', label: 'Bagian Data & Pelaporan', kode: 'DP', type: 'bagian' },
  { id: 'kks', label: 'Bagian Kajian Keagamaan dan Spiritualitas', kode: 'KKS', type: 'bagian' },
  { id: 'lkppk', label: 'Bagian Layanan Konseling dan Pusat Pengembangan Karir', kode: 'LKPPK', type: 'bagian' },
  { id: 'ppb', label: 'Bagian Pelayanan dan Pengembangan Bahasa', kode: 'PPB', type: 'bagian' },
  { id: 'lt', label: 'Bagian Laboratorium Terpadu', kode: 'LT', type: 'bagian' },
  { id: 'pudt', label: 'Bagian Perpustakaan', kode: 'PUDT', type: 'bagian' },
  { id: 'ujk', label: 'Bagian Pusat Uji Kompetensi', kode: 'UJK', type: 'bagian' },
  { id: 'humas', label: 'Bagian Hubungan Masyarakat dan Media', kode: 'HUMAS', type: 'bagian' },
  { id: 'ubc', label: 'Bagian UnivSM Business Center', kode: 'UBC', type: 'bagian' },
  { id: 'bem-univ', label: 'BEM Tingkat Universitas', kode: 'BEM-UNIV', type: 'ukm' },
]

export const LEMBAGA_UNITS = [] // Migrated to REKTORAT_UNITS as a flat list from SOP C
export const BIRO_UNITS = []    // Migrated to REKTORAT_UNITS as a flat list from SOP C
export const UPT_UNITS = []     // Migrated to REKTORAT_UNITS as a flat list from SOP C

// ─────────────────────────────────────────────────────────────────────────────
// FAKULTAS & PROGRAM STUDI (Berdasarkan SOP Tabel B)
// ─────────────────────────────────────────────────────────────────────────────
export const FAKULTAS_LIST = [
  {
    id: 'fst',
    label: 'Fakultas Sains dan Teknologi',
    kode: 'FST',
    type: 'fakultas',
    prodiList: [
      { id: 'ilkom', label: 'Program Studi Ilmu Komputer', kode: 'ILKOM', type: 'prodi', parentFakultas: 'fst' },
      { id: 'ti', label: 'Program Studi Teknologi Informasi', kode: 'TI', type: 'prodi', parentFakultas: 'fst' },
      { id: 'si', label: 'Program Studi Sistem Informasi', kode: 'SI', type: 'prodi', parentFakultas: 'fst' },
      { id: 'ts', label: 'Program Studi Teknik Sipil', kode: 'TS', type: 'prodi', parentFakultas: 'fst' },
    ],
  },
  {
    id: 'fkes',
    label: 'Fakultas Kesehatan',
    kode: 'FKES',
    type: 'fakultas',
    prodiList: [
      { id: 'gz', label: 'Program Studi Gizi', kode: 'GZ', type: 'prodi', parentFakultas: 'fkes' },
    ],
  },
  {
    id: 'fhm',
    label: 'Fakultas Humaniora',
    kode: 'FHM',
    type: 'fakultas',
    prodiList: [
      { id: 'h', label: 'Program Studi Hukum', kode: 'H', type: 'prodi', parentFakultas: 'fhm' },
      { id: 'm', label: 'Program Studi Manajemen', kode: 'M', type: 'prodi', parentFakultas: 'fhm' },
    ],
  },
  {
    id: 'fkip',
    label: 'Fakultas Keguruan dan Ilmu Pendidikan',
    kode: 'FKIP',
    type: 'fakultas',
    prodiList: [
      { id: 'pgsd', label: 'Program Studi PGSD', kode: 'PGSD', type: 'prodi', parentFakultas: 'fkip' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// LETTER TYPE CODES (Kode Surat Berdasarkan SOP Tabel A)
// ─────────────────────────────────────────────────────────────────────────────
export const KODE_SURAT_LIST = [
  { kodeNomor: '01', singkatan: 'SK', label: 'Surat Keputusan (SK)' },
  { kodeNomor: '02', singkatan: 'SU', label: 'Surat Undangan (SU)' },
  { kodeNomor: '03', singkatan: 'SPm', label: 'Surat Permohonan (SPm)' },
  { kodeNomor: '04', singkatan: 'SPb', label: 'Surat Pemberitahuan (SPb)' },
  { kodeNomor: '05', singkatan: 'SPp', label: 'Surat Peminjaman (SPp)' },
  { kodeNomor: '06', singkatan: 'SPn', label: 'Surat Pernyataan (SPn)' },
  { kodeNomor: '07', singkatan: 'SM', label: 'Surat Mandat (SM)' },
  { kodeNomor: '08', singkatan: 'ST', label: 'Surat Tugas (ST)' },
  { kodeNomor: '09', singkatan: 'SKet', label: 'Surat Keterangan (SKet)' },
  { kodeNomor: '10', singkatan: 'SR', label: 'Surat Rekomendasi (SR)' },
  { kodeNomor: '11', singkatan: 'SB', label: 'Surat Balasan (SB)' },
  { kodeNomor: '12', singkatan: 'SPPD', label: 'Surat Perintah Perjalanan Dinas (SPPD)' },
  { kodeNomor: '13', singkatan: 'SRT', label: 'Sertifikat (SRT)' },
  { kodeNomor: '14', singkatan: 'PK', label: 'Perjanjian Kerja (PK)' },
  { kodeNomor: '15', singkatan: 'Speng', label: 'Surat Pengantar (Speng)' },
  { kodeNomor: '16', singkatan: 'SP', label: 'Surat Peringatan (SP)' },
  { kodeNomor: '17', singkatan: 'IA', label: 'Implementation Arrangement (IA)' },
  { kodeNomor: '18', singkatan: 'MoU', label: 'Memorandum of Understanding (MoU)' },
  { kodeNomor: '19', singkatan: 'SKL', label: 'Surat Keterangan Lulus (SKL)' },
  { kodeNomor: '20', singkatan: 'MoA', label: 'Memorandum of Agreement (MoA)' },
  { kodeNomor: '21', singkatan: 'LAP', label: 'Surat Laporan (LAP)' },
]

// ─────────────────────────────────────────────────────────────────────────────
// ALL FLAT UNIT LIST (for unit selector dropdowns)
// ─────────────────────────────────────────────────────────────────────────────
export function getAllUnits() {
  const units = []

  // Rektorat / Bagian
  REKTORAT_UNITS.forEach(u => units.push({ ...u }))

  // Fakultas + Prodi
  FAKULTAS_LIST.forEach(f => {
    units.push({ id: f.id, label: f.label, kode: f.kode, type: 'fakultas' })
    f.prodiList.forEach(p => units.push({ ...p }))
  })

  // Add BEM and Ketua Jurusan dynamically based on FAKULTAS_LIST
  FAKULTAS_LIST.forEach(f => {
    units.push({
      id: `kjr-${f.id}`,
      label: `Ketua Jurusan ${f.label}`,
      kode: `KJR`, // From SOP table C
      type: 'jurusan',
      parentFakultas: f.id
    })
    units.push({
      id: `bem-${f.id}`,
      label: `BEM ${f.label}`,
      kode: `BEM-${f.kode}`,
      type: 'ukm',
      parentFakultas: f.id
    })
  })

  return units
}

/** Find a unit by id */
export function findUnit(id) {
  return getAllUnits().find(u => u.id === id) || null
}

/** Find the parent Fakultas of a Prodi */
export function findFakultasOfProdi(prodiId) {
  for (const f of FAKULTAS_LIST) {
    if (f.prodiList.some(p => p.id === prodiId)) return f
  }
  return null
}

/** Find the parent Lembaga of a sub-unit (Deprecated in flat structure, kept for compatibility) */
export function findLembagaOfChild(childId) {
  return null
}
