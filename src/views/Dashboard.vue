<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { useDocumentsStore } from '../stores/documents.js'
import { useSppdStore } from '../stores/sppd.js'
import StatusBadge from '../components/common/StatusBadge.vue'

const auth = useAuthStore()
const docStore = useDocumentsStore()
const sppdStore = useSppdStore()

const stats = computed(() => {
  const docs = docStore.documents
  return [
    { label: 'Total Surat', value: docs.length, icon: 'envelope', color: 'blue' },
    { label: 'Menunggu Aksi', value: docs.filter(d => d.status !== 'selesai' && d.status !== 'draft').length, icon: 'clock', color: 'yellow' },
    { label: 'Selesai', value: docs.filter(d => d.status === 'selesai').length, icon: 'check', color: 'green' },
    { label: 'SPPD Bulan Ini', value: sppdStore.sppdList.length, icon: 'map', color: 'purple' },
  ]
})

const recentDocs = computed(() => docStore.sortedDocuments.slice(0, 5))
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">
          Selamat Datang, {{ auth.currentUser?.name?.split(',')[0] }} 👋
        </h1>
        <p class="text-gray-500 text-sm mt-1">
          {{ auth.currentUser?.jabatan }} — {{ new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
        </p>
      </div>
      <RouterLink to="/surat-keluar/buat" class="btn-primary no-print">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Buat Surat Baru
      </RouterLink>
    </div>

    <!-- Stat cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="card flex items-center gap-4"
      >
        <div
          :class="[
            'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
            stat.color === 'blue'   ? 'bg-blue-100 text-blue-700'   :
            stat.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
            stat.color === 'green'  ? 'bg-green-100 text-green-700'  :
                                      'bg-purple-100 text-purple-700',
          ]"
        >
          <svg v-if="stat.icon === 'envelope'" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
          </svg>
          <svg v-else-if="stat.icon === 'clock'" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else-if="stat.icon === 'check'" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <svg v-else class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 20.25l-5.25-2.625V3.75L9 6.375m0 13.875V6.375m0 13.875l6-3.375m-6-10.5l6 3.375m0 0v13.5l5.25-2.625V3.75L15 6.375" />
          </svg>
        </div>
        <div>
          <p class="text-2xl font-bold text-gray-900">{{ stat.value }}</p>
          <p class="text-xs text-gray-500 font-medium">{{ stat.label }}</p>
        </div>
      </div>
    </div>

    <!-- Recent documents table -->
    <div class="card p-0 overflow-hidden">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 class="font-semibold text-gray-900">Surat Terbaru</h2>
        <RouterLink to="/surat-keluar" class="text-sm text-primary-700 hover:underline">Lihat Semua →</RouterLink>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th class="table-header rounded-none">No. Surat / ID</th>
              <th class="table-header">Perihal</th>
              <th class="table-header">Unit</th>
              <th class="table-header">Status</th>
              <th class="table-header">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="doc in recentDocs"
              :key="doc.id"
              class="hover:bg-gray-50 cursor-pointer transition-colors"
              @click="$router.push(`/surat-keluar/${doc.id}`)"
            >
              <td class="table-cell font-mono text-xs">
                <span v-if="doc.nomorSurat" class="font-semibold text-primary-900">{{ doc.nomorSurat }}</span>
                <span v-else class="text-gray-400">{{ doc.id }}</span>
              </td>
              <td class="table-cell max-w-xs">
                <p class="truncate font-medium">{{ doc.judul }}</p>
                <p class="text-xs text-gray-400 truncate">{{ doc.perihal }}</p>
              </td>
              <td class="table-cell text-xs text-gray-600">{{ doc.unitId.toUpperCase() }}</td>
              <td class="table-cell">
                <StatusBadge
                  :status="docStore.getStatusInfo(doc.status).color"
                  :label="docStore.getStatusInfo(doc.status).label"
                />
              </td>
              <td class="table-cell text-xs text-gray-500 whitespace-nowrap">
                {{ new Date(doc.createdAt).toLocaleDateString('id-ID') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
