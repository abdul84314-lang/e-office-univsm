import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateNomorSppd } from '../composables/useNomorSurat.js'
import { getUnitKode } from '../composables/useKopSurat.js'
import { gasGet, gasPost } from '../api/gasClient.js'

export const useSppdStore = defineStore('sppd', () => {
  const sppdList = ref([])
  const isLoading = ref(false)

  const sortedSppd = computed(() => {
    return [...sppdList.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  })

  async function fetchSPPDs() {
    isLoading.value = true
    try {
      const res = await gasGet('get_sppd')
      if (res && res.success) {
        sppdList.value = res.sppds
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
      // Update
      const updated = { ...sppdList.value[existingIdx], ...data }
      sppdList.value[existingIdx] = updated
      // We can also have an update_sppd in GAS later if needed, but for now we just save_sppd which appends in the MVP
      // For a robust system, we would call update_sppd here.
    } else {
      // Create new
      const unitKode = getUnitKode(data.unitId || 'rektor')
      const count = sppdList.value.filter(s => s.unitId === data.unitId && s.sppdNumber).length + 1
      const sppdNumber = generateNomorSppd({
        noUrut: count,
        unitKode,
        date: new Date()
      })

      const newSppd = {
        ...data,
        id: 'SPPD-' + Date.now(),
        sppdNumber,
        createdAt: new Date().toISOString(),
        createdBy: author.id,
        isSPPD: true
      }
      
      sppdList.value.push(newSppd)
      await gasPost('save_sppd', newSppd)
    }
  }

  function deleteSppd(id) {
    const idx = sppdList.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      sppdList.value.splice(idx, 1)
      // Call GAS delete if API exists
    }
  }

  return {
    sppdList,
    sortedSppd,
    isLoading,
    fetchSPPDs,
    saveSppd,
    deleteSppd
  }
})
