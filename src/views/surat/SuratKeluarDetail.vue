<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gasGet, gasPost } from '../../api/gasClient.js'
import { useAuthStore } from '../../stores/auth.js'
import { useDocumentsStore } from '../../stores/documents.js'
import { useMasterDataStore } from '../../stores/masterData.js'
import { useSettingsStore } from '../../stores/settings.js'
import StatusBadge from '../../components/common/StatusBadge.vue'
import WorkflowStepper from '../../components/common/WorkflowStepper.vue'
import DocumentKop from '../../components/common/DocumentKop.vue'
import TteBlock from '../../components/common/TteBlock.vue'
import NotificationPanel from '../../components/common/NotificationPanel.vue'
import { generateSystemLetterPdfBase64, downloadBase64Pdf } from '../../composables/usePdfExport.js'
import {
  getAppBaseUrl,
  buildSuratKeluarEmailHtml,
  buildSuratKeluarWaText,
  dispatchNotification,
} from '../../composables/useNotification.js'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

const props = defineProps({
  mode: String,
  id: String,
})

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const docStore = useDocumentsStore()
const mdStore = useMasterDataStore()
const settingsStore = useSettingsStore()

const isCreateRoute = computed(() => props.mode === 'create' || route.name === 'SuratKeluarBuat')
const doc = computed(() => docStore.documents.find(d => d.id === props.id))

const form = ref({
  isManual: false,
  ttePos: 'kanan_tengah',
  fileBase64: null,
  fileMime: null,
  fileName: '',
  judul: '',
  kodeSurat: 'ST',
  unitId: auth.currentUser?.unitId ?? 'rektor',
  sifatTujuan: 'internal',
  penandatanganId: '',
  perihal: '',
  kepada: '',
  penerimaUserIds: [],
  tujuanEmail: '',
  tujuanWa: '',
  isiSurat: '',
  lampiran: '-',
})

const potentialSigners = computed(() => {
  return auth.users.filter(u => ['rektor', 'warek', 'dekan'].includes(u.sppdRole) || u.role === 'admin' || u.role === 'pimpinan')
})

watch(doc, (d) => {
  if (d && !isCreateRoute.value) {
    form.value = {
      isManual: d.isManual || false,
      ttePos: d.ttePos || 'kanan_tengah',
      fileBase64: d.fileBase64 || null,
      fileMime: d.fileMime || null,
      fileName: d.fileName || '',
      judul: d.judul || '',
      kodeSurat: d.kodeSurat || 'ST',
      unitId: d.unitId || 'rektor',
      sifatTujuan: d.sifatTujuan || 'internal',
      penandatanganId: d.penandatanganId || '',
      perihal: d.perihal || '',
      kepada: d.kepada || '',
      penerimaUserIds: Array.isArray(d.penerimaUserIds) ? [...d.penerimaUserIds] : [],
      tujuanEmail: d.tujuanEmail || '',
      tujuanWa: d.tujuanWa || '',
      isiSurat: d.isiSurat || '',
      lampiran: d.lampiran || '-',
    }
  }
}, { immediate: true })

const isPembuat = computed(() => doc.value?.createdBy === auth.currentUser?.id)
const isSuperAdmin = computed(() => auth.isAdmin)
const isAdmin = computed(() => auth.currentUser?.role === 'admin' || auth.isAdmin)
const isPenandatangan = computed(() => doc.value?.penandatanganId === auth.currentUser?.id)

const isEditMode = computed(() => {
  if (isCreateRoute.value) return true
  if (isSuperAdmin.value) return true
  if (doc.value?.status === 'draft' && (isPembuat.value || isAdmin.value)) return true
  return false
})

const togglePenerimaInternal = (userId) => {
  if (!isEditMode.value) return
  const idx = form.value.penerimaUserIds.indexOf(userId)
  if (idx === -1) form.value.penerimaUserIds.push(userId)
  else form.value.penerimaUserIds.splice(idx, 1)
}

// Handle PDF manual
const handleManualFile = (e) => {
  const file = e.target.files[0]
  if (!file) return
  form.value.fileName = file.name
  form.value.fileMime = file.type
  const reader = new FileReader()
  reader.onload = (ev) => {
    form.value.fileBase64 = ev.target.result.split(',')[1]
  }
  reader.readAsDataURL(file)
}

const manualFileUrl = computed(() => {
  const mime = form.value.fileMime || doc.value?.fileMime || 'application/pdf'
  const b64 = form.value.fileBase64

  if (b64) return `data:${mime};base64,${b64}`
  if (doc.value?.driveViewUrl) return doc.value.driveViewUrl
  if (doc.value?.fileBase64) return `data:${mime};base64,${doc.value.fileBase64}`
  return null
})

