<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { useSppdStore } from '../../stores/sppd.js'
import { SPPD_ZONES } from '../../data/sppdData.js'
import { formatRp } from '../../data/sppdData.js'

const router = useRouter()
const sppdStore = useSppdStore()

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
                <RouterLink :to="`/sppd/${sppd.id}`" class="btn-secondary btn-sm text-xs">
                  Detail
                </RouterLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
