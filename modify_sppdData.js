import { getUangHarian, SPPD_MATRIX } from './sppdData.js'

export function calculateSppd({ zoneId, roleKey, jumlahHari, biayaTransport, biayaPenginapan, travelers = [] }) {
  // Backwards compatibility for old data with single roleKey
  const roles = travelers && travelers.length > 0 
    ? travelers.map(t => t.sppdRole || 'staf')
    : [roleKey || 'staf']

  let totalUH = 0
  let rincianHarian = []

  roles.forEach(role => {
    const uh = getUangHarian(zoneId, role)
    totalUH += (uh * jumlahHari)
    rincianHarian.push({ role, uh, total: uh * jumlahHari })
  })

  const totalPagu = totalUH + Number(biayaTransport || 0) + Number(biayaPenginapan || 0)
  
  return {
    uangHarianSatuan: rincianHarian[0]?.uh || 0, // legacy
    totalUangHarian:  totalUH,
    biayaTransport:   Number(biayaTransport || 0),
    biayaPenginapan:  Number(biayaPenginapan || 0),
    totalPagu,
    transportMode:    SPPD_MATRIX[zoneId]?.transportMode ?? '-',
    notes:            SPPD_MATRIX[zoneId]?.notes ?? '',
    rincianHarian
  }
}
