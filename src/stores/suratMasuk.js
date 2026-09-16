import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gasGet, gasPost } from '../api/gasClient.js'

export const SURAT_MASUK_STATUSES = [
  { key: 'registrasi',    label: 'Registrasi TU',   color: 'gray',   step: 0 },
  { key: 'disposisi',     label: 'Menunggu Disposisi', color: 'yellow', step: 1 },
  { key: 'tindak_lanjut', label: 'Tindak Lanjut',   color: 'blue',   step: 2 },
  { key: 'selesai',       label: 'Selesai / Arsip', color: 'green',  step: 3 },
]

export const useSuratMasukStore = defineStore('suratMasuk', () => {
  const documents = ref([])
  const isLoading = ref(false)

  async function fetchSuratMasuk() {
    isLoading.value = true
    try {
      const res = await gasGet('get_surat_masuk')
      if (res && res.success) {
        documents.value = res.documents
      }
    } catch (e) {
      console.error('Failed to fetch surat masuk', e)
    } finally {
      isLoading.value = false
    }
  }

  const getStatusInfo = (key) => SURAT_MASUK_STATUSES.find(s => s.key === key) ?? SURAT_MASUK_STATUSES[0]

  async function createSuratMasuk(data) {
    const doc = {
      id: 'SM-' + Date.now(),
      ...data,
      status: 'disposisi',
      createdAt: new Date().toISOString(),
      disposisi: null,
      tindakLanjut: null,
    }
    documents.value.push(doc)
    await gasPost('save_surat_masuk', doc)
    return doc
  }

  async function addDisposisi(docId, disposisiData) {
    const doc = documents.value.find(d => d.id === docId)
    if (doc && doc.status === 'disposisi') {
      doc.disposisi = {
        ...disposisiData,
        tanggal: new Date().toISOString()
      }
      doc.status = 'tindak_lanjut'
      await gasPost('update_surat_masuk', doc)
    }
  }

  async function selesaikanSurat(docId, tindakLanjutNote, userId) {
    const doc = documents.value.find(d => d.id === docId)
    if (doc && doc.status === 'tindak_lanjut') {
      doc.tindakLanjut = {
        catatan: tindakLanjutNote,
        olehId: userId,
        tanggal: new Date().toISOString()
      }
      doc.status = 'selesai'
      await gasPost('update_surat_masuk', doc)
    }
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
    fetchSuratMasuk,
    createSuratMasuk,
    addDisposisi,
    selesaikanSurat
  }
})
