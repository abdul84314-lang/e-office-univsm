/**
 * useNomorSurat.js â€” Auto-number generator for Surat Keluar and Formulir HR
 */

import { useMasterDataStore } from '../stores/masterData.js'

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export function toRoman(month) {
  return ROMAN[month] ?? ''
}

export function padNumber(n, width = 3) {
  return String(n).padStart(width, '0')
}

/**
 * Generate Surat Keluar number
 * Format: [No_Urut].[Kode_Nomor]/[Singkatan]/[Unit]/[Bulan_Romawi]/[Tahun]
 * Example: 002.01/SK/ILKOM/V/2025
 *
 * @param {{ noUrut: number, kodeSurat: string, unitKode: string, date?: Date }} params
 */
export function generateNomorSuratKeluar({ noUrut, kodeSurat, unitKode, date = new Date() }) {
  const month = toRoman(date.getMonth() + 1)
  const year = date.getFullYear()
  const urut = padNumber(noUrut)
  
  // Find the exact surat config based on singkatan
  const mdStore = useMasterDataStore()
  const suratConfig = mdStore.kodeSurat.find(k => k.singkatan === kodeSurat)
  const kodeNomor = suratConfig ? suratConfig.kodeNomor : '00'
  const singkatan = suratConfig ? suratConfig.singkatan : kodeSurat

  return `${urut}.${kodeNomor}/${singkatan}/${unitKode}/${month}/${year}`
}

/**
 * Generate Formulir HR number
 * Format: [No_Urut].[Kode_Form]/[Singkatan_Form]/[Kategori]/KEP/[Bulan_Romawi]/[Tahun]
 * Example: 001.06/FUPS/Ds/KEP/X/2025
 *
 * @param {{ noUrut: number, kodeForm: string, singkatanForm: string, kategori: string, date?: Date }} params
 */
export function generateNomorFormulirHR({ noUrut, kodeForm, singkatanForm, kategori, date = new Date() }) {
  const month = toRoman(date.getMonth() + 1)
  const year = date.getFullYear()
  const urut = padNumber(noUrut)
  return `${urut}.${kodeForm}/${singkatanForm}/${kategori}/KEP/${month}/${year}`
}

/** Returns the next sequence number for a given prefix from existing documents list */
export function getNextSequence(documents, prefix) {
  const matching = documents.filter(d => d.nomorSurat?.startsWith(prefix))
  return matching.length + 1
}

export function generateNomorSppd({ noUrut, unitKode, date = new Date() }) {
  const month = toRoman(date.getMonth() + 1)
  const year = date.getFullYear()
  const urut = padNumber(noUrut)
  return `/SPPD///`
}
