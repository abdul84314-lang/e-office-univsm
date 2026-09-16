<script setup>
import { ref } from 'vue'
import { useMasterDataStore } from '../../stores/masterData.js'

const mdStore = useMasterDataStore()

// State
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)

const form = ref({
  id: '',
  kode: '',
  label: '',
  type: 'bagian'
})

const UNIT_TYPES = [
  { value: 'rektorat', label: 'Rektorat' },
  { value: 'fakultas', label: 'Fakultas' },
  { value: 'prodi', label: 'Program Studi' },
  { value: 'lembaga', label: 'Lembaga' },
  { value: 'biro', label: 'Biro' },
  { value: 'bagian', label: 'Bagian' },
  { value: 'upt', label: 'UPT' },
  { value: 'ukm', label: 'UKM / Organisasi Mahasiswa' }
]

function openAddModal() {
  isEditing.value = false
  editingId.value = null
  form.value = { id: '', kode: '', label: '', type: 'bagian' }
  showModal.value = true
}

function openEditModal(unit) {
  isEditing.value = true
  editingId.value = unit.id
  form.value = { ...unit }
  showModal.value = true
}

function saveUnit() {
  if (!form.value.kode || !form.value.label) {
    alert('Kode dan Nama Unit wajib diisi!')
    return
  }

  if (isEditing.value) {
    mdStore.updateUnit(editingId.value, form.value)
  } else {
    // Generate an ID if empty
    if (!form.value.id) {
      form.value.id = form.value.kode.toLowerCase().replace(/[^a-z0-9]/g, '-')
    }
    mdStore.addUnit(form.value)
  }
  showModal.value = false
}

function confirmDelete(unit) {
  if (confirm(`Apakah Anda yakin ingin menghapus unit ${unit.label}?`)) {
    mdStore.deleteUnit(unit.id)
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Manajemen Unit & Bagian</h1>
        <p class="text-sm text-gray-500 mt-0.5">Kelola struktur organisasi Universitas Sapta Mandiri (CRUD).</p>
      </div>
      <button class="btn-primary" @click="openAddModal">
        + Tambah Unit Baru
      </button>
    </div>

    <!-- Table -->
    <div class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th class="table-header w-12 text-center">No</th>
              <th class="table-header w-32">Kode Unit</th>
              <th class="table-header">Nama Unit / Bagian</th>
              <th class="table-header w-48">Kategori / Tipe</th>
              <th class="table-header w-32 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="mdStore.units.length === 0">
              <td colspan="5" class="text-center py-8 text-gray-400">Belum ada unit yang terdaftar.</td>
            </tr>
            <tr v-for="(unit, index) in mdStore.units" :key="unit.id" class="hover:bg-gray-50">
              <td class="table-cell text-center text-gray-500">{{ index + 1 }}</td>
              <td class="table-cell font-mono font-bold text-primary-800">{{ unit.kode }}</td>
              <td class="table-cell font-medium">{{ unit.label }}</td>
              <td class="table-cell">
                <span :class="[
                  'px-2 py-0.5 rounded text-xs font-semibold uppercase',
                  unit.type === 'rektorat' ? 'bg-red-100 text-red-700' :
                  unit.type === 'fakultas' ? 'bg-blue-100 text-blue-700' :
                  unit.type === 'prodi' ? 'bg-green-100 text-green-700' :
                  unit.type === 'lembaga' ? 'bg-yellow-100 text-yellow-700' :
                  unit.type === 'biro' ? 'bg-purple-100 text-purple-700' :
                                         'bg-gray-100 text-gray-700'
                ]">
                  {{ unit.type }}
                </span>
              </td>
              <td class="table-cell text-center space-x-2">
                <button class="text-blue-600 hover:text-blue-800 text-sm font-medium" @click="openEditModal(unit)">Edit</button>
                <button class="text-red-600 hover:text-red-800 text-sm font-medium" @click="confirmDelete(unit)">Hapus</button>
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
            {{ isEditing ? 'Edit Unit' : 'Tambah Unit Baru' }}
          </h3>
          
          <div class="space-y-3">
            <div v-if="!isEditing">
              <label class="form-label">ID Sistem (Opsional)</label>
              <input v-model="form.id" type="text" class="form-input" placeholder="contoh: lp2m (Dibiarkan kosong akan auto-generate)" />
            </div>

            <div>
              <label class="form-label">Kode Unit (KOP Surat) <span class="text-red-500">*</span></label>
              <input v-model="form.kode" type="text" class="form-input uppercase" placeholder="contoh: LPPM" />
            </div>

            <div>
              <label class="form-label">Nama Lengkap Unit <span class="text-red-500">*</span></label>
              <input v-model="form.label" type="text" class="form-input" placeholder="contoh: Lembaga Penelitian..." />
            </div>

            <div>
              <label class="form-label">Kategori / Tipe Unit <span class="text-red-500">*</span></label>
              <select v-model="form.type" class="form-select">
                <option v-for="t in UNIT_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-4 border-t">
            <button class="btn-secondary" @click="showModal = false">Batal</button>
            <button class="btn-primary" @click="saveUnit">💾 Simpan Unit</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
