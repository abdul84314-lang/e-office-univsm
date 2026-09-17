<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useSppdStore } from '../../stores/sppd.js'
import { useAuthStore } from '../../stores/auth.js'
import { SPPD_ZONES, formatRp } from '../../data/sppdData.js'

const router = useRouter()
const sppdStore = useSppdStore()
const auth = useAuthStore()

const statusColor = {
  draft:    'gray',
  approved: 'green',
  rejected: 'red',
}
const statusLabel = {
  draft:    'Draft',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

async function deleteDoc(id) {
  if (confirm('Yakin ingin menghapus SPPD ini?')) {
    await sppdStore.deleteSppd(id)
  }
}

function getZoneLabel(zoneId) {
  return SPPD_ZONES.find(z => z.id === zoneId)?.label ?? zoneId
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">Surat Perintah Perjalanan Dinas (SPPD)</h1>
        <p class="text-sm text-gray-500 mt-0.5">Pengajuan dan pengelolaan perjalanan dinas</p>
      </div>
      <RouterLink to="/sppd/buat" class="btn-primary">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Ajukan SPPD
      </RouterLink>
    </div>

    <div class="card p-0 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr>
              <th class="table-header">Nomor SPPD</th>
              <th class="table-header">Nama / NIP</th>
              <th class="table-header">Tujuan</th>
              <th class="table-header">Zona</th>
              <th class="table-header">Hari</th>
              <th class="table-header">Total Pagu</th>
              <th class="table-header">Status</th>
              <th class="table-header text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!sppdStore.sortedList.length">
              <td colspan="8" class="text-center py-10 text-gray-400 text-sm">Belum ada SPPD.</td>
            </tr>
            <tr
              v-for="sppd in sppdStore.sortedList"
              :key="sppd.id"
              class="hover:bg-gray-50 transition-colors"
            >
              <td class="table-cell font-mono text-xs font-semibold text-primary-900 whitespace-nowrap">
                {{ sppd.nomorSurat }}
              </td>
              <td class="table-cell">
                <p class="font-medium text-sm">{{ sppd.travelers?.[0]?.nama || sppd.nama }} <span v-if="sppd.travelers?.length > 1" class="text-xs text-blue-600 ml-1">(+{{ sppd.travelers.length - 1 }} pengikut)</span></p>
                <p class="text-xs text-gray-400">{{ sppd.travelers?.[0]?.nip || sppd.nip }}</p>
              </td>
              <td class="table-cell text-sm">{{ sppd.tujuan }}</td>
              <td class="table-cell text-xs text-gray-600 max-w-[160px]">
                <span class="line-clamp-2">{{ getZoneLabel(sppd.zoneId) }}</span>
              </td>
              <td class="table-cell text-center text-sm font-semibold">{{ sppd.jumlahHari }}</td>
              <td class="table-cell text-sm font-bold text-primary-900 whitespace-nowrap">
                {{ formatRp(sppdStore.getCalc(sppd).totalPagu) }}
              </td>
              <td class="table-cell">
                <span :class="[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border',
                  sppd.status === 'approved' ? 'bg-green-50 text-green-800 border-green-300' :
                  sppd.status === 'rejected' ? 'bg-red-50 text-red-800 border-red-300' :
                                               'bg-gray-100 text-gray-700 border-gray-300',
                ]">
                  {{ statusLabel[sppd.status] ?? sppd.status }}
                </span>
              </td>
              <td class="table-cell text-right">
                <div class="flex items-center justify-end gap-1">
                  <RouterLink
                    :to="`/sppd/${sppd.id}`"
                    class="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                    title="Lihat Detail"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </RouterLink>

                  <button
                    v-if="auth.isAdmin || auth.currentUser?.id === sppd.createdBy"
                    @click="deleteDoc(sppd.id)"
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
    </div>
  </div>
</template>
