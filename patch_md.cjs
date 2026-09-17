const fs = require('fs');
fs.writeFileSync('src/stores/masterData.js', `import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAllUnits as getSeedUnits, KODE_SURAT_LIST as getSeedKodeSurat } from '../data/orgData.js'
import { gasGet, gasPost} from '../api/gasClient.js'

export const useMasterDataStore = defineStore('masterData', () => {
  const units = ref(getSeedUnits())
  const kodeSurat = ref([...getSeedKodeSurat])

  const isFetching = ref(false)

  async function fetchMasterData() {
    isFetching.value = true
    try {
      const resUnits = await gasGet('get_table', { table: 'Units' })
      if (resUnits && resUnits.success && resUnits.data.length > 0) {
        units.value = resUnits.data
      } else if (resUnits && resUnits.success && resUnits.data.length === 0) {
        console.log('Seeding Units to DB...')
        const seedUnits = getSeedUnits()
        for (const u of seedUnits) {
          await gasPost('save_data', { table: 'Units', record: u })
        }
      }

      const resKode = await gasGet('get_table', { table: 'KodeSurat' })
      if (resKode && resKode.success && resKode.data.length > 0) {
        kodeSurat.value = resKode.data
      } else if (resKode && resKode.success && resKode.data.length === 0) {
        console.log('Seeding KodeSurat to DB...')
        for (const k of getSeedKodeSurat) {
          // generate an ID 
          k.singkatan = k.singkatan // use singkatan as original key, but DB needs 'id'
          k.id = k.singkatan
          await gasPost('save_data', { table: 'KodeSurat', record: k })
        }
      }
    } catch (e) {
      console.warn('Gagal load master data dari DB, fallback ke memori', e)
    } finally {
      isFetching.value = false
    }
  }

  // --- CRUD Units ---
  async function addUnit(unitData) {
    const newUnit = {
      ...unitData,
      id: unitData.id || `unit-${Date.now()}`
    }
    units.value.push(newUnit)
    await gasPost('save_data', { table: 'Units', record: newUnit })
  }

  async function updateUnit(id, unitData) {
    const idx = units.value.findIndex(u => u.id === id)
    if (idx !== -1) {
      units.value[idx] = { ...units.value[idx], ...unitData }
      await gasPost('update_data', { table: 'Units', record: units.value[idx] })
    }
  }

  async function deleteUnit(id) {
    units.value = units.value.filter(u => u.id !== id)
    await gasPost('delete_data', { table: 'Units', id })
  }

  // --- CRUD Kode Surat ---
  async function addKodeSurat(data) {
    const newData = { ...data, id: data.singkatan }
    kodeSurat.value.push(newData)
    await gasPost('save_data', { table: 'KodeSurat', record: newData })
  }

  async function updateKodeSurat(singkatanLama, data) {
    const idx = kodeSurat.value.findIndex(k => k.singkatan === singkatanLama)
    if (idx !== -1) {
      kodeSurat.value[idx] = { ...kodeSurat.value[idx], ...data, id: data.singkatan }
      await gasPost('update_data', { table: 'KodeSurat', record: kodeSurat.value[idx] })
    }
  }

  async function deleteKodeSurat(singkatan) {
    kodeSurat.value = kodeSurat.value.filter(k => k.singkatan !== singkatan)
    await gasPost('delete_data', { table: 'KodeSurat', id: singkatan })
  }

  fetchMasterData()

  return {
    units,
    kodeSurat,
    isFetching,
    fetchMasterData,
    addUnit,
    updateUnit,
    deleteUnit,
    addKodeSurat,
    updateKodeSurat,
    deleteKodeSurat
  }
})`
);

