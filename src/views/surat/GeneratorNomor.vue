<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import { useDocumentsStore } from '../../stores/documents.js'
import { useMasterDataStore } from '../../stores/masterData.js'
import { FORMULIR_HR_DEFAULTS, KATEGORI_HR_LIST } from '../../composables/useNomorSurat.js'

const auth = useAuthStore()
const docStore = useDocumentsStore()
const mdStore = useMasterDataStore()

const activeTab = ref('surat') // 'surat' | 'hr'

const form = ref({
  tanggal: new Date().toISOString().substring(0, 10),
  kodeSurat: 'ST',
  unitId: auth.currentUser?.unitId ?? 'rektor',
  perihal: '',
  tujuan: '',
  customNomor: '',
})

const hrForm = ref({
  tanggal: new Date().toISOString().substring(0, 10),
  selectedPreset: '01',
  kodeForm: '01',
  singkatanForm: 'FCT',
  kategori: 'Ds',
  perihal: '',
  tujuan: '',
  customNomor: '',
})

function applyHrPreset() {
  const found = FORMULIR_HR_DEFAULTS.find(f => f.kodeForm === hrForm.value.selectedPreset)
  if (found) {
    hrForm.value.kodeForm = found.kodeForm
    hrForm.value.singkatanForm = found.singkatanForm
  }
}

const previewNomorSurat = computed(() => {
  return docStore.previewNextNomorSurat({
    unitId: form.value.unitId,
    kodeSurat: form.value.kodeSurat,
    date: form.value.tanggal ? new Date(form.value.tanggal) : new Date(),
  })
})

const previewNomorHR = computed(() => {
  return docStore.previewNextNomorHR({
    kodeForm: hrForm.value.kodeForm,
    singkatanForm: hrForm.value.singkatanForm,
    kategori: hrForm.value.kategori,
    date: hrForm.value.tanggal ? new Date(hrForm.value.tanggal) : new Date(),
  })
})

const lastGenerated = ref(null)
const copied = ref(false)

function handleGenerateSurat() {
  if (!form.value.perihal.trim()) {
    alert('Perihal surat wajib diisi untuk keperluan buku agenda.')
    return
  }

  const result = docStore.generateNomorManual({
    ...form.value,
    isFormulirHR: false,
  }, auth.currentUser)
  lastGenerated.value = result
  form.value.perihal = ''
  form.value.tujuan = ''
  form.value.customNomor = ''
}

function handleGenerateHR() {
  if (!hrForm.value.perihal.trim()) {
    alert('Perihal / keterangan formulir wajib diisi untuk keperluan agenda.')
    return
  }
  if (!hrForm.value.kodeForm.trim() || !hrForm.value.singkatanForm.trim()) {
    alert('Kode Form dan Singkatan Form wajib diisi.')
    return
  }

  const result = docStore.generateNomorManual({
    tanggal: hrForm.value.tanggal,
    kodeForm: hrForm.value.kodeForm.trim(),
    singkatanForm: hrForm.value.singkatanForm.trim(),
    kategori: hrForm.value.kategori,
    perihal: hrForm.value.perihal.trim(),
    tujuan: hrForm.value.tujuan.trim(),
    customNomor: hrForm.value.customNomor.trim(),
    unitId: 'kep',
    isFormulirHR: true,
  }, auth.currentUser)
  lastGenerated.value = result
  hrForm.value.perihal = ''
  hrForm.value.tujuan = ''
  hrForm.value.customNomor = ''
}

