<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import { useDocumentsStore } from '../../stores/documents.js'
import { useMasterDataStore } from '../../stores/masterData.js'

const auth = useAuthStore()
const docStore = useDocumentsStore()
const mdStore = useMasterDataStore()

const form = ref({
  tanggal: new Date().toISOString().substring(0, 10),
  kodeSurat: 'ST',
  unitId: auth.currentUser?.unitId ?? 'rektor',
  perihal: '',
  tujuan: ''
})

const lastGenerated = ref(null)

function handleGenerate() {
  if (!form.value.perihal) {
    alert('Perihal surat wajib diisi untuk keperluan agenda.')
    return
  }

  const result = docStore.generateNomorManual(form.value, auth.currentUser)
  lastGenerated.value = result
  
  // Reset fields slightly for convenience
  form.value.perihal = ''
  form.value.tujuan = ''
}
</script>

<template>
  <div class="space-y-6 max-w-5xl mx-auto">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Buku Agenda & Generator Nomor Surat</h1>
        <p class="text-sm text-gray-500 mt-1">Buat nomor surat keluar secara instan untuk dokumen fisik/manual sesuai SOP.</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Generator Form -->
      <div class="lg:col-span-1 space-y-4">
        <div class="card space-y-4 border-t-4 border-t-primary-600">
          <h2 class="font-bold text-lg text-gray-800 border-b pb-2">Buat Nomor Baru</h2>
          
          <div>
            <label class="form-label">Tanggal Surat</label>
            <input type="date" v-model="form.tanggal" class="form-input" />
          </div>

          <div>
            <label class="form-label">Jenis / Kode Surat</label>
            <select v-model="form.kodeSurat" class="form-select">
              <option v-for="k in mdStore.kodeSurat" :key="k.singkatan" :value="k.singkatan">
                {{ k.kodeNomor }} — {{ k.label }}
              </option>
            </select>
          </div>

          <div>
            <label class="form-label">Unit Pengirim</label>
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

          <button class="btn-primary w-full py-2.5 mt-2" @click="handleGenerate">
            ⚡ Generate Nomor Surat
          </button>
        </div>

        <div v-if="lastGenerated" class="bg-green-50 border border-green-200 rounded-xl p-5 shadow-sm text-center">
          <p class="text-green-800 font-semibold text-sm mb-2">Nomor Surat Berhasil Dibuat!</p>
          <div class="bg-white border-2 border-green-300 rounded text-xl font-mono font-bold text-green-900 py-3 px-4 select-all">
            {{ lastGenerated.nomorSurat }}
          </div>
          <p class="text-xs text-gray-500 mt-3">Silakan salin (copy) nomor di atas ke dalam dokumen Word/PDF Anda.</p>
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
                  <th class="text-left p-3 font-semibold text-gray-600">Tgl & Unit</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Perihal / Tujuan</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Dibuat Oleh</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="docStore.sortedAgenda.length === 0">
                  <td colspan="4" class="text-center py-10 text-gray-400">Belum ada riwayat nomor manual.</td>
                </tr>
                <tr v-for="item in docStore.sortedAgenda" :key="item.id" class="border-t hover:bg-gray-50">
                  <td class="p-3 font-mono font-bold text-primary-700 whitespace-nowrap">{{ item.nomorSurat }}</td>
                  <td class="p-3">
                    <p class="font-medium text-gray-800">{{ new Date(item.tanggal).toLocaleDateString('id-ID') }}</p>
                    <p class="text-xs text-gray-500 uppercase">{{ mdStore.units.find(u => u.id === item.unitId)?.kode }}</p>
                  </td>
                  <td class="p-3">
                    <p class="font-medium text-gray-800 line-clamp-1" :title="item.perihal">{{ item.perihal }}</p>
                    <p class="text-xs text-gray-500 line-clamp-1">{{ item.tujuan }}</p>
                  </td>
                  <td class="p-3 text-gray-600 text-xs">
                    {{ item.createdBy }}<br/>
                    <span class="text-gray-400">{{ new Date(item.createdAt).toLocaleTimeString('id-ID') }}</span>
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
