<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSuratMasukStore } from '../../stores/suratMasuk.js'
import { useAuthStore } from '../../stores/auth.js'
import StatusBadge from '../../components/common/StatusBadge.vue'

const router = useRouter()
const route = useRoute()
const smStore = useSuratMasukStore()
const auth = useAuthStore()

const search = ref('')
const filterStatus = ref('')

const deleteDoc = async (id) => {
  if (confirm('Yakin ingin menghapus surat masuk ini?')) {
    await smStore.deleteSuratMasuk(id)
  }
}

onMounted(() => {
  if (route.query.filter === 'action_needed') filterStatus.value = 'action_needed'
})

watch(() => route.query.filter, (newVal) => {
  if (newVal === 'action_needed') filterStatus.value = 'action_needed'
  else filterStatus.value = ''
})

const filtered = computed(() => {
  let list = smStore.sortedDocuments
  
  if (filterStatus.value === 'action_needed') {
    list = list.filter(d => {
      // Disposisi Masuk logic: Needs disposition or action from current user
      const isPenerima = d.penerimaId === auth.currentUser?.id
      const isDisposisiTujuan = d.disposisi?.kepadaId === auth.currentUser?.id
      return (d.status === 'disposisi' && isPenerima) || (d.status === 'tindak_lanjut' && isDisposisiTujuan)
    })
  } else if (filterStatus.value) {
    list = list.filter(d => d.status === filterStatus.value)
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(d =>
      d.asalSurat?.toLowerCase().includes(q) ||
      d.perihal?.toLowerCase().includes(q) ||
      d.nomorSuratAsal?.toLowerCase().includes(q)
    )
  }
  return list
})
</script>

<template>
  <div class="space-y-5">
    <!-- Page header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Surat Masuk</h1>
        <p class="text-sm text-gray-500 mt-0.5">Kelola penerimaan dan disposisi surat masuk dari luar universitas</p>
      </div>
      <RouterLink v-if="auth.isAdmin || auth.isUnitAdmin" to="/surat-masuk/buat" class="btn-primary">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Register Surat Masuk
      </RouterLink>
    </div>

    <!-- Filters -->
    <div class="card py-3 flex flex-wrap gap-3">
      <input
        v-model="search"
        type="text"
        placeholder="Cari asalsurat / perihal..."
        class="form-input max-w-xs"
      />
      <select v-model="filterStatus" class="form-select w-auto">
        <option value="">Semua Status</option>
        <option v-for="s in smStore.SURAT_MASUK_STATUSES" :key="s.key" :value="s.key">
          {{ s.label }}
        </option>
      </select>
      <button v-if="search || filterStatus" class="btn-secondary btn-sm" @click="search=''; filterStatus=''">
        Reset
      </button>
    </div>

    <!-- Table -->
    <div class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th class="table-header w-8">#</th>
              <th class="table-header">Asal Surat / Nomor</th>
              <th class="table-header">Perihal</th>
              <th class="table-header">Disposisi Ke</th>
              <th class="table-header">Status</th>
              <th class="table-header">Tanggal Surat</th>
              <th class="table-header text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!filtered.length">
              <td colspan="7" class="text-center py-12 text-gray-400 text-sm">
                Tidak ada dokumen ditemukan.
              </td>
            </tr>
            <tr
              v-for="(doc, i) in filtered"
              :key="doc.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="table-cell text-xs text-gray-400 text-center">{{ i + 1 }}</td>
              <td class="table-cell max-w-xs">
                <p class="font-bold text-gray-900 truncate">{{ doc.asalSurat }}</p>
                <p class="font-mono text-xs text-gray-500 truncate">{{ doc.nomorSuratAsal }}</p>
              </td>
              <td class="table-cell max-w-xs">
                <p class="font-medium text-gray-900 line-clamp-2">{{ doc.perihal }}</p>
              </td>
              <td class="table-cell text-sm">
                <span v-if="doc.disposisi" class="text-primary-700 font-semibold">
                  {{ doc.disposisi.kepadaNama.split(',')[0] }}
                </span>
                <span v-else class="text-gray-400 italic">Belum didisposisikan</span>
              </td>
              <td class="table-cell">
                <StatusBadge
                  :status="smStore.getStatusInfo(doc.status).color"
                  :label="smStore.getStatusInfo(doc.status).label"
                />
              </td>
              <td class="table-cell text-xs text-gray-500 whitespace-nowrap">
                {{ new Date(doc.tanggalSurat).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' }) }}
              </td>
              <td class="table-cell text-right">
                <div class="flex items-center justify-end gap-1">
                  <RouterLink
                    :to="`/surat-masuk/${doc.id}`"
                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="Lihat Detail"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </RouterLink>
                  
                  <RouterLink
                    v-if="auth.isAdmin"
                    :to="`/surat-masuk/${doc.id}`"
                    class="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                    title="Edit Dokumen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                    </svg>
                  </RouterLink>

                  <button
                    v-if="auth.isAdmin"
                    @click="deleteDoc(doc.id)"
                    class="p-1.5 text-red-600 hover:bg-red-50 rounded"
                    title="Hapus Dokumen"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
        Menampilkan {{ filtered.length }} dari {{ smStore.documents.length }} dokumen
      </div>
    </div>
  </div>
</template>
