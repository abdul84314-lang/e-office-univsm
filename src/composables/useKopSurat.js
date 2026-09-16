/**
 * useKopSurat.js — Dynamic letterhead (KOP Surat) composer
 * Implements the hierarchy rules for Universitas Sapta Mandiri
 */
import { useMasterDataStore } from '../stores/masterData.js'

export const ADDRESS_BLOCK = [
  'Kampus I  : JL. A. Yani RT 07 Kel. Batu Piring Kec. Paringin Selatan Kab. Balangan Kalsel',
  'Kampus II : JL. A. Yani KM. 5 Kel. Batu Piring Kec. Paringin Selatan Kab. Balangan Kalsel',
  'Kampus III: JL. A. Yani RT. 13, Paringin Kota, Paringin, Balangan, Kalsel',
  'Telp/Fax (0526) 209 5962 CP: 0877 7687 7462 Kode Pos: 71618',
  'Website: www.univsm.ac.id  Email: info@univsm.ac.id',
]

function getFakultasParent(unitId, units) {
  const prodi = units.find(u => u.id === unitId)
  if (prodi && prodi.type === 'prodi') {
    return units.find(u => u.type === 'fakultas' && u.id === prodi.parentFakultas)
  }
  return null
}

/**
 * Returns the KOP header lines based on selected unit
 * @param {string} unitId - ID of the selected unit
 * @returns {{
 *   yayasan: string,
 *   univName: string,
 *   lembagaLine: string|null,
 *   fakultasLine: string|null,
 *   prodiLine: string|null,
 *   sk: string,
 *   address: string[],
 * }}
 */
export function useKopSurat(unitId) {
  const mdStore = useMasterDataStore()
  const unit = mdStore.units.find(u => u.id === unitId)
  const type = unit?.type ?? 'rektorat'

  let lembagaLine = null
  let fakultasLine = null
  let prodiLine = null

  if (type === 'lembaga' || type === 'upt' || type === 'biro') {
    lembagaLine = unit.label
  } else if (type === 'bagian') {
    // Standard rektorat bagian only shows UNIVSM
  } else if (type === 'fakultas') {
    fakultasLine = unit.label
  } else if (type === 'prodi') {
    const parentFakultas = getFakultasParent(unitId, mdStore.units)
    fakultasLine = parentFakultas?.label ?? null
    prodiLine = unit.label
  } else if (type === 'ukm') {
    lembagaLine = unit.label
  }

  return {
    yayasan: 'YAYASAN SAPTA BAKTI PENDIDIKAN',
    univName: 'UNIVERSITAS SAPTA MANDIRI',
    lembagaLine,
    fakultasLine,
    prodiLine,
    sk: 'SK Pendirian No. 661 / E/O/2024',
    address: ADDRESS_BLOCK,
  }
}

/**
 * Get the unit abbreviation string for use in surat number
 */
export function getUnitKode(unitId) {
  const mdStore = useMasterDataStore()
  return mdStore.units.find(u => u.id === unitId)?.kode ?? 'USM'
}