async function copyLastNumber() {
  if (!lastGenerated.value?.nomorSurat) return
  try {
    await navigator.clipboard.writeText(lastGenerated.value.nomorSurat)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}

async function handleEdit(item) {
  const newVal = prompt('Edit Nomor Surat:', item.nomorSurat)
  if (newVal !== null && newVal.trim() !== '') {
    await docStore.updateAgenda(item.id, { nomorSurat: newVal.trim() })
  }
}

async function handleDelete(item) {
  if (confirm(`Hapus permanen nomor ${item.nomorSurat}?`)) {
    await docStore.deleteAgenda(item.id)
  }
}
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Buku Agenda & Generator Nomor Surat</h1>
        <p class="text-sm text-gray-500 mt-1">
          Penomoran otomatis sesuai SOP UNIVSM (urut <strong>Per Unit per Tahun</strong>, anti-dobel lintas Surat Sistem, Agenda Manual &amp; SPPD, reset 001 tiap ganti tahun).
        </p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Generator Form -->
      <div class="lg:col-span-1 space-y-4">
        <div class="card space-y-4 border-t-4 border-t-primary-600">
          <!-- Tabs -->
          <div class="flex rounded-lg bg-gray-100 p-1 text-xs font-semibold">
            <button
              type="button"
              class="flex-1 py-1.5 rounded-md transition-colors"
              :class="activeTab === 'surat' ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
              @click="activeTab = 'surat'"
            >
              Surat Keluar / SPPD
            </button>
            <button
              type="button"
              class="flex-1 py-1.5 rounded-md transition-colors"
              :class="activeTab === 'hr' ? 'bg-white text-primary-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'"
              @click="activeTab = 'hr'"
            >
              Formulir HR (KEP)
            </button>
          </div>

          <!-- Tab 1: Surat Keluar / SPPD -->
          <div v-if="activeTab === 'surat'" class="space-y-3.5">
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p class="text-[11px] text-blue-800 font-semibold">Pratinjau Nomor Otomatis SOP:</p>
              <p class="font-mono font-bold text-sm text-primary-900 mt-0.5 break-all">{{ previewNomorSurat }}</p>
            </div>

            <div>
              <label class="form-label">Tanggal Surat</label>
              <input type="date" v-model="form.tanggal" class="form-input" />
            </div>

            <div>
              <label class="form-label">Jenis / Kode Surat (SOP Tabel A)</label>
              <select v-model="form.kodeSurat" class="form-select">
                <option v-for="k in mdStore.kodeSurat" :key="k.singkatan" :value="k.singkatan">
                  {{ k.kodeNomor }} — {{ k.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="form-label">Unit Pengirim (SOP Tabel B &amp; C)</label>
              <select v-model="form.unitId" class="form-select">
                <option v-for="u in mdStore.units" :key="u.id" :value="u.id">
                  [{{ u.kode }}] {{ u.label }}
                </option>
              </select>
            </div>

            <div>
              <label class="form-label">Perihal Surat <span class="text-red-500">*</span></label>
              <input type="text" v-model="form.perihal" class="form-input" placeholder="contoh: Undangan Rapat Evaluasi" />
            </div>

            <div>
              <label class="form-label">Tujuan Surat</label>
              <input type="text" v-model="form.tujuan" class="form-input" placeholder="contoh: Dekan Fakultas..." />
            </div>

            <div>
              <label class="form-label">Nomor Manual (Opsional — kosongkan untuk otomatis)</label>
              <input type="text" v-model="form.customNomor" class="form-input font-mono text-xs" :placeholder="previewNomorSurat" />
            </div>

            <button class="btn-primary w-full py-2.5 mt-1" @click="handleGenerateSurat">
              Generate &amp; Catat ke Buku Agenda
            </button>
          </div>

          <!-- Tab 2: Formulir HR / Kepegawaian -->
          <div v-else class="space-y-3.5">
            <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <p class="text-[11px] text-emerald-800 font-semibold">Pratinjau Nomor Formulir HR (SOP):</p>
              <p class="font-mono font-bold text-sm text-emerald-950 mt-0.5 break-all">{{ previewNomorHR }}</p>
            </div>

            <div>
              <label class="form-label">Tanggal Formulir</label>
              <input type="date" v-model="hrForm.tanggal" class="form-input" />
            </div>

            <div>
              <label class="form-label">Jenis Formulir HR</label>
              <select v-model="hrForm.selectedPreset" @change="applyHrPreset" class="form-select">
                <option v-for="f in FORMULIR_HR_DEFAULTS" :key="f.kodeForm" :value="f.kodeForm">
                  {{ f.kodeForm }} — {{ f.label }}
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="form-label">Kode Form</label>
                <input type="text" v-model="hrForm.kodeForm" class="form-input font-mono text-xs" placeholder="06" />
              </div>
              <div>
                <label class="form-label">Singkatan Form</label>
                <input type="text" v-model="hrForm.singkatanForm" class="form-input font-mono text-xs uppercase" placeholder="FUPS" />
              </div>
            </div>

            <div>
              <label class="form-label">Kategori Pegawai</label>
              <select v-model="hrForm.kategori" class="form-select">
                <option v-for="k in KATEGORI_HR_LIST" :key="k.code" :value="k.code">{{ k.label }}</option>
              </select>
            </div>

            <div>
              <label class="form-label">Perihal / Nama Pengaju <span class="text-red-500">*</span></label>
              <input type="text" v-model="hrForm.perihal" class="form-input" placeholder="contoh: Usulan Perubahan Status Dosen..." />
            </div>

            <div>
              <label class="form-label">Keterangan / Tujuan</label>
              <input type="text" v-model="hrForm.tujuan" class="form-input" placeholder="Bagian Kepegawaian" />
            </div>

            <div>
              <label class="form-label">Nomor Manual (Opsional)</label>
              <input type="text" v-model="hrForm.customNomor" class="form-input font-mono text-xs" :placeholder="previewNomorHR" />
            </div>

            <button class="btn-primary w-full py-2.5 mt-1 bg-emerald-700 hover:bg-emerald-800 border-none" @click="handleGenerateHR">
              Generate Nomor Formulir HR
            </button>
          </div>
        </div>

        <div v-if="lastGenerated" class="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm text-center space-y-2">
          <p class="text-green-800 font-semibold text-sm">Nomor Berhasil Dicatat di Buku Agenda!</p>
          <div class="bg-white border-2 border-green-300 rounded text-lg font-mono font-bold text-green-900 py-2.5 px-3 select-all break-all">
            {{ lastGenerated.nomorSurat }}
          </div>
          <button type="button" class="btn-secondary btn-sm text-xs" @click="copyLastNumber">
            {{ copied ? 'Nomor Disalin!' : 'Salin Nomor' }}
          </button>
        </div>
      </div>

      <!-- Agenda Table -->
      <div class="lg:col-span-2">
        <div class="card p-0 overflow-hidden h-full">
          <div class="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 class="font-bold text-gray-800">Riwayat Buku Agenda Manual</h3>
            <span class="text-xs text-gray-500">Tercatat: {{ docStore.sortedAgenda.length }} Dokumen</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-100/50">
                  <th class="text-left p-3 font-semibold text-gray-600">Nomor Surat</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Tgl &amp; Unit</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Perihal / Tujuan</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Dibuat Oleh</th>
                  <th class="text-right p-3 font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="docStore.sortedAgenda.length === 0">
                  <td colspan="5" class="text-center py-10 text-gray-400">Belum ada riwayat nomor manual.</td>
                </tr>
                <tr v-for="item in docStore.sortedAgenda" :key="item.id" class="border-t hover:bg-gray-50">
                  <td class="p-3 font-mono font-bold text-primary-700 whitespace-nowrap">
                    {{ item.nomorSurat }}
                    <span v-if="item.isFormulirHR" class="ml-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-sans">HR</span>
                  </td>
                  <td class="p-3">
                    <p class="font-medium text-gray-800">{{ new Date(item.tanggal).toLocaleDateString('id-ID') }}</p>
                    <p class="text-xs text-gray-500 uppercase">{{ item.isFormulirHR ? 'KEP' : (mdStore.units.find(u => u.id === item.unitId)?.kode || item.unitId) }}</p>
                  </td>
                  <td class="p-3">
                    <p class="font-medium text-gray-800 line-clamp-1" :title="item.perihal">{{ item.perihal }}</p>
                    <p class="text-xs text-gray-500 line-clamp-1">{{ item.tujuan }}</p>
                  </td>
                  <td class="p-3 text-gray-600 text-xs">
                    {{ item.createdBy }}<br/>
                    <span class="text-gray-400">{{ new Date(item.createdAt).toLocaleTimeString('id-ID') }}</span>
                  </td>
                  <td class="p-3 text-right whitespace-nowrap">
                    <button @click="handleEdit(item)" class="text-blue-600 hover:text-blue-800 text-xs font-bold mr-3">Edit</button>
                    <button @click="handleDelete(item)" class="text-red-600 hover:text-red-800 text-xs font-bold">Hapus</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
