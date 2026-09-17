import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateNomorSppd } from '../composables/useNomorSurat.js'
import { getUnitKode } from '../composables/useKopSurat.js'
import { gasGet, gasPost } from '../api/gasClient.js'
import { calculateSppd } from '../data/sppdData.js'

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

  async function saveSppd(data, author) {
    const existingIdx = sppdList.value.findIndex(s => s.id === data.id)
    
    if (existingIdx !== -1) {
      const updated = { ...sppdList.value[existingIdx], ...data, type: 'SPPD' }
      sppdList.value[existingIdx] = updated
      await gasPost('update_document', updated)
    } else {
      const unitKode = getUnitKode(data.unitId || 'rektor')
      const count = sppdList.value.filter(s => s.unitId === data.unitId && s.nomorSurat).length + 1
      const nomorSurat = generateNomorSppd({
        noUrut: count,
        unitKode,
        date: new Date()
      })

      const newSppd = {
        ...data,
        id: 'SPPD-' + Date.now(),
        nomorSurat,
        createdAt: new Date().toISOString(),
        createdBy: author.id,
        isSPPD: true,
        type: 'SPPD'
      }
      
      sppdList.value.push(newSppd)
      await gasPost('save_document', newSppd)
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
      await gasPost('delete_data', { table: 'SPPD', id })
    }
  }

  return {
    sppdList,
    sortedList,
    isLoading,
    fetchSPPDs,
    saveSppd,
    deleteSppd,
    getCalc
  }
})
