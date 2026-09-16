<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../../stores/auth.js'
import { useMasterDataStore } from '../../stores/masterData.js'
import { JABATAN_ROLES } from '../../data/orgData.js'

const auth = useAuthStore()
const mdStore = useMasterDataStore()

const showModal = ref(false)
const editingUser = ref(null)

const form = ref({
  name: '',
  nik: '',
  nidn: '',
  phone: '',
  jabatan: '',
  sppdRole: 'staf',
  unitId: 'rektor',
  email: '',
  password: 'password',
  role: 'user',
})

function openAddModal() {
  editingUser.value = null
  form.value = { name: '', nik: '', nidn: '', phone: '', jabatan: '', sppdRole: 'staf', unitId: 'rektor', email: '', password: 'password', role: 'user' }
  showModal.value = true
}

function openEditModal(user) {
  editingUser.value = user
  form.value = { ...user }
  showModal.value = true
}

function saveUser() {
  if (!form.value.name || !form.value.nik || !form.value.email) {
    alert('Nama, Email, dan NIK wajib diisi!')
    return
  }

  if (editingUser.value) {
    auth.updateUser(editingUser.value.id, form.value)
  } else {
    auth.addUser(form.value)
  }
  showModal.value = false
}

function deleteUser(id) {
  if (confirm('Yakin ingin menghapus user ini?')) {
    auth.deleteUser(id)
  }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Manajemen Pengguna</h1>
        <p class="text-sm text-gray-500 mt-0.5">Tambah, edit, dan kelola hak akses user sistem.</p>
      </div>
      <button class="btn-primary" @click="openAddModal">
        ➕ Tambah User
      </button>
    </div>

    <!-- Table -->
    <div class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th class="table-header">Nama / Kontak</th>
              <th class="table-header">Jabatan / Role SPPD</th>
              <th class="table-header">Unit</th>
              <th class="table-header">Akses Sistem</th>
              <th class="table-header text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in auth.users" :key="user.id" class="hover:bg-gray-50">
              <td class="table-cell">
                <p class="font-medium text-sm">{{ user.name }}</p>
                <p class="text-xs text-gray-500">{{ user.email }} | NIK: {{ user.nik }}</p>
              </td>
              <td class="table-cell">
                <p class="text-sm">{{ user.jabatan }}</p>
                <p class="text-xs text-gray-400 uppercase">{{ user.sppdRole }}</p>
              </td>
              <td class="table-cell text-xs uppercase">{{ user.unitId }}</td>
              <td class="table-cell">
                <span v-if="user.role === 'super_admin'" class="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">Super Admin</span>
                <span v-else-if="user.role === 'admin'" class="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">Admin</span>
                <span v-else-if="user.role === 'pimpinan'" class="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">Pimpinan</span>
                <span v-else class="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700">User Biasa</span>
              </td>
              <td class="table-cell text-right space-x-2">
                <button class="text-primary-600 hover:text-primary-800 text-sm font-medium" @click="openEditModal(user)">Edit</button>
                <button v-if="user.id !== auth.currentUser?.id" class="text-red-600 hover:text-red-800 text-sm font-medium" @click="deleteUser(user.id)">Hapus</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Form -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
          <h3 class="font-bold text-gray-900 text-lg mb-4">{{ editingUser ? 'Edit User' : 'Tambah User Baru' }}</h3>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="form-label">Nama Lengkap</label>
              <input v-model="form.name" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Email <span class="text-red-500">*</span></label>
              <input v-model="form.email" type="email" class="form-input" />
            </div>
            <div>
              <label class="form-label">NIK <span class="text-red-500">*</span></label>
              <input v-model="form.nik" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">NIDN / NUPTK (Khusus Dosen)</label>
              <input v-model="form.nidn" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">No. WhatsApp / HP</label>
              <input v-model="form.phone" type="text" class="form-input" />
            </div>
            <div>
              <label class="form-label">Jabatan (Teks)</label>
              <input v-model="form.jabatan" type="text" class="form-input" placeholder="Contoh: Rektor, Dekan, Staff" />
            </div>
            <div>
              <label class="form-label">Kategori Jabatan SPPD</label>
              <select v-model="form.sppdRole" class="form-select">
                <option v-for="r in JABATAN_ROLES" :key="r.id" :value="r.sppdKey">{{ r.label }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Penempatan Unit</label>
              <select v-model="form.unitId" class="form-select">
                <option v-for="u in mdStore.units" :key="u.id" :value="u.id">[{{ u.kode }}] {{ u.label }}</option>
              </select>
            </div>
            <div>
              <label class="form-label">Email</label>
              <input v-model="form.email" type="email" class="form-input" />
            </div>
            <div>
              <label class="form-label">Hak Akses (Role)</label>
              <select v-model="form.role" class="form-select">
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin (Tata Usaha)</option>
                <option value="pimpinan">Pimpinan</option>
                <option value="user">User Biasa</option>
              </select>
            </div>
            <div>
              <label class="form-label">Password Login</label>
              <input v-model="form.password" type="text" class="form-input" />
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
            <button class="btn-secondary" @click="showModal = false">Batal</button>
            <button class="btn-primary" @click="saveUser">💾 Simpan User</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
