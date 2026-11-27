import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  generateNomorSuratKeluar,
  generateNomorFormulirHR,
  getNextUnitYearlySequence,
} from '../composables/useNomorSurat.js'
import { getUnitKode } from '../composables/useKopSurat.js'
import { gasGet, gasPost } from '../api/gasClient.js'
import { useSppdStore } from './sppd.js'

export const DOCUMENT_STATUSES = [
  { key: 'draft', label: 'Draft', color: 'gray', step: 0 },
  { key: 'verifikasi', label: 'Verifikasi Atasan', color: 'yellow', step: 1 },
  { key: 'penomoran', label: 'Penomoran TU', color: 'blue', step: 2 },
  { key: 'menunggu_tte', label: 'Menunggu TTE', color: 'purple', step: 3 },
  { key: 'selesai', label: 'Selesai', color: 'green', step: 4 },
]

export const DEFAULT_SIGNER = {
  nama:   'Abdul Hamid, S.Kom., M.M., M.Kom.',
  jabatan: 'Rektor Universitas Sapta Mandiri',
  nidn:   '1101018501',
  nik:    '711018210693',
}

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref([])
  const agendaManual = ref([])
  const isLoading = ref(false)

  const totalDocuments = computed(() => documents.value.length)
  const pendingApprovals = computed(() => documents.value.filter(d => ['verifikasi', 'pengesahan', 'menunggu_tte'].includes(d.status)).length)

  const sortedDocuments = computed(() =>
    [...documents.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  )

  const sortedAgenda = computed(() =>
    [...agendaManual.value].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  )

  /** Gabungkan semua record bernomor (Surat Keluar + Agenda Manual + SPPD) untuk hitung max+1 anti-dobel */
  function getAllNumberedRecords() {
    let sppdRecords = []
    try {
      const sppdStore = useSppdStore()
      sppdRecords = sppdStore.sppdList || []
    } catch {}
    return [...documents.value, ...agendaManual.value, ...sppdRecords]
  }

  function previewNextNomorSurat({ unitId, kodeSurat, date = new Date() }) {
    const noUrut = getNextUnitYearlySequence(getAllNumberedRecords(), unitId, date)
    return generateNomorSuratKeluar({
      noUrut,
      kodeSurat,
      unitKode: getUnitKode(unitId),
      date,
    })
  }

  function previewNextNomorHR({ kodeForm, singkatanForm, kategori, date = new Date() }) {
    const noUrut = getNextUnitYearlySequence(getAllNumberedRecords(), 'kep', date)
    return generateNomorFormulirHR({
      noUrut,
      kodeForm,
      singkatanForm,
      kategori,
      date,
    })
  }

  async function fetchDocuments() {
    isLoading.value = true
    try {
      const res = await gasGet('get_documents')
      if (res && res.success) {
        documents.value = res.documents.filter(d => d.type === 'SuratKeluar' || (!d.isSPPD && !d.asalSurat && d.type !== 'AgendaManual' && d.type !== 'SuratMasuk' && !String(d.id).startsWith('SM-')))
        agendaManual.value = res.documents.filter(d => d.type === 'AgendaManual')
      }
    } catch (e) {
      console.error('Failed to fetch documents', e)
    } finally {
      isLoading.value = false
    }
  }

  const getStatusInfo = (key) => DOCUMENT_STATUSES.find(s => s.key === key) ?? DOCUMENT_STATUSES[0]

  function getNextStatus(currentStatus) {
    const idx = DOCUMENT_STATUSES.findIndex(s => s.key === currentStatus)
    return idx < DOCUMENT_STATUSES.length - 1 ? DOCUMENT_STATUSES[idx + 1].key : currentStatus
  }

  function getPrevStatus(currentStatus) {
    const idx = DOCUMENT_STATUSES.findIndex(s => s.key === currentStatus)
    return idx > 0 ? DOCUMENT_STATUSES[idx - 1].key : currentStatus
  }

  function generateShareToken() {
    return 'srt_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
  }

  async function createDocument(data, author) {
    const doc = {
      id: 'DOC-' + new Date().getTime(),
      shareToken: generateShareToken(),
      type: 'SuratKeluar',
      ...data,
      createdBy: author.id,
      nomorSurat: null,
      status: 'draft',
      createdAt: new Date().toISOString(),
      statusHistory: [{ status: 'draft', at: new Date().toISOString(), by: author.name }],
      tte: null,
    }

    documents.value.push(doc)

    gasPost('save_document', doc).then(res => {
      if (res && res.success && res.document) {
        Object.assign(doc, res.document)
      }
    }).catch(console.error)

    return doc
  }

  /**
   * Generate nomor otomatis sesuai SOP (Per Unit per Tahun, Max+1 anti-dobel) untuk sebuah Surat Keluar
   */
  async function assignSopNumber(docId, date = new Date()) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc) return null

    const nomor = previewNextNomorSurat({
      unitId: doc.unitId || 'rektor',
      kodeSurat: doc.kodeSurat || 'ST',
      date,
    })
    doc.nomorSurat = nomor
    gasPost('update_document', doc).catch(console.error)
    return nomor
  }

  async function advanceStatus(docId, author, signerUser, extraData = {}) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc) return { success: false, error: 'Dokumen tidak ditemukan.' }
    const nextStatus = getNextStatus(doc.status)
    if (nextStatus === doc.status) return { success: false, error: 'Status sudah tahap akhir.' }

    // SOP Penomoran: Surat wajib sudah diberi nomor oleh TU sebelum masuk tahap Menunggu TTE
    if (doc.status === 'penomoran' && nextStatus === 'menunggu_tte' && !doc.nomorSurat) {
      return {
        success: false,
        error: 'Nomor surat wajib ditetapkan terlebih dahulu (Generate Otomatis SOP atau Input Manual) sebelum diajukan ke TTE!'
      }
    }

    doc.status = nextStatus
    doc.statusHistory.push({ status: nextStatus, at: new Date().toISOString(), by: author.name })
    Object.assign(doc, extraData)

    if (nextStatus === 'selesai' && signerUser) {
      doc.tte = {
        tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        signer: { nama: signerUser.name, jabatan: signerUser.jabatan, nidn: signerUser.nidn, nik: signerUser.nik }
      }
    }

    gasPost('update_document', doc).catch(console.error) // Optimistic
    return { success: true }
  }

  async function signDocument(docId, author, signerUser, extraData = {}) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc || doc.status === 'selesai') return { success: false }

    // SOP Ketat: Nomor surat tidak boleh otomatis meloncat di tahap TTE; wajib sudah disiapkan TU
    if (!doc.nomorSurat) {
      return {
        success: false,
        error: 'Nomor surat belum ditetapkan! Harap tetapkan nomor surat di tahap Penomoran TU (atau klik Set Nomor Manual) sebelum melakukan TTE.'
      }
    }

    if (!doc.shareToken) {
      doc.shareToken = generateShareToken()
    }
    doc.status = 'selesai'
    doc.statusHistory.push({ status: 'selesai', at: new Date().toISOString(), by: author.name })

    Object.assign(doc, extraData)

    if (signerUser && !doc.tte) {
      doc.tte = {
        tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        method: extraData.tteMethod || 'bsre_qr',
        signer: { nama: signerUser.name, jabatan: signerUser.jabatan, nidn: signerUser.nidn, nik: signerUser.nik }
      }
    }

    if (extraData.fileBase64) {
      const res = await gasPost('update_document', doc)
      if (res && res.success && res.document) {
        Object.assign(doc, res.document)
      }
      return res
    }

    gasPost('update_document', doc).catch(console.error) // Optimistic
    return { success: true }
  }

  async function rejectDocument(docId, reason, authorName) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc) return
    doc.status = 'draft'
    doc.statusHistory.push({ status: 'draft', at: new Date().toISOString(), by: authorName, note: reason })
    gasPost('update_document', doc).catch(console.error) // Optimistic
  }

  async function updateDocument(id, updates) {
    const idx = documents.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      const updatedDoc = { ...documents.value[idx], ...updates }
      documents.value[idx] = updatedDoc
      if (updates.fileBase64) {
        const res = await gasPost('update_document', updatedDoc)
        if (!res || !res.success) {
          alert('Gagal mengupdate dokumen ke database! Error: ' + (res?.error || 'Koneksi terputus/File terlalu besar'))
          return false
        }
        if (res.document) Object.assign(documents.value[idx], res.document)
        else delete documents.value[idx].fileBase64
        return true
      }
      gasPost('update_document', updatedDoc).catch(console.error)
      return true
    }
    return false
  }

  async function deleteDocument(id) {
    const idx = documents.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      documents.value.splice(idx, 1)
      gasPost('delete_data', { table: 'Documents', id }).catch(console.error) // Optimistic
      return true
    }
    return false
  }

  function generateNomorManual(data, author) {
    const targetDate = data.tanggal ? new Date(data.tanggal) : new Date()
    let nomorSurat = (data.customNomor || '').trim()
    let unitId = data.unitId || 'rektor'

    if (data.isFormulirHR) {
      unitId = 'kep'
      if (!nomorSurat) {
        nomorSurat = previewNextNomorHR({
          kodeForm: data.kodeForm || '01',
          singkatanForm: data.singkatanForm || 'FCT',
          kategori: data.kategori || 'Ds',
          date: targetDate,
        })
      }
    } else if (!nomorSurat) {
      nomorSurat = previewNextNomorSurat({
        unitId,
        kodeSurat: data.kodeSurat || 'ST',
        date: targetDate,
      })
    }

    const record = {
      id: 'MANUAL-' + Date.now(),
      type: 'AgendaManual',
      nomorSurat,
      ...data,
      unitId,
      createdBy: author.name,
      createdAt: new Date().toISOString()
    }
    delete record.customNomor

    agendaManual.value.push(record)
    gasPost('save_document', record).catch(console.error)
    return record
  }

  async function updateAgenda(id, updates) {
    const idx = agendaManual.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      agendaManual.value[idx] = { ...agendaManual.value[idx], ...updates }
      // Perbaikan: AgendaManual disimpan di tabel Documents (sama seperti save_document)
      gasPost('update_document', agendaManual.value[idx]).catch(console.error)
    }
  }

  async function deleteAgenda(id) {
    const idx = agendaManual.value.findIndex(d => d.id === id)
    if (idx !== -1) {
      agendaManual.value.splice(idx, 1)
      gasPost('delete_data', { table: 'Documents', id }).catch(console.error)
    }
  }

  return {
    documents, agendaManual, isLoading, DOCUMENT_STATUSES, DEFAULT_SIGNER,
    totalDocuments, pendingApprovals, sortedDocuments, sortedAgenda,
    fetchDocuments, getStatusInfo, getNextStatus, getPrevStatus,
    previewNextNomorSurat, previewNextNomorHR, assignSopNumber,
    createDocument, advanceStatus, signDocument, rejectDocument,
    updateDocument, deleteDocument, generateNomorManual, updateAgenda, deleteAgenda
  }
})
