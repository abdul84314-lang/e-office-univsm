import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateNomorSuratKeluar } from '../composables/useNomorSurat.js'
import { getUnitKode } from '../composables/useKopSurat.js'
import { gasGet, gasPost } from '../api/gasClient.js'

export const DOCUMENT_STATUSES = [
  { key: 'draft', label: 'Draft', color: 'gray', step: 0 },
  { key: 'verifikasi', label: 'Verifikasi', color: 'yellow', step: 1 },
  { key: 'pengesahan', label: 'Pengesahan', color: 'orange', step: 2 },
  { key: 'penomoran', label: 'Penomoran TU', color: 'blue', step: 3 },
  { key: 'menunggu_tte', label: 'Menunggu TTE', color: 'purple', step: 4 },
  { key: 'selesai', label: 'Selesai', color: 'green', step: 5 },
]

export const DEFAULT_SIGNER = {
  nama:   'Abdul Hamid, S.Kom., M.M., M.Kom.',
  jabatan: 'Rektor Universitas Sapta Mandiri',
  nidn:   '1101018501',
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

  async function fetchDocuments() {
    isLoading.value = true
    try {
      const res = await gasGet('get_documents')
      if (res && res.success) {
        // Only keep SuratKeluar
        documents.value = res.documents.filter(d => d.type === 'SuratKeluar' || (!d.isSPPD && !d.asalSurat))
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

  async function createDocument(data, author) {
    const doc = {
      id: 'DOC-' + new Date().getTime(),
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
    await gasPost('save_document', doc)
    return doc
  }

  async function advanceStatus(docId, author, signerUser, extraData = {}) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc) return
    const nextStatus = getNextStatus(doc.status)
    if (nextStatus === doc.status) return

    doc.status = nextStatus
    doc.statusHistory.push({ status: nextStatus, at: new Date().toISOString(), by: author.name })
    Object.assign(doc, extraData)

    if (nextStatus === 'penomoran' && !doc.nomorSurat) {
      const count = documents.value.filter(d => d.unitId === doc.unitId && d.nomorSurat).length + 1
      doc.nomorSurat = generateNomorSuratKeluar({
        noUrut: count, kodeSurat: doc.kodeSurat, unitKode: getUnitKode(doc.unitId), date: new Date(),
      })
    }

    if (nextStatus === 'selesai' && signerUser) {
      doc.tte = {
        tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        signer: { nama: signerUser.name, jabatan: signerUser.jabatan, nidn: signerUser.nidn, nik: signerUser.nik }
      }
    }

    await gasPost('update_document', doc)
  }

  async function signDocument(docId, author, signerUser, extraData = {}) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc || doc.status === 'selesai') return

    doc.status = 'selesai'
    doc.statusHistory.push({ status: 'selesai', at: new Date().toISOString(), by: author.name })

    if (!doc.nomorSurat) {
      const count = documents.value.filter(d => d.unitId === doc.unitId && d.nomorSurat).length + 1
      doc.nomorSurat = generateNomorSuratKeluar({
        noUrut: count, kodeSurat: doc.kodeSurat, unitKode: getUnitKode(doc.unitId), date: new Date(),
      })
    }

    Object.assign(doc, extraData)

    if (signerUser && !doc.tte) {
      doc.tte = {
        tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        signer: { nama: signerUser.name, jabatan: signerUser.jabatan, nidn: signerUser.nidn, nik: signerUser.nik }
      }
    }

    await gasPost('update_document', doc)
  }

  async function rejectDocument(docId, reason, authorName) {
    const doc = documents.value.find(d => d.id === docId)
    if (!doc) return
    doc.status = 'draft'
    doc.statusHistory.push({ status: 'draft', at: new Date().toISOString(), by: authorName, note: reason })
    await gasPost('update_document', doc)
  }

  async function updateDocument(docId, data) {
    const doc = documents.value.find(d => d.id === docId)
    if (doc) {
      Object.assign(doc, data)
      await gasPost('update_document', doc)
    }
  }

  function generateNomorManual(data, author) {
    const systemCount = documents.value.filter(d => d.unitId === data.unitId && d.nomorSurat).length
    const manualCount = agendaManual.value.filter(d => d.unitId === data.unitId).length
    const noUrut = systemCount + manualCount + 1

    const nomorSurat = generateNomorSuratKeluar({
      noUrut, kodeSurat: data.kodeSurat, unitKode: getUnitKode(data.unitId), date: new Date(data.tanggal),
    })

    const record = {
      id: 'MANUAL-' + Date.now(),
      nomorSurat,
      ...data,
      createdBy: author.name,
      createdAt: new Date().toISOString()
    }
    agendaManual.value.push(record)
    return record
  }

  return {
    documents, agendaManual, isLoading, DOCUMENT_STATUSES, DEFAULT_SIGNER,
    totalDocuments, pendingApprovals, sortedDocuments, sortedAgenda,
    fetchDocuments, getStatusInfo, getNextStatus, getPrevStatus,
    createDocument, advanceStatus, signDocument, rejectDocument, updateDocument, generateNomorManual
  }
})
