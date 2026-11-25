import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gasGet, gasPost } from '../api/gasClient.js'

export const SURAT_MASUK_STATUSES = [
  { key: 'registrasi',    label: 'Registrasi TU',      color: 'gray',   step: 0 },
  { key: 'disposisi',     label: 'Menunggu Disposisi', color: 'yellow', step: 1 },
  { key: 'tindak_lanjut', label: 'Tindak Lanjut',      color: 'blue',   step: 2 },
  { key: 'selesai',       label: 'Selesai / Arsip',    color: 'green',  step: 3 },
]

export const useSuratMasukStore = defineStore('suratMasuk', () => {
  const documents = ref([])
  const isLoading = ref(false)

  async function fetchSuratMasuk() {
    isLoading.value = true
    try {
      const res = await gasGet('get_documents')
      if (res && res.success) {
        documents.value = res.documents.filter(d => d.type === 'SuratMasuk' || d.id.startsWith('SM-'))
      }
    } catch (e) {
      console.error('Failed to fetch surat masuk', e)
    } finally {
      isLoading.value = false
    }
  }

  const getStatusInfo = (key) => SURAT_MASUK_STATUSES.find(s => s.key === key) ?? SURAT_MASUK_STATUSES[0]

  function generateNextNomorAgenda() {
    const now = new Date()
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
    const count = documents.value.length + 1
    return `${String(count).padStart(3, '0')}/AGD-SM/${romanMonths[now.getMonth()]}/${now.getFullYear()}`
  }

  function generateShareToken() {
    return 'dsp_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
  }

  async function createSuratMasuk(data) {
    const today = new Date().toISOString().slice(0, 10)
    const doc = {
      id: 'SM-' + Date.now(),
      shareToken: generateShareToken(),
      ...data,
      tanggalDiterima: data.tanggalDiterima || today,
      nomorAgenda: data.nomorAgenda || generateNextNomorAgenda(),
      sifatSurat: data.sifatSurat || 'segera',
      status: 'disposisi',
      createdAt: new Date().toISOString(),
      disposisi: null,
      tindakLanjut: null,
      notifLogs: [],
      type: 'SuratMasuk'
    }
    documents.value.push(doc)
    gasPost('save_document', doc).then(res => {
      if (res && res.success && res.document) {
        Object.assign(doc, res.document)
      }
    }).catch(console.error)
    return doc
  }

  async function addDisposisi(docId, disposisiData) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc) return null

    if (!doc.shareToken) {
      doc.shareToken = generateShareToken()
    }

    const penerimaList = disposisiData.penerimaList || []
    const first = penerimaList[0] || {}
    const kepadaIds = penerimaList.filter(p => p.id).map(p => p.id)
    const kepadaNamaGabungan = penerimaList.map(p => p.jabatan ? `${p.jabatan} (${p.nama})` : p.nama).join(', ')

    doc.disposisi = {
      ...disposisiData,
      penerimaList,
      kepadaIds,
      // Backward compatibility untuk tampilan lama
      kepadaId: first.id ?? disposisiData.kepadaId ?? null,
      kepadaNama: kepadaNamaGabungan || disposisiData.kepadaNama || '-',
      instruksi: disposisiData.catatan || disposisiData.instruksi || '',
      tanggal: new Date().toISOString()
    }

    if (disposisiData.sifatSurat) {
      doc.sifatSurat = disposisiData.sifatSurat
    }
    if (doc.status === 'disposisi' || doc.status === 'registrasi') {
      doc.status = 'tindak_lanjut'
    }

    gasPost('update_document', doc).catch(console.error)
    return doc
  }

  async function appendNotifLog(docId, logEntry) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc) return
    if (!Array.isArray(doc.notifLogs)) doc.notifLogs = []
    doc.notifLogs.unshift({
      at: new Date().toISOString(),
      ...logEntry,
    })
    gasPost('update_document', doc).catch(console.error)
  }

  async function selesaikanSurat(docId, tindakLanjutNote, userId, userName = '') {
    const doc = documents.value.find(d => d.id === docId)
    if (doc && doc.status === 'tindak_lanjut') {
      doc.tindakLanjut = {
        catatan: tindakLanjutNote,
        olehId: userId,
        olehNama: userName,
        tanggal: new Date().toISOString()
      }
      doc.status = 'selesai'
      gasPost('update_document', doc).catch(console.error)
    }
  }

  async function deleteSuratMasuk(id) {
    const idx = documents.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      documents.value.splice(idx, 1)
      gasPost('delete_data', { table: 'Documents', id }).catch(console.error)
      return true
    }
    return false
  }

  async function updateSuratMasuk(id, payload) {
    const idx = documents.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      documents.value[idx] = { ...documents.value[idx], ...payload }
      gasPost('update_document', documents.value[idx]).catch(console.error)
      return documents.value[idx]
    }
    return null
  }

  const sortedDocuments = computed(() =>
    [...documents.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  )

  return {
    documents,
    isLoading,
    sortedDocuments,
    SURAT_MASUK_STATUSES,
    getStatusInfo,
    generateNextNomorAgenda,
    fetchSuratMasuk,
    createSuratMasuk,
    addDisposisi,
    appendNotifLog,
    selesaikanSurat,
    deleteSuratMasuk,
    updateSuratMasuk
  }
})
