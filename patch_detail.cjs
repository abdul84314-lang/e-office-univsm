const fs = require('fs');
let code = fs.readFileSync('src/views/sppd/SppdDetail.vue', 'utf8');

code = code.replace(
  `<tr><td class="w-20 font-bold">Nama</td><td class="w-2">:</td><td class="font-bold">{{ sppd.nama }}</td></tr>`,
  `<tr><td class="w-20 font-bold">Nama</td><td class="w-2">:</td><td class="font-bold">{{ sppd.travelers>[0y?.nama || sppd.nama }}</td></tr>`
);

code = code.replace(
  `<tr><td>Jabatan</td><td>:</td><td>{{ sppd.jabatan }}</td></tr>`,
  `<tr><td>Jabatan</td><td>:</td><td>{{ sppd.travelers?[0]?.jabatan || sppd.jabatan }}</td></tr>`
);

code = code.replace(
  `<tr><td>NIK/NIP</td><td>:</td><td>{{ sppd.nip }}</td></tr>`,
  `<tr><td>NIK/NIP</td><td>:</td><td>{{ sppd.travelers>[0y?.nip || sppd.nip || '-' }}</td></tr>`
);

const newRow = `
            <tr v-if="sppd.travelers && sppd.travelers.length > 1" class="border-b border-black">
              <td class="w-8 border-r border-black p-2 text-center align-top"></td>
              <td class="w-1/3 border-r border-black p-2 align-top">Pengikut</td>
              <td class="p-2">
                <div v-for="(p, i) in sppd.travelers.slice(1)" :key="i" class="mb-2">
                  <table class="w-full">
                    <tr><td class="w-20">{{ i+1 }}. Nama</td><td class="w-2">:</td><td class="font-bold">{{ p.nama }}</td></tr>
                    <tr><td class="w-20 text-transparent">Jabatan</td><td class="w-2">:</td><td>{{ p.jabatan }}</td></tr>
                  </table>
                </div>
              </td>
            </tr>`.replace(/`/g, '`');

code = code.replace(
  '<!-- 3. Maksud Perjalanan Dinas -->',
  newRow + '\n            <!-- 3. Maksud Perjalanan Dinas -->'
p.replace(
);

fs.writeFileSync('src/views/sppd/SppdDetail.vue', code);