// QR Stamping logic with BSrE Standard Look
const stampPdfWithQR = async (base64Pdf, qrDataUrl, signer) => {
  try {
    const existingPdfBytes = Uint8Array.from(atob(base64Pdf), c => c.charCodeAt(0))
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const qrImageBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0))
    const qrImage = await pdfDoc.embedPng(qrImageBytes)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]

    const qrDims = qrImage.scale(0.35)

    let baseX = lastPage.getWidth() - 220
    let baseY = 110

    if (form.value.ttePos === 'kanan_bawah') {
      baseX = lastPage.getWidth() - 220
      baseY = 50
    } else if (form.value.ttePos === 'kiri_bawah') {
      baseX = 50
      baseY = 50
    }

    lastPage.drawImage(qrImage, {
      x: baseX,
      y: baseY,
      width: qrDims.width,
      height: qrDims.height,
    })

    const textX = baseX + qrDims.width + 10
    const textY = baseY + qrDims.height - 12

    lastPage.drawText('Ditandatangani secara elektronik oleh:', {
      x: textX, y: textY, size: 7, font: helveticaBold, color: rgb(0.2, 0.2, 0.2)
    })
    lastPage.drawText(signer.name || '', {
      x: textX, y: textY - 12, size: 8, font: helveticaBold, color: rgb(0.1, 0.1, 0.1)
    })
    lastPage.drawText(signer.jabatan || '', {
      x: textX, y: textY - 24, size: 7, font: helvetica, color: rgb(0.3, 0.3, 0.3)
    })
    if (signer.nik) {
      lastPage.drawText(`NIK. ${signer.nik}`, {
        x: textX, y: textY - 34, size: 6.5, font: helvetica, color: rgb(0.35, 0.35, 0.35)
      })
    }

    const pdfBytes = await pdfDoc.save()
    let binary = ''
    for (let i = 0; i < pdfBytes.byteLength; i++) binary += String.fromCharCode(pdfBytes[i])
    return btoa(binary)
  } catch (e) {
    console.error('PDF Stamping Error:', e)
    return base64Pdf
  }
}

const isEditingNomor = ref(false)
const manualNomor = ref('')

const startEditNomor = () => {
  manualNomor.value = doc.value?.nomorSurat || ''
  isEditingNomor.value = true
}

const saveNomor = async () => {
  if (doc.value) {
    await docStore.updateDocument(doc.value.id, { nomorSurat: manualNomor.value || null })
    isEditingNomor.value = false
  }
}

// ── Daftar Penerima Notifikasi Surat Keluar (Internal & Eksternal) ──────────
const outgoingRecipients = computed(() => {
  const list = []
  const ids = doc.value?.penerimaUserIds || form.value.penerimaUserIds || []
  for (const uid of ids) {
    const u = auth.users.find(x => x.id === uid)
    if (u) {
      list.push({ name: u.name, jabatan: u.jabatan, email: u.email, phone: u.phone })
    }
  }
  const extEmail = (doc.value?.tujuanEmail || form.value.tujuanEmail || '').trim()
  const extWa = (doc.value?.tujuanWa || form.value.tujuanWa || '').trim()
  if (extEmail || extWa) {
    const emails = extEmail ? extEmail.split(',').map(s => s.trim()).filter(Boolean) : ['']
    const phones = extWa ? extWa.split(',').map(s => s.trim()).filter(Boolean) : ['']
    const count = Math.max(emails.length, phones.length)
    for (let i = 0; i < count; i++) {
      list.push({
        name: doc.value?.kepada?.split('\n')[0] || `Penerima Eksternal ${i + 1}`,
        jabatan: 'Tujuan Eksternal',
        email: emails[i] || emails[0] || '',
        phone: phones[i] || phones[0] || '',
      })
    }
  }
  return list
})

const notifSending = ref(false)
const notifStatus = ref(null)
const copiedPublicSuratLink = ref(false)

const docAppLink = computed(() => `${getAppBaseUrl()}/surat-keluar/${doc.value?.id || ''}`)

const publicSuratLink = computed(() => {
  if (!doc.value) return ''
  const tokenQ = doc.value.shareToken ? `?t=${encodeURIComponent(doc.value.shareToken)}` : ''
  return `${getAppBaseUrl()}/surat/${doc.value.id}${tokenQ}`
})

async function copyPublicSuratLink() {
  if (!publicSuratLink.value) return
  try {
    await navigator.clipboard.writeText(publicSuratLink.value)
    copiedPublicSuratLink.value = true
    setTimeout(() => { copiedPublicSuratLink.value = false }, 2500)
  } catch {}
}

const stageNotifLabel = computed(() => {
  if (!doc.value) return 'Surat Keluar'
  if (doc.value.status === 'selesai') return 'Surat Resmi Universitas Sapta Mandiri'
  if (doc.value.status === 'menunggu_tte') return 'Permohonan TTE / Pengesahan Surat'
  if (doc.value.status === 'verifikasi') return 'Permohonan Verifikasi Surat Keluar'
  return 'Pemberitahuan Surat Keluar'
})

const activeRecipientsForStage = computed(() => {
  if (!doc.value) return []
  if (doc.value.status === 'selesai') {
    return outgoingRecipients.value
  }
  if (doc.value.status === 'menunggu_tte') {
    const signer = auth.users.find(u => u.id === doc.value.penandatanganId)
    return signer ? [{ name: signer.name, jabatan: signer.jabatan, email: signer.email, phone: signer.phone }] : []
  }
  if (doc.value.status === 'verifikasi') {
    const verifs = auth.users.filter(u =>
      u.unitId === doc.value.unitId &&
      (u.role === 'pimpinan' || ['kabag', 'wakil_dekan', 'dekan', 'warek', 'rektor'].includes(u.sppdRole))
    )
    return verifs.map(u => ({ name: u.name, jabatan: u.jabatan, email: u.email, phone: u.phone }))
  }
  return outgoingRecipients.value
})

