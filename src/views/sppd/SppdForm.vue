<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useSppdStore } from '../../stores/sppd.js'
import { SPPD_ZONES, SPPD_MATRIX, calculateSppd, formatRp, getPenginapanMax } from '../../data/sppdData.js'
import { JABATAN_ROLES, getAllUnits } from '../../data/orgData.js'
import DocumentKop from '../../components/common/DocumentKop.vue'

const router = useRouter()
const authStore = useAuthStore()
const sppdStore = useSppdStore()

const auth = authStore
const allUnits = getAllUnits()

const form = ref({
  travelers: [{
    nama:           auth.currentUser?.name ?? '',
    nip:            auth.currentUser?.nip ?? '',
    jabatan:        auth.currentUser?.jabatan ?? '',
    sppdRole:       auth.currentUser?.sppdRole ?? 'staf',
  }],
  unitId:         auth.currentUser?.unitId ?? 'rektor',
  tujuan:         '',
  keperluan:      '',
  zoneId:         'dalam_kabupaten',
  jumlahHari:     1,
  biayaTransport: 0,
  biayaPenginapan:0,
  tanggalBerangkat: '',
  tanggalKembali:   '',
})

const addTraveler = () => {
  form.value.travelers.push({ nama: '', nip: '', jabatan: '', sppdRole: 'staf' })
}
const removeTraveler = (idx) => {
  if (form.value.travelers.length > 1) {
    form.value.travelers.splice(idx, 1)
  }
}

const zoneInfo = computed(() => SPPD_MATRIX[form.value.zoneId] || {})
const isOperasional = computed(() => zoneInfo.value.transportMode === 'operasional')
const penginapanMax = computed(() => getPenginapanMax(form.value.zoneId, form.value.travelers[0]?.sppdRole || 'staf'))

const calc = computed(() => {
  return calculateSppd({
    zoneId: form.value.zoneId,
    jumlahHari: form.value.jumlahHari,
    biayaTransport: form.value.biayaTransport,
    biayaPenginapan: form.value.biayaPenginapan,
    travelers: form.value.travelers
  })
})

const isSubmitting = ref(false)

