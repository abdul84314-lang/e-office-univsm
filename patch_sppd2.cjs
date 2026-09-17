const fs = require('fs')

let code = fs.readFileSync('src/views/sppd/SppdForm.vue', 'utf8')

// 1. Update initial form state
code = code.replace(
  /const form = ref\(\[\s\S]*?unitId:\s+auth\.currentUser?\.unitId \\?\\? 'rektor',/,
  `const form = ref({
    travelers: [{
      nama:           auth.currentUser?.name ?? '',
      nip:            auth.currentUser?.nip ?? '',
      jabatan:        auth.currentUser?.jabatan ?? '',
      sppdRole:       auth.currentUser?.sappdRole ?? 'staf',
    }],
    unitId:         auth.currentUser?.unitId ?? 'rektor',`
)

// 2. Add methods for adding/removing travelers
const methods = `
const addTraveler = () => {
  form.value.travelers.push({ nama: '', nip: '', jabatan: '', sppdRole: 'staf' })
}
const removeTraveler = (idx) => {
  if (form.value.travelers.length > 1) {
    form.value.travelers.splice(idx, 1)
  }
}
`
code = code.replace('const calc = computed(() => {', methods + '\nconst calc = computed(() => {')

	// 3. Update calc to pass travelers
code = code.replace(
  /roleKey:\s*form\.value\.sppdRole,/,
  `travelers: form.value.travelers,`
)

// 4. Update the Data Pegawai section in template
const dataPegawaiOld = `         <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Nama Lengkap</label>
              <input v-model="form.nama" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">NIP / NIK</label>
              <input v-model="form.nip" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Jabatan</label>
              <input v-model="form.jabatan" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Kategori Jabatan (SPPD)</label>
              <select v-model="form.sppdRole" class="form-select">
                <option v-for="r in JABATAN_ROLES" :key="r.id" :value="r.sppdKey">
                  {{ r.label }}
                </option>
              </select>
            </div>
          </div>`

const dataPegawaiNew = `        <div v-for="(t, idx) in form.travelers" :key="idx" class="border p-4 rounded-lg bg-gray-50 mb-4 relative">
            <button v-if="idx > 0" @click="removeTraveler(idx)" class="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-bold">X Hapus</button>
            <h3 class="text-sm font-semibold mb-3">Pelaksana {{ idx + 1 }}</h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="form-label">Nama Lengkap</label>
                <input v-model="t.nama" type="text" class="form-input" />
              </div>
              <div>
                <label class="form-label">NIP / NIK</label>
                <input v-model="t.nip" type="text" class="form-input" />
              </div>
              <div>
                <label class="form-label">Jabatan</label>
                <input v-model="t.jabatan" type="text" class="form-input" />
              </div>
              <div>
                <label class="form-label">Kategori Jabatan (Klasifikasi)</label>
                <select v-model="t.sppdRole" class="form-select">
                  <option v-for="r in JABATAN_ROLES" :key="r.id" :value="r.sppdKey">
                    {{ r.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          <button @click="addTraveler" class="btn-secondary btn-sm mb-4">+ Tambah Pelaksana (Pengikut)</button>`

code = code.replace(dataPegawaiOld, dataPegawaiNew)

	// 5. Update Rincian Biaya UI
code = code.replace(
  /<p class="text-xl font-bold text-primary-900">\\{\\{ formatRp\(calc\.uangHarianSatuan\) \\}\\}<\/p>/,
  `<div class="text-right">
              <p class="text-xl font-bold text-primary-900">{{ formatRp(calc.totalUangHarian) }}</p>
              <p class="text-xs text-primary-600">Total untuk {{ form.travelers.length }} orang</p>
            </div>`
)

// 6. Update Kalkulasi Pagu Sidebar
code = code.replace(
  /<span class="font-semibold">\\{\\{ formatRp\(calc\.uangHarianSatuan\) \\}\\} A(-*|.*?)<\/span>/,
  `<span class="font-semibold">{{ formatRp(calc.totalUangHarian) }}</span>`
)
code = code.replace(
  /<div class="flex justify-between text-primary-100 text-xs">\s*<span><\/span>\s*<span>= \\{\\{ formatRp\(calc\.totalUangHarian\) \\}\\}<\/span>\s*<\/div>/,
  `<div class="text-xs text-primary-200 mt-1" v-for="(t, i) in form.travelers" :key="i">
              - Pelaksana {{i+1}}: {{ formatRp(calc.rincianHarian?[a]?.uh) }} x {{ form.jumlahHari }}
            </div>`.replace('[a]', 'i')
)

code = code.replace(
  /<div class="text-xs text-primary-300 pt-1 border-t border-primary-700">\s*Standar YSBP: \\{\\{ JABATAN_ROLES\.find\(r\[\s\S]*?form\.sappdRole\)\?\.label \\}\\}\s*<\/div>/,
  `<div class="text-xs text-primary-300 pt-1 border-t border-primary-700">
            Standar PSEP berdasarkan komposisi jabatan pelaksana.
          </div>` if (code.includes('Standar YSBP:')) else code

fs.writeFileSync('src/views/sppd/SppdForm.vue', code)

