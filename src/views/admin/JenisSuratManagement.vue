<script setup>
import { ref } from 'vue'
import { useMasterDataStore } from '../../stores/masterData.js'

const mdStore = useMasterDataStore()

const showModal = ref(false)
const isEditing = ref(false)
const originalSingkatan = ref(null)

const form = ref({
  kodeNomor: '',
  singkatan: '',
  label: ''
})

function openAddModal() {
  isEditing.value = false
  originalSingkatan.value = null
  form.value = { kodeNomor: '', singkatan: '', label: '' }
  showModal.value = true
}

function openEditModal(kode) {
  isEditing.value = true
  originalSingkatan.value = kode.singkatan
  form.value = { ...kode }
  showModal.value = true
}

function saveKode() {
  if (!form.value.kodeNomor || !form.value.singkatan || !form.value.label) {
    alert('Semua kolom wajib diisi!')
    return
  }

  if (isEditing.value) {
    mdStore.updateKodeSurat(originalSingkatan.value, form.value)
  } else {
    // Cek duplikasi singkatan
    if (mdStore.kodeSurat.some(k => k.singkatan === form.value.singkatan)) {
      alert('Singkatan surat ini sudah terdaftar!')
      return
    }
    mdStore.addKodeSurat(form.value)
  }
  showModal.value = false
}

function confirmDelete(kode) {
  if (confirm(`Apakah Anda yakin ingin menghapus format surat ${kode.label}?`)) {
    mdStore.deleteKodeSurat(kode.singkatan)
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Manajemen Jenis Surat</h1>
        <p class="text-sm text-gray-500 mt-0.5">Kelola kode angka dan singkatan untuk format penomoran surat otomatis.</p>
      </div>
      <button class="btn-primary" @click="openAddModal">
        + Tambah Jenis Surat
      </button>
    </div>

    <!-- Table -->
    <div class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th class="table-header w-12 text-center">No</th>
              <th class="table-header w-32 text-center">Kode Angka</th>
              <th class="table-header w-32 text-center">Singkatan</th>
              <th class="table-header">Nama / Jenis Surat</th>
              <th class="table-header w-32 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="mdStore.kodeSurat.length === 0">
              <td colspan="5" class="text-center py-8 text-gray-400">Belum ada jenis surat yang terdaftar.</td>
            </tr>
            <tr v-for="(kode, index) in mdStore.kodeSurat" :key="kode.singkatan" class="hover:bg-gray-50">
              <td class="table-cell text-center text-gray-500">{{ index + 1 }}</td>
              <td class="table-cell text-center font-mono font-bold text-primary-800">{{ kode.kodeNomor }}</td>
              <td class="table-cell text-center font-mono font-bold text-gray-700">{{ kode.singkatan }}</td>
              <td class="table-cell font-medium">{{ kode.label }}</td>
              <td class="table-cell text-center space-x-2">
                <button class="text-blue-600 hover:text-blue-800 text-sm font-medium" @click="openEditModal(kode)">Edit</button>
                <button class="text-red-600 hover:text-red-800 text-sm font-medium" @click="confirmDelete(kode)">Hapus</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <h3 class="font-bold text-gray-900 text-lg border-b pb-2">
            {{ isEditing ? 'Edit Jenis Surat' : 'Tambah Jenis Surat Baru' }}
          </h3>
          
          <div class="space-y-3">
            <div>
              <label class="form-label">Kode Angka Penomoran <span class="text-red-500">*</span></label>
              <input v-model="form.kodeNomor" type="text" class="form-input font-mono" placeholder="contoh: 01" />
              <p class="text-xs text-gray-400 mt-1">Dua digit angka sesuai pedoman rektorat.</p>
            </div>

            <div>
              <label class="form-label">Singkatan Surat (ID) <span class="text-red-500">*</span></label>
              <input v-model="form.singkatan" type="text" class="form-input font-mono uppercase" placeholder="contoh: SK" :disabled="isEditing" />
              <p class="text-xs text-gray-400 mt-1" v-if="isEditing">Singkatan tidak dapat diubah karena merupakan ID unik.</p>
            </div>

            <div>
              <label class="form-label">Nama Lengkap / Label <span class="text-red-500">*</span></label>
              <input v-model="form.label" type="text" class="form-input" placeholder="contoh: Surat Keputusan (SK)" />
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t">
            <button class="btn-secondary" @click="showModal = false">Batal</button>
            <button class="btn-primary" @click="saveKode">💾 Simpan Format</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
