<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useSppdStore } from '../../stores/sppd.js'
import { SPPD_ZONES, SPPD_MATRIX, calculateSppd, formatRp, getUangHarian, getPenginapanMax } from '../../data/sppdData.js'
import { JABATAN_ROLES, getAllUnits } from '../../data/orgData.js'
import { getUnitKode } from '../../composables/useKopSurat.js'
import DocumentKop from '../../components/common/DocumentKop.vue'

const router   = useRouter()
const auth     = useAuthStore()
const sppdStore = useSppdStore()

const allUnits = getAllUnits()

const form = ref({
  nama:           auth.currentUser?.name ?? '',
  nip:            auth.currentUser?.nip ?? '',
  jabatan:        auth.currentUser?.jabatan ?? '',
  sppdRole:       auth.currentUser?.sppdRole ?? 'staf',
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

// ── Live SPPD calculation ────────────────────────────────────────────────────
const calc = computed(() => calculateSppd({
  zoneId:          form.value.zoneId,
  roleKey:         form.value.sppdRole,
  jumlahHari:      Number(form.value.jumlahHari) || 0,
  biayaTransport:  Number(form.value.biayaTransport) || 0,
  biayaPenginapan: Number(form.value.biayaPenginapan) || 0,
}))

const zoneInfo = computed(() => SPPD_MATRIX[form.value.zoneId] ?? {})
const penginapanMax = computed(() => getPenginapanMax(form.value.zoneId, form.value.sppdRole))
const isOperasional = computed(() => zoneInfo.value.transportMode === 'operasional')

function handleSubmit() {
  if (!form.value.nama || !form.value.tujuan || !form.value.tanggalBerangkat) {
    alert('Harap lengkapi Nama, Tujuan, dan Tanggal Berangkat.')
    return
  }
  const unitKode = getUnitKode(form.value.unitId)
  sppdStore.createSppd({ ...form.value, unitKode })
  router.push('/sppd')
}
</script>

<template>
  <div class="space-y-5 max-w-5xl mx-auto">
    <div class="flex items-center gap-4">
      <button class="btn-secondary btn-sm" @click="router.back()">← Kembali</button>
      <h1 class="text-xl font-bold text-gray-900">Pengajuan SPPD Baru</h1>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <!-- ── Left: Form ─────────────────────────────────────────── -->
      <div class="lg:col-span-2 space-y-4">

        <!-- Identitas Pelaksana -->
        <div class="card space-y-4">
          <h2 class="font-semibold text-gray-800 border-b pb-2">Identitas Pelaksana</h2>
          <div class="grid grid-cols-2 gap-4">
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
          </div>
          <div>
            <label class="form-label">Unit / Prodi</label>
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

          <!-- Uang Harian (auto) -->
          <div class="flex items-center justify-between bg-primary-50 rounded-lg px-4 py-3">
            <div>
              <p class="text-sm font-semibold text-primary-900">Uang Harian (per hari)</p>
              <p class="text-xs text-primary-600">Sesuai standar YSBP untuk jabatan & zona dipilih</p>
            </div>
            <p class="text-xl font-bold text-primary-900">{{ formatRp(calc.uangHarianSatuan) }}</p>
          </div>

          <!-- Transport -->
          <div>
            <label class="form-label">
              Biaya Transport
              <span v-if="isOperasional" class="text-xs text-green-600 font-normal ml-1">(Mobil Kampus — Masukkan estimasi BBM)</span>
              <span v-else class="text-xs text-gold-700 font-normal ml-1">(Real cost — masukkan jumlah aktual)</span>
            </label>
            <input
              v-model.number="form.biayaTransport"
              type="number"
              min="0"
              class="form-input"
            />
          </div>

          <!-- Penginapan -->
          <div>
            <label class="form-label">
              Biaya Penginapan (total)
              <span v-if="penginapanMax > 0" class="text-xs text-gray-500 font-normal ml-1">
                Maks. {{ formatRp(penginapanMax) }}/malam
              </span>
              <span v-else-if="zoneId === 'luar_kab_dalam_provinsi_banjar'" class="text-xs text-green-600 font-normal ml-1">
                (Gunakan Rumah Singgah — Rp 0)
              </span>
            </label>
            <input v-model.number="form.biayaPenginapan" type="number" min="0" class="form-input" />
            <p v-if="penginapanMax > 0" class="text-xs text-gray-400 mt-1">
              Masukkan biaya aktual. Lampirkan bukti pembayaran/bill hotel.
            </p>
          </div>

          <!-- Notes from matrix -->
          <div v-if="zoneInfo.notes" class="bg-gold-50 border border-gold-200 rounded-lg px-4 py-2 text-xs text-gold-800">
            ⚠️ {{ zoneInfo.notes }}
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <button class="btn-secondary" @click="router.back()">Batal</button>
          <button class="btn-primary" @click="handleSubmit">💾 Ajukan SPPD</button>
        </div>
      </div>

      <!-- ── Right: Live Summary ─────────────────────────────────── -->
      <div class="space-y-4">
        <!-- KOP Preview -->
        <div class="card">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">KOP Surat</h3>
          <DocumentKop :unit-id="form.unitId" :compact="true" />
        </div>

        <!-- Calculation Summary -->
        <div class="card bg-primary-900 text-white space-y-3">
          <h3 class="font-bold text-sm text-gold-400 uppercase tracking-wider">Kalkulasi Pagu</h3>

          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-primary-200">Uang Harian</span>
              <span class="font-semibold">{{ formatRp(calc.uangHarianSatuan) }} × {{ form.jumlahHari }} hari</span>
            </div>
            <div class="flex justify-between text-primary-100 text-xs">
              <span></span>
              <span>= {{ formatRp(calc.totalUangHarian) }}</span>
            </div>

            <div class="flex justify-between">
              <span class="text-primary-200">Biaya Transport</span>
              <span class="font-semibold">
                {{ isOperasional ? 'Operasional' : formatRp(calc.biayaTransport) }}
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

          <div class="text-xs text-primary-300 pt-1 border-t border-primary-700">
            Standar YSBP: {{ JABATAN_ROLES.find(r => r.sppdKey === form.sppdRole)?.label }}
          </div>
        </div>

        <!-- Rules reminder -->
        <div class="card text-xs text-gray-500 space-y-1.5">
          <p class="font-semibold text-gray-700">📋 Ketentuan SPPD</p>
          <p>1. SPPD bisa dicairkan jika dilengkapi surat tugas resmi dari Rektorat/Direktur.</p>
          <p>2. Jika harus menginap tanpa fasilitas yayasan, biaya penginapan maks. tabel; jika tidak ada bukti bill hotel, dicairkan 30%.</p>
          <p>3. Pengajuan bensin mobil operasional harus disertai bukti dari SPBU.</p>
        </div>
      </div>
    </div>
  </div>
</template>
