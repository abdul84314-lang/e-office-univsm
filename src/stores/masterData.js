import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAllUnits as getSeedUnits, KODE_SURAT_LIST as getSeedKodeSurat } from '../data/orgData.js'

export const useMasterDataStore = defineStore('masterData', () => {
  // Load from seed data initially
  const units = ref(getSeedUnits())
  const kodeSurat = ref([...getSeedKodeSurat])

  // --- CRUD Units ---
  function addUnit(unitData) {
    units.value.push({
      ...unitData,
      id: unitData.id || `unit-${Date.now()}`
    })
  }

  function updateUnit(id, unitData) {
    const idx = units.value.findIndex(u => u.id === id)
    if (idx !== -1) {
      units.value[idx] = { ...units.value[idx], ...unitData }
    }
  }

  function deleteUnit(id) {
    units.value = units.value.filter(u => u.id !== id)
  }

  // --- CRUD Kode Surat ---
  function addKodeSurat(data) {
    kodeSurat.value.push({ ...data })
  }

  function updateKodeSurat(singkatanLama, data) {
    const idx = kodeSurat.value.findIndex(k => k.singkatan === singkatanLama)
    if (idx !== -1) {
      kodeSurat.value[idx] = { ...kodeSurat.value[idx], ...data }
    }
  }

  function deleteKodeSurat(singkatan) {
    kodeSurat.value = kodeSurat.value.filter(k => k.singkatan !== singkatan)
  }

  return {
    units,
    kodeSurat,
    addUnit,
    updateUnit,
    deleteUnit,
    addKodeSurat,
    updateKodeSurat,
    deleteKodeSurat
  }
})
