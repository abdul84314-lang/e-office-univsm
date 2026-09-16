/**
 * sppdData.js — Official YSBP Standar Perjalanan Dinas matrix
 * Source: STANDAR PERJALANAN DINAS YSBP GROUP (official table)
 *
 * Columns (sppdKey):
 *   rektor      = Rektor / Direktur
 *   warek       = Wakil Rektor / Senat
 *   dekan       = Dekan
 *   wakil_dekan = Wakil Dekan / Kaprodi / Ka UJM / Ka.LPPM
 *   sek_prodi   = Sek Prodi / Kabiro / Ka UPT
 *   kabag       = Sek.UJM / Sek.LPPM / Kabag / Gugus Tugas
 *   staf        = Jabatan Lainnya / Tanpa Jabatan
 */

export const SPPD_ZONES = [
  { id: 'dalam_kabupaten', label: 'Dalam Kabupaten' },
  { id: 'luar_kab_dalam_provinsi_tapin', label: 'Luar Kab. Dalam Provinsi (Tabolong, HST, HSU, HSS, Tapin)' },
  { id: 'luar_kab_dalam_provinsi_banjar', label: 'Luar Kab. Dalam Provinsi (Banjar, Banjarmasin, Banjarbaru)' },
  { id: 'luar_kab_dalam_provinsi_batola', label: 'Luar Kab. Dalam Provinsi (Batola, Tanah Laut, Tanah Bumbu, Kota Baru)' },
  { id: 'luar_provinsi', label: 'Luar Kabupaten Luar Provinsi' },
  { id: 'luar_negeri', label: 'Luar Negeri' },
]

/**
 * Matrix: zone → role → { uangHarian, penginapan }
 * Transport: '-' = using operasional vehicle (no reimbursement), 'real_cost' = real cost reimbursement
 */
export const SPPD_MATRIX = {
  dalam_kabupaten: {
    uangHarian: {
      rektor:      75000,
      warek:       50000,
      dekan:       50000,
      wakil_dekan: 50000,
      sek_prodi:   50000,
      kabag:       50000,
      staf:        30000,
    },
    penginapan: {
      rektor:      0,
      warek:       0,
      dekan:       0,
      wakil_dekan: 0,
      sek_prodi:   0,
      kabag:       0,
      staf:        0,
    },
    transportMode: 'operasional',
    notes: 'Gunakan mobil Operasional',
  },

  luar_kab_dalam_provinsi_tapin: {
    uangHarian: {
      rektor:      150000,
      warek:       125000,
      dekan:       125000,
      wakil_dekan: 125000,
      sek_prodi:   100000,
      kabag:       100000,
      staf:        100000,
    },
    penginapan: {
      rektor:      600000,
      warek:       500000,
      dekan:       500000,
      wakil_dekan: 400000,
      sek_prodi:   400000,
      kabag:       400000,
      staf:        400000,
    },
    transportMode: 'operasional',
    notes: 'Gunakan mobil Operasional. Penginapan jika kegiatan lebih dari 1 hari, real cost.',
  },

  luar_kab_dalam_provinsi_banjar: {
    uangHarian: {
      rektor:      150000,
      warek:       125000,
      dekan:       125000,
      wakil_dekan: 125000,
      sek_prodi:   100000,
      kabag:       100000,
      staf:        100000,
    },
    penginapan: {
      // Uses Rumah Singgah Banjarbaru — no charge
      rektor:      0,
      warek:       0,
      dekan:       0,
      wakil_dekan: 0,
      sek_prodi:   0,
      kabag:       0,
      staf:        0,
    },
    transportMode: 'operasional',
    notes: 'Gunakan mobil Operasional. Gunakan Rumah Singgah Banjarbaru.',
  },

  luar_kab_dalam_provinsi_batola: {
    uangHarian: {
      rektor:      150000,
      warek:       125000,
      dekan:       125000,
      wakil_dekan: 125000,
      sek_prodi:   100000,
      kabag:       100000,
      staf:        100000,
    },
    penginapan: {
      rektor:      600000,
      warek:       500000,
      dekan:       500000,
      wakil_dekan: 500000,
      sek_prodi:   400000,
      kabag:       400000,
      staf:        250000,
    },
    transportMode: 'operasional',
    notes: 'Gunakan mobil Operasional. Penginapan jika kegiatan lebih dari 1 hari, real cost.',
  },

  luar_provinsi: {
    uangHarian: {
      rektor:      350000,
      warek:       300000,
      dekan:       300000,
      wakil_dekan: 250000,
      sek_prodi:   250000,
      kabag:       250000,
      staf:        200000,
    },
    penginapan: {
      rektor:      600000,
      warek:       600000,
      dekan:       600000,
      wakil_dekan: 600000,
      sek_prodi:   600000,
      kabag:       500000,
      staf:        500000,
    },
    transportMode: 'real_cost',
    notes: 'Lampirkan Bukti Pembayaran. Biaya penginapan real cost lampirkan bill hotel.',
  },

  luar_negeri: {
    uangHarian: {
      rektor:      500000,
      warek:       500000,
      dekan:       500000,
      wakil_dekan: 500000,
      sek_prodi:   500000,
      kabag:       500000,
      staf:        500000,
    },
    penginapan: {
      rektor:      700000,
      warek:       700000,
      dekan:       700000,
      wakil_dekan: 700000,
      sek_prodi:   700000,
      kabag:       700000,
      staf:        700000,
    },
    transportMode: 'real_cost',
    notes: 'Real cost, lampirkan bill hotel.',
  },
}

/**
 * Get Uang Harian for a given role and zone
 */
export function getUangHarian(zoneId, roleKey) {
  return SPPD_MATRIX[zoneId]?.uangHarian[roleKey] ?? 0
}

/**
 * Get max Penginapan per malam for a given role and zone
 */
export function getPenginapanMax(zoneId, roleKey) {
  return SPPD_MATRIX[zoneId]?.penginapan[roleKey] ?? 0
}

/**
 * Calculate total SPPD pagu
 * @param {string} zoneId
 * @param {string} roleKey
 * @param {number} jumlahHari
 * @param {number} biayaTransport  (manual input, 0 if operasional)
 * @param {number} biayaPenginapan (actual input, capped at max if needed)
 * @returns {{ uangHarian, totalUangHarian, biayaTransport, biayaPenginapan, totalPagu }}
 */
export function calculateSppd({ zoneId, roleKey, jumlahHari, biayaTransport, biayaPenginapan }) {
  const uh = getUangHarian(zoneId, roleKey)
  const totalUH = uh * jumlahHari
  const totalPagu = totalUH + Number(biayaTransport || 0) + Number(biayaPenginapan || 0)
  return {
    uangHarianSatuan: uh,
    totalUangHarian:  totalUH,
    biayaTransport:   Number(biayaTransport || 0),
    biayaPenginapan:  Number(biayaPenginapan || 0),
    totalPagu,
    transportMode:    SPPD_MATRIX[zoneId]?.transportMode ?? '-',
    notes:            SPPD_MATRIX[zoneId]?.notes ?? '',
  }
}

/** Format currency IDR */
export function formatRp(value) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}
