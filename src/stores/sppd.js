import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateNomorSppd, getNextUnitYearlySequence } from '../composables/useNomorSurat.js'
import { getUnitKode } from '../composables/useKopSurat.js'
import { gasGet, gasPost } from '../api/gasClient.js'
import { calculateSppd } from '../data/sppdData.js'
import { useDocumentsStore } from './documents.js'

export const useSppdStore = defineStore('sppd', () => {
  const sppdList = ref([])
  const isLoading = ref(false)

  const sortedList = computed(() => {
    return [...sppdList.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  })

  async function fetchSPPDs() {
    isLoading.value = true
    try {
      const res = await gasGet('get_documents')
      if (res && res.success) {
        sppdList.value = res.documents.filter(d => d.type === 'SPPD' || d.isSPPD)
      }
    } catch (e) {
      console.error('Failed to fetch SPPD', e)
    } finally {
      isLoading.value = false
    }
  }

  function previewNextNomorSppd(unitId = 'rektor', date = new Date()) {
    let allDocs = [...sppdList.value]
    try {
      const docStore = useDocumentsStore()
      allDocs = [...allDocs, ...(docStore.documents || []), ...(docStore.agendaManual || [])]
    } catch {}
    const noUrut = getNextUnitYearlySequence(allDocs, unitId, date)
    return generateNomorSppd({
      noUrut,
      unitKode: getUnitKode(unitId),
      date,
    })
  }

  async function saveSppd(data, author) {
    const existingIdx = sppdList.value.findIndex(s => s.id === data.id)

    if (existingIdx !== -1) {
      const updated = { ...sppdList.value[existingIdx], ...data, type: 'SPPD' }
      sppdList.value[existingIdx] = updated
      gasPost('update_document', updated).catch(console.error) // Optimistic
    } else {
      const unitId = data.unitId || 'rektor'
      const manualNo = (data.nomorSurat || '').trim()
      const nomorSurat = manualNo || previewNextNomorSppd(unitId, new Date())

      const newSppd = {
        ...data,
        unitId,
        id: 'SPPD-' + Date.now(),
        nomorSurat,
        createdAt: new Date().toISOString(),
        createdBy: author.id,
        isSPPD: true,
        type: 'SPPD'
      }

      sppdList.value.push(newSppd)
      gasPost('save_document', newSppd).catch(console.error) // Optimistic
    }
  }

  function getCalc(sppd) {
    return calculateSppd({
      zoneId: sppd.zoneId,
      roleKey: sppd.sppdRole,
      jumlahHari: sppd.jumlahHari,
      biayaTransport: sppd.biayaTransport,
      biayaPenginapan: sppd.biayaPenginapan,
      travelers: sppd.travelers
    })
  }

  async function deleteSppd(id) {
    const idx = sppdList.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      sppdList.value.splice(idx, 1)
      // Perbaikan: SPPD disimpan di tabel Documents, bukan tabel SPPD
      gasPost('delete_data', { table: 'Documents', id }).catch(console.error) // Optimistic
    }
  }

  return {
    sppdList,
    sortedList,
    isLoading,
    fetchSPPDs,
    previewNextNomorSppd,
    saveSppd,
    getCalc,
    deleteSppd
  }
})