const activeWaText = computed(() => {
  if (!doc.value) return ''
  const targetLink = doc.value.status === 'selesai' ? publicSuratLink.value : docAppLink.value
  return buildSuratKeluarWaText(doc.value, stageNotifLabel.value, targetLink)
})

async function triggerStageNotif(targetDoc, customStageLabel = '', customRecipients = null) {
  if (!targetDoc) return
  const recips = customRecipients || activeRecipientsForStage.value
  if (!recips.length) return
  const label = customStageLabel || stageNotifLabel.value
  const tokenQ = targetDoc.shareToken ? `?t=${encodeURIComponent(targetDoc.shareToken)}` : ''
  const link = targetDoc.status === 'selesai'
    ? `${getAppBaseUrl()}/surat/${targetDoc.id}${tokenQ}`
    : `${getAppBaseUrl()}/surat-keluar/${targetDoc.id}`

  notifSending.value = true
  const res = await dispatchNotification({
    docId: targetDoc.id,
    category: `surat_keluar_${targetDoc.status}`,
    recipients: recips,
    subject: `[${label}] ${targetDoc.nomorSurat ? `${targetDoc.nomorSurat} - ` : ''}${targetDoc.perihal || targetDoc.judul}`,
    htmlBody: buildSuratKeluarEmailHtml(targetDoc, label, link),
    waText: buildSuratKeluarWaText(targetDoc, label, link),
  })
  notifStatus.value = res
  notifSending.value = false
}

// ── BSrE Opsi 1 (API / QR) & Opsi 2 (Download -> TTD BSrE Digital -> Upload) ──
const isProcessingBsre = ref(false)
const includeQrOnDownload = ref(true)
const showBsreApiModal = ref(false)
const bsreForm = ref({
  nik: auth.currentUser?.nik || '',
  passphrase: '',
})

async function getReadyPdfBase64({ withQr = false } = {}) {
  const signer = auth.users.find(u => u.id === (doc.value?.penandatanganId || form.value.penandatanganId)) || auth.currentUser
  let targetB64 = form.value.fileBase64 || doc.value?.fileBase64

  if (!targetB64 && doc.value?.driveFileId) {
    const res = await gasGet('get_file_b64', { fileId: doc.value.driveFileId })
    if (res && res.success) targetB64 = res.base64
  }

  if (!targetB64) {
    // Surat dibuat di sistem -> konversi langsung ke PDF A4 siap TTD BSrE
    const verifyUrl = `${getAppBaseUrl()}/verify/${doc.value?.id || 'verify'}`
    return await generateSystemLetterPdfBase64(doc.value, form.value, signer, {
      includeQr: withQr,
      verifyUrl,
    })
  }

  if (withQr) {
    const qrUrl = await QRCode.toDataURL(`${getAppBaseUrl()}/verify/${doc.value?.id || 'verify'}`, { width: 150 })
    return await stampPdfWithQR(targetB64, qrUrl, signer)
  }

  return targetB64
}

// Opsi 2 Langkah 1: Unduh PDF Siap TTD BSrE Digital
async function handleDownloadForBsre() {
  if (!doc.value) return
  isProcessingBsre.value = true
  try {
    const b64 = await getReadyPdfBase64({ withQr: includeQrOnDownload.value })
    const safeNo = (doc.value.nomorSurat || doc.value.id).replace(/[^a-zA-Z0-9_-]/g, '_')
    downloadBase64Pdf(b64, `Siap_TTD_BSrE_${safeNo}.pdf`)
  } catch (e) {
    alert('Gagal menyiapkan file PDF: ' + e.message)
  } finally {
    isProcessingBsre.value = false
  }
}

// Opsi 2 Langkah 2: Upload PDF Hasil TTD BSrE Digital
const isUploadingBsreFinal = ref(false)
const handleUploadBsreFinal = (e) => {
  const file = e.target.files[0]
  if (!file || !doc.value) return
  isUploadingBsreFinal.value = true
  const reader = new FileReader()
  reader.onload = async (ev) => {
    try {
      const b64 = ev.target.result.split(',')[1]
      const extraData = {
        tteMethod: 'bsre_external',
        isManual: true,
        fileBase64: b64,
        fileMime: file.type || 'application/pdf',
        fileName: file.name,
      }
      if (doc.value?.driveFileId) extraData.driveFileId = doc.value.driveFileId

      await docStore.signDocument(doc.value.id, auth.currentUser, auth.currentUser, extraData)
      alert('PDF hasil TTD BSrE Digital berhasil diunggah & surat disahkan!')
      if (outgoingRecipients.value.length > 0) {
        triggerStageNotif(doc.value, 'Surat Resmi Tersertifikasi BSrE', outgoingRecipients.value)
      }
    } finally {
      isUploadingBsreFinal.value = false
      e.target.value = ''
    }
  }
  reader.readAsDataURL(file)
}

// Opsi 1: TTE Barcode / Integrasi API BSrE
const startSignDocTte = async () => {
  if (settingsStore.settings?.bsreEnabled && settingsStore.settings?.bsreApiUrl) {
    bsreForm.value = {
      nik: auth.currentUser?.nik || '',
      passphrase: '',
    }
    showBsreApiModal.value = true
  } else {
    await signDocQrLocal()
  }
}

