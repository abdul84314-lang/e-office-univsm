/**
 * useNomorSurat.js — Auto-number generator for Surat Keluar, SPPD, and Formulir HR
 * Sesuai SOP Penomoran Universitas Sapta Mandiri:
 * - Surat Keluar: [No_Urut].[Kode_Nomor]/[Singkatan]/[Unit]/[Bulan_Romawi]/[Tahun]
 * - SPPD:         [No_Urut].12/SPPD/[Unit]/[Bulan_Romawi]/[Tahun]
 * - Formulir HR:  [No_Urut].[Kode_Form]/[Singkatan_Form]/[Kategori]/KEP/[Bulan_Romawi]/[Tahun]
 * - Reset No_Urut per Unit per Tahun (kembali ke 001 tiap ganti tahun), memakai max + 1 (anti-dobel)
 */

import { useMasterDataStore } from '../stores/masterData.js'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export const FORMULIR_HR_DEFAULTS = [
  { kodeForm: '01', singkatanForm: 'FCT', label: 'Formulir Cuti (FCT)' },
  { kodeForm: '02', singkatanForm: 'FIZ', label: 'Formulir Izin (FIZ)' },
  { kodeForm: '03', singkatanForm: 'FPK', label: 'Formulir Pengajuan Kegiatan (FPK)' },
  { kodeForm: '04', singkatanForm: 'FPD', label: 'Formulir Pengembangan Diri / Studi (FPD)' },
  { kodeForm: '05', singkatanForm: 'FKL', label: 'Formulir Klaim / Tunjangan (FKL)' },
  { kodeForm: '06', singkatanForm: 'FUPS', label: 'Formulir Usulan Perubahan Status (FUPS)' },
  { kodeForm: '07', singkatanForm: 'FEK', label: 'Formulir Evaluasi Kinerja (FEK)' },
]

export const KATEGORI_HR_LIST = [
  { code: 'Ds', label: 'Ds — Dosen' },
  { code: 'Tk', label: 'Tk — Tenaga Kependidikan (Tendik)' },
  { code: 'Um', label: 'Um — Umum / Seluruh Pegawai' },
]

export function toRoman(month) {
  return ROMAN[month] ?? ''
}

export function padNumber(n, width = 3) {
  return String(n).padStart(width, '0')
}

/**
 * Ekstrak angka nomor urut di awal nomor surat (misal "012.08/ST/REK/XI/2026" -> 12)
 */
export function parseNomorUrut(nomorSurat) {
  if (!nomorSurat) return 0
  const m = String(nomorSurat).trim().match(/^(\d{1,5})(?:[./-]|$)/)
  return m ? parseInt(m[1], 10) : 0
}

/**
 * Ekstrak tahun 4 digit dari nomor surat (misal ".../XI/2026" -> 2026), fallback ke tanggal dokumen
 */
export function parseNomorYear(nomorSurat, fallbackDateStr) {
  if (nomorSurat) {
    const m = String(nomorSurat).match(/\/(20\d{2})\s*$/)
    if (m) return parseInt(m[1], 10)
  }
  if (fallbackDateStr) {
    const d = new Date(fallbackDateStr)
    if (!isNaN(d.getTime())) return d.getFullYear()
  }
  return new Date().getFullYear()
}

/**
 * Hitung nomor urut berikutnya (MAX + 1) untuk satu Unit pada Tahun berjalan.
 * Menggabungkan seluruh dokumen (Surat Keluar sistem, Buku Agenda Manual, dan SPPD)
 * agar tidak pernah terjadi nomor duplikat meski ada surat yang dihapus,
 * dan otomatis reset ke 001 setiap pergantian tahun.
 */
export function getNextUnitYearlySequence(allRecords = [], unitId, targetDate = new Date()) {
  const dateObj = targetDate instanceof Date && !isNaN(targetDate.getTime())
    ? targetDate
    : new Date(targetDate || Date.now())
  const targetYear = dateObj.getFullYear()

  let maxUrut = 0
  for (const rec of allRecords) {
    if (!rec || !rec.nomorSurat) continue
    // Abaikan Formulir HR jika sedang menghitung unit selain kepegawaian
    if (rec.isFormulirHR && unitId !== 'kep') continue
    if (rec.unitId && unitId && rec.unitId !== unitId) continue

    const recYear = parseNomorYear(rec.nomorSurat, rec.tanggal || rec.createdAt)
    if (recYear !== targetYear) continue

    const urut = parseNomorUrut(rec.nomorSurat)
    if (urut > maxUrut) maxUrut = urut
  }

  return maxUrut + 1
}

/**
 * Generate Surat Keluar number
 * Format: [No_Urut].[Kode_Nomor]/[Singkatan]/[Unit]/[Bulan_Romawi]/[Tahun]
 * Example: 002.01/SK/ILKOM/V/2026
 */
export function generateNomorSuratKeluar({ noUrut, kodeSurat, unitKode, date = new Date() }) {
  const dateObj = date instanceof Date && !isNaN(date.getTime()) ? date : new Date()
  const month = toRoman(dateObj.getMonth() + 1)
  const year = dateObj.getFullYear()
  const urut = padNumber(noUrut)

  const mdStore = useMasterDataStore()
  const suratConfig = mdStore.kodeSurat.find(k => k.singkatan === kodeSurat)
  const kodeNomor = suratConfig ? suratConfig.kodeNomor : '00'
  const singkatan = suratConfig ? suratConfig.singkatan : kodeSurat

  return `${urut}.${kodeNomor}/${singkatan}/${unitKode}/${month}/${year}`
}

/**
 * Generate SPPD number sesuai SOP Tabel A (Kode 12 = SPPD)
 * Format: [No_Urut].12/SPPD/[Unit]/[Bulan_Romawi]/[Tahun]
 * Example: 001.12/SPPD/REK/XI/2026
 */
export function generateNomorSppd({ noUrut, unitKode, date = new Date() }) {
  const dateObj = date instanceof Date && !isNaN(date.getTime()) ? date : new Date()
  const month = toRoman(dateObj.getMonth() + 1)
  const year = dateObj.getFullYear()
  const urut = padNumber(noUrut)
  const kodeUnit = unitKode || 'REK'

  return `${urut}.12/SPPD/${kodeUnit}/${month}/${year}`
}

/**
 * Generate Formulir HR / Kepegawaian number
 * Format: [No_Urut].[Kode_Form]/[Singkatan_Form]/[Kategori]/KEP/[Bulan_Romawi]/[Tahun]
 * Example: 001.06/FUPS/Ds/KEP/XI/2026
 */
export function generateNomorFormulirHR({ noUrut, kodeForm, singkatanForm, kategori, date = new Date() }) {
  const dateObj = date instanceof Date && !isNaN(date.getTime()) ? date : new Date()
  const month = toRoman(dateObj.getMonth() + 1)
  const year = dateObj.getFullYear()
  const urut = padNumber(noUrut)
  return `${urut}.${kodeForm}/${singkatanForm}/${kategori}/KEP/${month}/${year}`
}

/** Legacy helper kept for compatibility */
export function getNextSequence(documents, prefix) {
  const matching = documents.filter(d => d.nomorSurat?.startsWith(prefix))
  return matching.length + 1
}