const handleSubmit = async () => {
  if (!form.value.tujuan || !form.value.tanggalBerangkat) {
    alert('Mohon lengkapi tujuan dan tanggal')
    return
  }
  isSubmitting.value = true
  try {
    await sppdStore.saveSppd({
      ...form.value,
      status: 'draft',
      // Store the legacy fields from traveler 1 for compatibility if needed
      nama: form.value.travelers[0].nama,
      nip: form.value.travelers[0].nip,
      jabatan: form.value.travelers[0].jabatan,
      sppdRole: form.value.travelers[0].sppdRole,
    }, auth.currentUser)
    router.push('/sppd')
  } catch (e) {
    console.error(e)
    alert('Gagal menyimpan SPPD')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <div class="flex items-center gap-3">
      <button @click="router.back()" class="p-2 hover:bg-gray-100 rounded-full transition-colors">
        <svg class="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      <div>
        <h1 class="text-xl font-bold text-gray-900">Buat SPPD Baru</h1>
        <p class="text-sm text-gray-500 mt-0.5">Pengajuan Surat Perintah Perjalanan Dinas</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Data Pegawai -->
        <div class="card space-y-4">
          <h2 class="font-semibold text-gray-800 border-b pb-2">Data Pelaksana Perjalanan Dinas</h2>
          
          <div v-for="(t, idx) in form.travelers" :key="idx" class="border p-4 rounded-lg bg-gray-50 mb-4 relative">
            <button v-if="idx > 0" @click="removeTraveler(idx)" class="absolute top-3 right-3 text-red-500 hover:text-red-700 text-xs font-bold">X Hapus</button>
            <h3 class="text-sm font-semibold mb-3">Pelaksana {{ idx + 1 }}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label class="form-label">Kategori Jabatan (SPPD)</label>
                <select v-model="t.sppdRole" class="form-select">
                  <option v-for="r in JABATAN_ROLES" :key="r.id" :value="r.sppdKey">
                    {{ r.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>
          <button @click="addTraveler" class="btn-secondary btn-sm mb-4">+ Tambah Pelaksana (Pengikut)</button>

          <div>
            <label class="form-label">Unit / Prodi Pengaju</label>
            <select v-model="form.unitId" class="form-select">
              <option v-for="u in allUnits" :key="u.id" :value="u.id">
                [{{ u.kode }}] {{ u.label }}
              </option>
            </select>
          </div>
        </div>

        <!-- Detail Perjalanan -->
        <div class="card space-y-4">
          <h2 class="font-semibold text-gray-800 border-b pb-2">Detail Perjalanan</h2>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Kota / Daerah Tujuan</label>
              <input v-model="form.tujuan" type="text" class="form-input" placeholder="Contoh: Jakarta" />
            </div>
            <div>
              <label class="form-label">Zona Perjalanan</label>
              <select v-model="form.zoneId" class="form-select">
                <option v-for="z in SPPD_ZONES" :key="z.id" :value="z.id">{{ z.label }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Tanggal Berangkat</label>
              <input v-model="form.tanggalBerangkat" type="date" class="form-input" />
            </div>
            <div>
              <label class="form-label">Tanggal Kembali</label>
              <input v-model="form.tanggalKembali" type="date" class="form-input" />
            </div>
          </div>

          <div>
            <label class="form-label">Keperluan / Maksud Perjalanan</label>
            <textarea v-model="form.keperluan" class="form-textarea" rows="2" placeholder="Uraikan keperluan perjalanan dinas..." />
          </div>

          <div>
            <label class="form-label">Jumlah Hari</label>
            <input v-model.number="form.jumlahHari" type="number" min="1" class="form-input max-w-[120px]" />
          </div>
        </div>

        <!-- Biaya -->
        <div class="card space-y-4">
          <h2 class="font-semibold text-gray-800 border-b pb-2">Rincian Biaya</h2>

          <div class="flex items-center justify-between bg-primary-50 rounded-lg px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-primary-900">Total Uang Harian</p>
              <p class="text-xs text-primary-600">Total akumulasi dari {{ form.travelers.length }} pelaksana</p>
            </div>
            <p class="text-xl font-bold text-primary-900">{{ formatRp(calc.totalUangHarian) }}</p>
          </div>

          <div>
            <label class="form-label">
              Biaya Transport (Lump Sum)
              <span v-if="isOperasional" class="text-xs text-green-600 font-normal ml-1">(Mobil Kampus - Masukkan estimasi BBM)</span>
              <span v-else class="text-xs text-gold-700 font-normal ml-1">(Real cost - masukkan jumlah aktual)</span>
            </label>
            <input v-model.number="form.biayaTransport" type="number" min="0" class="form-input" />
          </div>

          <div>
            <label class="form-label">
              Biaya Penginapan (Total Seluruh Pelaksana)
              <span v-if="penginapanMax > 0" class="text-xs text-gray-500 font-normal ml-1">
                (Isikan nilai aktual berdasarkan bill hotel)
              </span>
              <span v-else-if="zoneId === 'luar_kab_dalam_provinsi_banjar'" class="text-xs text-green-600 font-normal ml-1">
                (Gunakan Rumah Singgah - Rp 0)
              </span>
            </label>
            <input v-model.number="form.biayaPenginapan" type="number" min="0" class="form-input" />
          </div>

          <div v-if="zoneInfo.notes" class="bg-gold-50 border border-gold-200 rounded-lg px-4 py-2 text-xs text-gold-800">
            Info Zona: {{ zoneInfo.notes }}
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <button class="btn-secondary" @click="router.back()">Batal</button>
          <button class="btn-primary" @click="handleSubmit" :disabled="isSubmitting">Ajukan SPPD</button>
        </div>
      </div>

      <div class="space-y-4">
        <div class="card">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">KOP Surat</h3>
          <DocumentKop :unit-id="form.unitId" :compact="true" />
        </div>

        <div class="card bg-primary-900 text-white space-y-3">
          <h3 class="font-bold text-sm text-gold-400 uppercase tracking-wider">Kalkulasi Pagu</h3>

          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-primary-200">Total Uang Harian</span>
              <span class="font-semibold">{{ formatRp(calc.totalUangHarian) }}</span>
            </div>
            <div class="text-xs text-primary-200 mt-1" v-for="(t, i) in calc.rincianHarian" :key="i">
              - Pelaksana {{i+1}}: {{ formatRp(t.uh) }} x {{ form.jumlahHari }}
            </div>

            <div class="flex justify-between mt-3">
              <span class="text-primary-200">Biaya Transport</span>
              <span class="font-semibold">
                {{ isOperasional && !form.biayaTransport ? 'Operasional' : formatRp(calc.biayaTransport) }}
              </span>
            </div>

            <div class="flex justify-between">
              <span class="text-primary-200">Biaya Penginapan</span>
              <span class="font-semibold">{{ formatRp(calc.biayaPenginapan) }}</span>
            </div>

            <div class="border-t border-primary-700 pt-2 mt-2">
              <div class="flex justify-between">
                <span class="font-bold text-white">Total Pagu</span>
                <span class="text-xl font-extrabold text-gold-400">{{ formatRp(calc.totalPagu) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