const signDocQrLocal = async () => {
  isProcessingBsre.value = true
  try {
    const extraData = { tteMethod: 'bsre_qr' }
    if (form.value.isManual || doc.value?.driveFileId) {
      const stamped = await getReadyPdfBase64({ withQr: true })
      extraData.fileBase64 = stamped
      if (doc.value?.driveFileId) extraData.driveFileId = doc.value.driveFileId
    }
    await docStore.signDocument(doc.value.id, auth.currentUser, auth.currentUser, extraData)
    if (outgoingRecipients.value.length > 0) {
      triggerStageNotif(doc.value, 'Surat Resmi E-Office UNIVSM (TTE QR)', outgoingRecipients.value)
    }
  } finally {
    isProcessingBsre.value = false
  }
}

const submitBsreApiSign = async () => {
  if (!bsreForm.value.nik || !bsreForm.value.passphrase) {
    alert('NIK dan Passphrase BSrE wajib diisi!')
    return
  }
  isProcessingBsre.value = true
  try {
    const rawPdfB64 = await getReadyPdfBase64({ withQr: true })
    const res = await gasPost('sign_bsre', {
      docId: doc.value.id,
      fileName: `BSrE_${(doc.value.nomorSurat || doc.value.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
      pdfBase64: rawPdfB64,
      nik: bsreForm.value.nik,
      passphrase: bsreForm.value.passphrase,
      config: {
        bsreApiUrl: settingsStore.settings.bsreApiUrl,
        bsreUsername: settingsStore.settings.bsreUsername,
        bsrePassword: settingsStore.settings.bsrePassword,
      }
    })

    if (!res || !res.success) {
      alert('Penandatanganan API BSrE gagal: ' + (res?.error || 'Periksa konfigurasi API BSrE / Passphrase Anda.'))
      return
    }

    await docStore.signDocument(doc.value.id, auth.currentUser, auth.currentUser, {
      tteMethod: 'bsre_api',
      isManual: true,
      driveFileId: res.driveFileId,
      driveViewUrl: res.driveViewUrl,
      driveDownloadUrl: res.driveDownloadUrl,
    })
    showBsreApiModal.value = false
    bsreForm.value.passphrase = ''
    alert('Surat berhasil ditandatangani langsung melalui API BSrE!')
    if (outgoingRecipients.value.length > 0) {
      triggerStageNotif(doc.value, 'Surat Resmi Tersertifikasi BSrE', outgoingRecipients.value)
    }
  } finally {
    isProcessingBsre.value = false
  }
}

const isUploadingBasah = ref(false)
const handleUploadBasah = (e) => {
  const file = e.target.files[0]
  if (!file) return
  isUploadingBasah.value = true
  const reader = new FileReader()
  reader.onload = async (ev) => {
    const b64 = ev.target.result.split(',')[1]
    const success = await docStore.updateDocument(doc.value.id, { fileBase64: b64, fileMime: file.type })
    if (success) {
      alert('Dokumen final (TTD Basah) berhasil diunggah ke Arsip Drive!')
      if (outgoingRecipients.value.length > 0) {
        triggerStageNotif(doc.value, 'Surat Resmi Universitas Sapta Mandiri', outgoingRecipients.value)
      }
    }
    isUploadingBasah.value = false
  }
  reader.readAsDataURL(file)
}

const deleteDoc = async () => {
  if (confirm('Yakin ingin menghapus surat ini?')) {
    await docStore.deleteDocument(doc.value.id)
    router.push('/surat-keluar')
  }
}

const saveDoc = async () => {
  if (!form.value.judul) return alert('Judul harus diisi!')
  if (!form.value.penandatanganId) return alert('Penandatangan harus dipilih!')
  if (form.value.isManual && !form.value.fileBase64 && !doc.value?.driveFileId) return alert('File PDF harus diunggah!')
  if (isCreateRoute.value) {
    const newDoc = await docStore.createDocument({ ...form.value }, auth.currentUser)
    if (newDoc) {
      router.push(`/surat-keluar/${newDoc.id}`)
    }
  } else if (isEditMode.value && doc.value) {
    await docStore.updateDocument(doc.value.id, { ...form.value })
    alert('Perubahan surat berhasil disimpan.')
  }
}

const canAdvance = computed(() => {
  if (isCreateRoute.value || !doc.value) return false
  if (doc.value.status === 'selesai') return false
  if (doc.value.status === 'draft') return auth.currentUser?.role === 'tu' || isAdmin.value || isPembuat.value
  if (doc.value.status === 'penomoran') return auth.currentUser?.role === 'tu' || isAdmin.value
  return true
})

const canSign = computed(() => {
  if (!doc.value || doc.value.status === 'selesai') return false
  if (doc.value.status !== 'menunggu_tte' && !isAdmin.value) return false
  return isPenandatangan.value || isAdmin.value
})

const showRejectModal = ref(false)
const rejectReason = ref('')

const advanceDoc = async () => {
  if (!doc.value) return
  await docStore.advanceStatus(doc.value.id, auth.currentUser, null)
  if (doc.value.status === 'verifikasi' || doc.value.status === 'menunggu_tte') {
    triggerStageNotif(doc.value)
  }
}

const signDocBasah = async () => {
  await docStore.signDocument(doc.value.id, auth.currentUser, auth.currentUser, { tteMethod: 'basah' })
  if (outgoingRecipients.value.length > 0) {
    triggerStageNotif(doc.value, 'Surat Resmi Universitas Sapta Mandiri', outgoingRecipients.value)
  }
}

const confirmReject = async () => {
  await docStore.rejectDocument(doc.value.id, rejectReason.value, auth.currentUser.name)
  showRejectModal.value = false
  rejectReason.value = ''
}

const handlePrint = () => {
  if (form.value.isManual && manualFileUrl.value) {
    const printWindow = window.open(manualFileUrl.value)
    if (printWindow) {
      printWindow.onload = () => printWindow.print()
    }
  } else {
    window.print()
  }
}

const tteBadgeLabel = computed(() => {
  if (doc.value?.tteMethod === 'bsre_api') return 'TTE Tersertifikasi API BSrE'
  if (doc.value?.tteMethod === 'bsre_external') return 'TTE BSrE Digital (Unggahan Final)'
  if (doc.value?.tteMethod === 'bsre_qr' || doc.value?.tteMethod === 'bsre') return 'TTE Barcode / QR Verifikasi'
  if (doc.value?.tteMethod === 'basah') return 'Disahkan TTD Basah'
  return ''
})
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <template v-if="doc || isCreateRoute">
      <!-- Top header -->
      <div class="flex flex-wrap items-center justify-between gap-3 no-print">
        <div class="flex items-center gap-3">
          <button class="btn-secondary btn-sm" @click="router.back()">
            Kembali
          </button>
          <div class="flex-1">
            <h1 class="text-xl font-bold text-gray-900">
              {{ isCreateRoute ? 'Buat Surat Keluar Baru' : (doc?.judul ?? 'Detail Surat') }}
            </h1>
            <div v-if="!isCreateRoute && doc" class="text-sm text-gray-500 mt-0.5 font-mono flex flex-wrap items-center gap-2">
              <span v-if="!isEditingNomor">{{ doc.nomorSurat ?? doc.id }}</span>
              <div v-else class="flex items-center gap-2 mt-1">
                <input v-model="manualNomor" type="text" class="form-input text-xs py-1 px-2 h-7 w-48" placeholder="Format: 001/ST/REK/XI/2026" />
                <button @click="saveNomor" class="btn-primary text-xs py-1 px-2 h-7">Simpan</button>
                <button @click="isEditingNomor = false" class="btn-secondary text-xs py-1 px-2 h-7">Batal</button>
              </div>
              <button v-if="!isEditingNomor && (isAdmin || auth.currentUser?.role === 'tu')" @click="startEditNomor" class="text-xs text-blue-600 hover:underline font-sans">
                [Set / Edit Nomor Manual]
              </button>
              <span v-if="tteBadgeLabel" class="font-sans text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {{ tteBadgeLabel }}
              </span>
            </div>
          </div>
        </div>
        <div v-if="!isCreateRoute && doc" class="flex flex-wrap gap-2">
          <button v-if="doc.status === 'selesai'" class="btn-secondary btn-sm text-xs" @click="copyPublicSuratLink">
            {{ copiedPublicSuratLink ? 'Link Surat Disalin!' : 'Salin Link Surat (Tanpa Login)' }}
          </button>
          <button class="btn-secondary btn-sm" :disabled="isProcessingBsre" @click="handleDownloadForBsre">
            {{ isProcessingBsre ? 'Menyiapkan PDF...' : 'Unduh PDF (Untuk BSrE / Arsip)' }}
          </button>
          <button class="btn-secondary btn-sm" @click="handlePrint">
            Cetak / Print
          </button>
        </div>
      </div>

      <WorkflowStepper v-if="!isCreateRoute" :current-status="doc?.status" :statuses="docStore.DOCUMENT_STATUSES" class="no-print" />

      <!-- Panel Distribusi Notifikasi Email & WA untuk Surat Keluar -->
      <NotificationPanel
        v-if="!isCreateRoute && doc && activeRecipientsForStage.length"
        class="no-print"
        :title="doc.status === 'selesai' ? 'Kirim Surat Resmi ke Penerima Tujuan (Email & WA)' : `Notifikasi Tahap: ${stageNotifLabel}`"
        :recipients="activeRecipientsForStage"
        :wa-text="activeWaText"
        :last-status="notifStatus"
        :is-sending="notifSending"
        @resend="triggerStageNotif(doc)"
      />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div class="lg:col-span-2 space-y-6">
          <div class="card bg-white space-y-4">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-semibold text-gray-800">Informasi Surat</h3>
              <StatusBadge
                v-if="!isCreateRoute"
                :status="docStore.getStatusInfo(doc.status).color"
                :label="docStore.getStatusInfo(doc.status).label"
              />
            </div>

            <!-- Tipe Surat Selector -->
            <div v-if="isEditMode" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipe Pembuatan</label>
              <div class="flex gap-4">
                <label class="flex items-center cursor-pointer">
                  <input type="radio" v-model="form.isManual" :value="false" class="mr-2" /> Dibuat di Sistem
                </label>
                <label class="flex items-center cursor-pointer">
                  <input type="radio" v-model="form.isManual" :value="true" class="mr-2" /> Upload Surat Manual (PDF)
                </label>
              </div>
            </div>

            <!-- Form upload manual -->
            <div v-if="form.isManual" class="space-y-4 border p-4 rounded-lg bg-gray-50">
              <div>
                <label class="form-label">Upload File Surat (PDF)</label>
                <input v-if="isEditMode" type="file" accept="application/pdf" @change="handleManualFile" class="form-input" />
                <p v-if="form.fileName" class="text-xs text-green-600 mt-1">File terpilih: {{ form.fileName }}</p>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Judul / Perihal (Untuk Agenda)</label>
                  <input v-model="form.judul" :disabled="!isEditMode" type="text" class="form-input" placeholder="Mis: SK Rektor..." />
                </div>
                <div>
                  <label class="form-label">Penandatangan</label>
                  <select v-model="form.penandatanganId" :disabled="!isEditMode" class="form-select">
                    <option value="">-- Pilih Pejabat --</option>
                    <option v-for="user in potentialSigners" :key="user.id" :value="user.id">{{ user.name }} ({{ user.jabatan }})</option>
                  </select>
                </div>
                <div>
                  <label class="form-label">Sifat / Tujuan</label>
                  <select v-model="form.sifatTujuan" :disabled="!isEditMode" class="form-select">
                    <option value="internal">Internal (Antar Unit)</option>
                    <option value="eksternal">Eksternal (Instansi Luar)</option>
                  </select>
                </div>
                <div>
                  <label class="form-label">Posisi Barcode TTE (Otomatis)</label>
                  <select v-model="form.ttePos" :disabled="!isEditMode" class="form-select">
                    <option value="kanan_tengah">Kanan Tengah (Di area Tanda Tangan)</option>
                    <option value="kanan_bawah">Kanan Bawah (Di pojok kanan bawah halaman)</option>
                    <option value="kiri_bawah">Kiri Bawah (Di pojok kiri bawah halaman)</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Form sistem -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="md:col-span-2">
                <label class="form-label">Judul Surat</label>
                <input v-model="form.judul" :disabled="!isEditMode" type="text" class="form-input" placeholder="Misal: Undangan Rapat..." />
              </div>

              <div>
                <label class="form-label">Kode / Klasifikasi Surat</label>
                <select v-model="form.kodeSurat" :disabled="!isEditMode" class="form-select">
                  <option v-for="k in mdStore.kodeSurat" :key="k.id" :value="k.singkatan">
                    {{ k.singkatan }} - {{ k.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="form-label">Unit Pengirim / KOP</label>
                <select v-model="form.unitId" :disabled="!isEditMode" class="form-select">
                  <option v-for="u in mdStore.units" :key="u.id" :value="u.id">{{ u.label }}</option>
                </select>
              </div>

              <div>
                <label class="form-label">Sifat / Tujuan</label>
                <select v-model="form.sifatTujuan" :disabled="!isEditMode" class="form-select">
                  <option value="internal">Internal (Antar Unit)</option>
                  <option value="eksternal">Eksternal (Instansi Luar)</option>
                </select>
              </div>

              <div>
                <label class="form-label">Penandatangan</label>
                <select v-model="form.penandatanganId" :disabled="!isEditMode" class="form-select">
                  <option value="">-- Pilih Pejabat --</option>
                  <option v-for="user in potentialSigners" :key="user.id" :value="user.id">{{ user.name }} ({{ user.jabatan }})</option>
                </select>
              </div>

              <div class="md:col-span-2">
                <label class="form-label">Perihal</label>
                <input v-model="form.perihal" :disabled="!isEditMode" type="text" class="form-input" />
              </div>

              <div class="md:col-span-2">
                <label class="form-label">Kepada (Teks Tujuan di Surat)</label>
                <textarea v-model="form.kepada" :disabled="!isEditMode" rows="2" class="form-textarea" placeholder="Yth. Dekan Fakultas..."></textarea>
              </div>

              <div class="md:col-span-2">
                <label class="form-label">Lampiran (Opsional)</label>
                <input v-model="form.lampiran" :disabled="!isEditMode" type="text" class="form-input" placeholder="1 Berkas / -" />
              </div>

              <div class="md:col-span-2">
                <label class="form-label">Isi Surat Lengkap</label>
                <textarea v-model="form.isiSurat" :disabled="!isEditMode" rows="8" class="form-textarea" placeholder="Dengan hormat, ..."></textarea>
              </div>
            </div>

            <!-- Tujuan Distribusi Langsung via Email & WhatsApp -->
            <div class="border-t pt-4 space-y-3">
              <div>
                <h4 class="text-sm font-semibold text-gray-800">Tujuan Pengiriman Langsung (Email & WhatsApp)</h4>
                <p class="text-xs text-gray-500">Begitu surat selesai/disahkan, sistem langsung meneruskan notifikasi & tautan dokumen resmi ke penerima di bawah ini.</p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <!-- Internal Multi-User -->
                <div>
                  <label class="form-label">Penerima Internal (Pilih Pejabat/Staf)</label>
                  <div class="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100 bg-white">
                    <label
                      v-for="u in auth.users"
                      :key="u.id"
                      class="flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        :disabled="!isEditMode"
                        :checked="form.penerimaUserIds.includes(u.id)"
                        @change="togglePenerimaInternal(u.id)"
                        class="rounded text-primary-600"
                      />
                      <span class="truncate"><strong>{{ u.jabatan || u.name }}</strong> ({{ u.name }})</span>
                    </label>
                  </div>
                </div>

                <!-- Eksternal Email & WA -->
                <div class="space-y-3">
                  <div>
                    <label class="form-label">Email Tujuan Eksternal (Opsional)</label>
                    <input
                      v-model="form.tujuanEmail"
                      :disabled="!isEditMode"
                      type="text"
                      class="form-input text-xs"
                      placeholder="instansi@domain.id (pisahkan koma jika > 1)"
                    />
                  </div>
                  <div>
                    <label class="form-label">No. WhatsApp Tujuan Eksternal (Opsional)</label>
                    <input
                      v-model="form.tujuanWa"
                      :disabled="!isEditMode"
                      type="text"
                      class="form-input text-xs"
                      placeholder="0812xxxxxxxx (pisahkan koma jika > 1)"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end pt-4 gap-2" v-if="isEditMode">
              <button v-if="!isCreateRoute && (isAdmin || isPembuat)" class="btn-danger" @click="deleteDoc">
                Hapus Surat
              </button>
              <button class="btn-primary" @click="saveDoc">
                {{ isCreateRoute ? 'Buat Draft Surat' : 'Simpan Perubahan' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Panel Tindakan & Pengesahan BSrE -->
        <div class="space-y-6">
          <div class="card bg-white space-y-4">
            <h3 class="font-semibold text-gray-800 border-b pb-2">Tindakan & Pengesahan</h3>

            <div v-if="isCreateRoute" class="text-sm text-gray-500">
              Silakan simpan surat ini sebagai Draft terlebih dahulu sebelum dapat diajukan ke tahap verifikasi.
            </div>

            <div v-else class="space-y-4">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full" :class="docStore.getStatusInfo(doc?.status).color === 'green' ? 'bg-green-500' : 'bg-amber-400'"></span>
                <span class="text-sm font-semibold text-gray-800">{{ docStore.getStatusInfo(doc?.status).label }}</span>
              </div>

              <div v-if="doc.status !== 'selesai'" class="border-t border-gray-100 pt-3 space-y-3">
                <button
                  v-if="canAdvance && doc.status !== 'menunggu_tte'"
                  class="btn-primary btn-sm w-full"
                  @click="advanceDoc"
                >
                  {{ doc.status === 'draft' ? 'Ajukan untuk Verifikasi Atasan' : doc.status === 'verifikasi' ? 'Setujui Verifikasi (Ke Penomoran)' : 'Lanjutkan ke Menunggu TTE' }}
                </button>

                <!-- Panel Khusus TTE & BSrE -->
                <div v-if="canSign" class="bg-primary-50 border border-primary-200 p-4 rounded-lg text-sm space-y-4">
                  <p class="font-bold text-primary-900 text-sm border-b border-primary-200 pb-2">
                    Pengesahan & TTE (BSrE / Digital)
                  </p>

                  <!-- Opsi 1: TTE Barcode / API BSrE -->
                  <div class="space-y-1.5">
                    <p class="text-xs font-semibold text-primary-900">Opsi 1: TTE Barcode / Integrasi API BSrE</p>
                    <button
                      class="btn-primary btn-sm w-full"
                      :disabled="isProcessingBsre"
                      @click="startSignDocTte"
                    >
                      {{ settingsStore.settings?.bsreEnabled ? 'Sahkan via API BSrE (Passphrase)' : 'Sahkan dengan TTE Barcode (QR)' }}
                    </button>
                  </div>

                  <!-- Opsi 2: Download -> TTD BSrE Digital -> Upload Final -->
                  <div class="space-y-2 border-t border-primary-200 pt-3">
                    <p class="text-xs font-semibold text-emerald-900">Opsi 2: Unduh &rarr; TTD BSrE Digital &rarr; Unggah Final</p>
                    <label class="flex items-center gap-1.5 text-[11px] text-gray-700 cursor-pointer">
                      <input type="checkbox" v-model="includeQrOnDownload" class="rounded text-emerald-600" />
                      <span>Sertakan QR Verifikasi E-Office saat unduh</span>
                    </label>
                    <button
                      type="button"
                      class="btn-secondary btn-sm w-full text-xs"
                      :disabled="isProcessingBsre"
                      @click="handleDownloadForBsre"
                    >
                      1. Unduh PDF Siap TTD BSrE
                    </button>
                    <div>
                      <label class="block text-[11px] font-medium text-emerald-800 mb-1">
                        2. Unggah PDF Hasil TTD BSrE Anda:
                      </label>
                      <input
                        type="file"
                        accept="application/pdf"
                        :disabled="isUploadingBsreFinal"
                        @change="handleUploadBsreFinal"
                        class="form-input text-xs bg-white"
                      />
                      <p v-if="isUploadingBsreFinal" class="text-xs text-emerald-700 mt-1">
                        Mengunggah PDF BSrE ke Google Drive & mengesahkan surat...
                      </p>
                    </div>
                  </div>

                  <!-- Opsi 3: TTD Basah -->
                  <div class="border-t border-primary-200 pt-3">
                    <p class="text-xs font-semibold text-gray-700 mb-1.5">Opsi 3: TTD Basah (Manual)</p>
                    <button class="btn-secondary btn-sm w-full text-xs" @click="signDocBasah">
                      Sahkan dengan TTD Basah
                    </button>
                  </div>
                </div>

                <button class="btn-danger btn-sm w-full" v-if="doc.status !== 'draft'" @click="showRejectModal = true">
                  Tolak / Kembalikan ke Draft
                </button>
              </div>

              <!-- Upload ulang file final (TTD Basah atau Ganti File BSrE) -->
              <div v-else class="border-t border-gray-100 pt-3 space-y-3">
                <div class="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-900">
                  <p class="font-bold">Dokumen Telah Disahkan</p>
                  <p class="mt-0.5">Metode: <strong>{{ tteBadgeLabel || 'Resmi' }}</strong></p>
                </div>

                <div v-if="(doc.tteMethod === 'basah' || doc.tte?.method === 'basah') && (isAdmin || auth.currentUser?.role === 'tu')">
                  <p class="text-xs font-semibold text-gray-700 mb-1">Upload File Scan TTD Basah (Final)</p>
                  <input type="file" accept="application/pdf" @change="handleUploadBasah" class="form-input text-xs" :disabled="isUploadingBasah" />
                  <p v-if="isUploadingBasah" class="text-xs text-blue-600 mt-1">Mengunggah ke Google Drive...</p>
                </div>

                <div v-if="isPenandatangan || isAdmin" class="border-t border-gray-100 pt-3">
                  <p class="text-xs font-semibold text-gray-700 mb-1">Ganti / Unggah PDF Final Hasil TTD BSrE</p>
                  <input type="file" accept="application/pdf" @change="handleUploadBsreFinal" class="form-input text-xs" :disabled="isUploadingBsreFinal" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview Section -->
      <div class="card bg-white print:shadow-none print:border-0 relative">
        <div v-if="doc?.status !== 'selesai' && !isCreateRoute" class="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 print:hidden z-10">
          <h1 class="text-8xl font-black rotate-[-30deg] text-gray-900">{{ doc?.status?.toUpperCase() }}</h1>
        </div>

        <div v-if="manualFileUrl && (form.isManual || doc?.tteMethod === 'bsre_external' || doc?.tteMethod === 'bsre_api')" class="w-full h-[800px]">
          <iframe :src="manualFileUrl" class="w-full h-full border-0"></iframe>
        </div>

        <div v-else-if="!form.isManual">
          <DocumentKop :unit-id="form.unitId" :is-internal="form.sifatTujuan === 'internal'" />
          <div class="mt-4 mb-6 text-sm space-y-1">
            <div class="flex gap-2">
              <span class="w-36 text-gray-600">Nomor</span>
              <span class="font-semibold">: {{ doc?.nomorSurat ?? '[Menunggu Penomoran]' }}</span>
            </div>
            <div class="flex gap-2">
              <span class="w-36 text-gray-600">Lampiran</span>
              <span>: {{ form.lampiran ?? '-' }}</span>
            </div>
            <div class="flex gap-2">
              <span class="w-36 text-gray-600">Perihal</span>
              <span class="font-semibold">: {{ form.perihal }}</span>
            </div>
          </div>
          <div class="mb-6 text-sm">
            <p>Kepada Yth.</p>
            <p class="font-semibold whitespace-pre-line ml-2">{{ form.kepada }}</p>
            <p class="ml-2">di Tempat</p>
          </div>
          <div class="mb-4 text-sm leading-relaxed">
            <p class="mb-2">Dengan hormat,</p>
            <p class="whitespace-pre-line text-justify">{{ form.isiSurat }}</p>
          </div>
          <p class="text-sm mt-6">Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.</p>
          <TteBlock
            v-if="doc?.status === 'selesai' && doc.tte"
            :tte="doc.tte"
            :method="doc.tteMethod || 'bsre_qr'"
            :doc-id="doc.id"
          />
          <div v-else class="flex justify-end mt-12 print:mt-16 text-center text-gray-300">
            <div class="w-48 h-32 border-2 border-dashed border-gray-200 flex items-center justify-center rounded">
              [Menunggu TTE]
            </div>
          </div>
        </div>
      </div>
    </template>

    <Teleport to="body">
      <!-- Modal Tolak -->
      <div v-if="showRejectModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <h3 class="font-bold text-gray-900 text-lg">Tolak Surat</h3>
          <textarea v-model="rejectReason" class="form-textarea" rows="3" placeholder="Alasan penolakan..." />
          <div class="flex justify-end gap-3">
            <button class="btn-secondary" @click="showRejectModal = false; rejectReason=''">Batal</button>
            <button class="btn-danger" :disabled="!rejectReason.trim()" @click="confirmReject">Tolak</button>
          </div>
        </div>
      </div>

      <!-- Modal Passphrase API BSrE -->
      <div v-if="showBsreApiModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <h3 class="font-bold text-emerald-900 text-lg">Tanda Tangan Elektronik BSrE (BSSN)</h3>
          <p class="text-xs text-gray-600">
            Masukkan NIK dan Passphrase sertifikat elektronik BSrE Anda untuk menandatangani dokumen ini secara langsung melalui API BSrE.
          </p>
          <div class="space-y-3">
            <div>
              <label class="form-label">NIK Penandatangan</label>
              <input v-model="bsreForm.nik" type="text" class="form-input font-mono" placeholder="16 digit NIK" />
            </div>
            <div>
              <label class="form-label">Passphrase BSrE</label>
              <input v-model="bsreForm.passphrase" type="password" class="form-input" placeholder="Masukkan passphrase BSrE Anda" />
            </div>
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button class="btn-secondary" @click="showBsreApiModal = false">Batal</button>
            <button class="btn-primary bg-emerald-700 hover:bg-emerald-800 border-none" :disabled="isProcessingBsre" @click="submitBsreApiSign">
              {{ isProcessingBsre ? 'Menandatangani via BSrE...' : 'Tanda Tangani Sekarang' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
