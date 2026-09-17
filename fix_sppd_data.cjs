const fs = require('fs');
let code = fs.readFileSync('src/data/sppdData.js', 'utf8');

// replace everything from export function calculateSppd to the end of the function (before formatRp)
const parts = code.split('export function calculateSppd');
const before = parts[0];
const rest = parts[1];
const formatParts = rest.split('/** Format currency IDR */');
const after = '/** Format currency IDR */' + formatParts[1];

const newFn = \export function calculateSppd({ zoneId, roleKey, jumlahHari, biayaTransport, biayaPenginapan, travelers = [] }) {
  const roles = (travelers && travelers.length > 0) ? travelers.map(t => t.sppdRole || 'staf') : [roleKey || 'staf'];
  let totalUH = 0;
  let rincianHarian = [];
  roles.forEach(role => {
    const uh = getUangHarian(zoneId, role);
    totalUH += (uh * jumlahHari);
    rincianHarian.push({ role, uh, total: uh * jumlahHari });
  });
  const totalPagu = totalUH + Number(biayaTransport || 0) + Number(biayaPenginapan || 0);
  return {
    uangHarianSatuan: rincianHarian[0]?.uh || 0,
    totalUangHarian:  totalUH,
    biayaTransport:   Number(biayaTransport || 0),
    biayaPenginapan:  Number(biayaPenginapan || 0),
    totalPagu,
    transportMode:    SPPD_MATRIX[zoneId]?.transportMode ?? '-',
    notes:            SPPD_MATRIX[zoneId]?.notes ?? '',
    rincianHarian
  };
}

\;

fs.writeFileSync('src/data/sppdData.js', before + newFn + after);
