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
                <RouterLink
                  :to="`/surat-masuk/${doc.id}`"
                  class="btn-secondary btn-sm text-xs"
                >
                  Detail
                </RouterLink>
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
