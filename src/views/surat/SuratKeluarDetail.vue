<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { gasGet } from '../../api/gasClient.js'
import { useAuthStore } from '../../stores/auth.js'
import { useDocumentsStore } from '../../stores/documents.js'
import { useMasterDataStore } from '../../stores/masterData.js'
import StatusBadge from '../../components/common/StatusBadge.vue'
import WorkflowStepper from '../../components/common/WorkflowStepper.vue'
import DocumentKop from '../../components/common/DocumentKop.vue'
import TteBlock from '../../components/common/TteBlock.vue'
import { PDFDocument } from 'pdf-lib'
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

const isCreateRoute = computed(() => props.mode === 'create' || route.name === 'SuratKeluarBuat')

const doc = computed(() => docStore.documents.find(d => d.id === props.id))

const form = ref({
  isManual: false,
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
  isiSurat: '',
  lampiran: '-',
})

const potentialSigners = computed(() => {
  return auth.users.filter(u => ['rektor', 'warek', 'dekan'].includes(u.sppdRole) || u.role === 'admin')
})

watch(doc, (d) => {
  if (d && !isCreateRoute.value) {
    form.value = {
      isManual: d.isManual || false,
      fileBase64: d.fileBase64 || null,
      fileMime: d.fileMime || null,
      fileName: d.fileName || '',
      judul: d.judul,
      kodeSurat: d.kodeSurat,
      unitId: d.unitId,
      sifatTujuan: d.sifatTujuan,
      penandatanganId: d.penandatanganId,
      perihal: d.perihal,
      kepada: d.kepada,
      isiSurat: d.isiSurat,
      lampiran: d.lampiran,
    }
  }
}, { immediate: true })

const isPembuat = computed(() => doc.value?.createdBy === auth.currentUser?.id)
const isAdmin = computed(() => auth.currentUser?.role === 'admin')
const isPenandatangan = computed(() => doc.value?.penandatanganId === auth.currentUser?.id)

const isEditMode = computed(() => isCreateRoute.value || (doc.value?.status === 'draft' && (isPembuat.value || isAdmin.value)))

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

// QR Stamping logic
const stampPdfWithQR = async (base64Pdf, qrDataUrl) => {
  try {
    const existingPdfBytes = Uint8Array.from(atob(base64Pdf), c => c.charCodeAt(0))
    const pdfDoc = await PDFDocument.load(existingPdfBytes)
    const qrImageBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0))
    const qrImage = await pdfDoc.embedPng(qrImageBytes)
    const pages = pdfDoc.getPages()
    const lastPage = pages[pages.length - 1]
    const qrDims = qrImage.scale(0.5)
    lastPage.drawImage(qrImage, {
      x: lastPage.getWidth() - qrDims.width - 50,
      y: 50,
      width: qrDims.width,
      height: qrDims.height,
    })
    const pdfBytes = await pdfDoc.save()
    let binary = ''
    for (let i = 0; i < pdfBytes.byteLength; i++) binary += String.fromCharCode(pdfBytes[i])
    return btoa(binary)
  } catch (e) {
    console.error("PDF Stamping Error:", e)
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
  return isPenandatangan.value || isAdmin.value
})

const showRejectModal = ref(false)
const rejectReason = ref('')

const advanceDoc = async () => {
  if (doc.value) await docStore.advanceStatus(doc.value.id, auth.currentUser, null)
}

const signDocBasah = async () => {
  await docStore.signDocument(doc.value.id, auth.currentUser, auth.currentUser, { tteMethod: 'basah' })
}

const signDocTte = async () => {
  let extraData = { tteMethod: 'bsre' }
  
  if (form.value.isManual) {
    try {
      const qrUrl = await QRCode.toDataURL(`https://e-office.univsm.ac.id/verify/${doc.value.id}`, { width: 150 })
      let targetB64 = form.value.fileBase64 || doc.value?.fileBase64
      
      // If base64 is empty but we have a driveFileId, fetch the base64 from Google Drive via backend
      if (!targetB64 && doc.value?.driveFileId) {
         console.log('Fetching Base64 from Google Drive Archive...')
         const res = await gasGet('get_file_b64', { fileId: doc.value.driveFileId })
         if (res && res.success) {
           targetB64 = res.base64
         }
      }
      
      if (targetB64) {
        extraData.fileBase64 = await stampPdfWithQR(targetB64, qrUrl)
        // Ensure backend knows we are updating the Drive file with the new stamped PDF
        if (doc.value?.driveFileId) extraData.driveFileId = doc.value.driveFileId 
      }
    } catch (e) {
      console.error(e)
    }
  }
  
  await docStore.signDocument(doc.value.id, auth.currentUser, auth.currentUser, extraData)
}

const confirmReject = async () => {
  await docStore.rejectDocument(doc.value.id, rejectReason.value, auth.currentUser.name)
  showRejectModal.value = false
  rejectReason.value = ''
}

const handlePrint = () => {
  if (form.value.isManual && manualFileUrl.value) {
    // Print the manual PDF
    const printWindow = window.open(manualFileUrl.value)
    if (printWindow) {
      printWindow.onload = () => printWindow.print()
    }
  } else {
    window.print()
  }
}
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <template v-if="doc || isCreateRoute">
      <!-- Top header -->
      <div class="flex items-center justify-between no-print">
        <div class="flex items-center gap-3">
          <button class="text-gray-400 hover:text-gray-700 bg-white p-2 rounded-full border border-gray-200" @click="router.back()">
            â†
          </button>
          <div class="flex-1">
            <h1 class="text-xl font-bold text-gray-900">
              {{ isCreateRoute ? 'Buat Surat Keluar Baru' : (doc?.judul ?? 'Detail Surat') }}
            </h1>
            <p v-if="!isCreateRoute && doc" class="text-sm text-gray-500 mt-0.5 font-mono">
              <span v-if="!isEditingNomor">{{ doc.nomorSurat ?? doc.id }}</span>
              <div v-else class="flex items-center gap-2 mt-1">
                <input v-model="manualNomor" type="text" class="form-input text-xs py-1 px-2 h-7 w-48" placeholder="Kosongkan u/ hapus" />
                <button @click="saveNomor" class="btn-primary text-xs py-1 px-2 h-7">Simpan</button>
                <button @click="isEditingNomor = false" class="btn-secondary text-xs py-1 px-2 h-7">Batal</button>
              </div>
              <button v-if="!isEditingNomor && doc.nomorSurat && (isAdmin || auth.currentUser?.role === 'tu')" @click="startEditNomor" class="text-xs text-blue-600 hover:underline">
                [Edit / Hapus Nomor]
              </button>
            </p>
          </div>
        </div>
        <div v-if="!isCreateRoute && doc" class="flex gap-2">
          <button class="btn-secondary btn-sm" @click="handlePrint">
            Cetak untuk TTD Basah
          </button>
        </div>
      </div>

      <WorkflowStepper v-if="!isCreateRoute" :current-status="doc?.status" :statuses="docStore.DOCUMENT_STATUSES" class="no-print" />

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div class="lg:col-span-2 space-y-6">
          <div class="card bg-white space-y-4">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-semibold text-gray-800">Informasi Surat</h3>
              <StatusBadge v-if="!isCreateRoute" :status="doc.status" :status-list="docStore.DOCUMENT_STATUSES" />
            </div>

            <!-- Tipe Surat Selector -->
            <div v-if="isEditMode" class="mb-4">
              <label class="block text-sm font-medium text-gray-700 mb-1">Tipe Pembuatan</label>
              <div class="flex gap-4">
                <label class="flex items-center">
                  <input type="radio" v-model="form.isManual" :value="false" class="mr-2" /> Dibuat di Sistem
                </label>
                <label class="flex items-center">
                  <input type="radio" v-model="form.isManual" :value="true" class="mr-2" /> Upload Surat Manual
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
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="form-label">Judul (Untuk Agenda)</label>
                  <input v-model="form.judul" :disabled="!isEditMode" type="text" class="form-input" placeholder="Mis: SK Rektor..." />
                </div>
                <div>
                  <label class="form-label">Penandatangan</label>
                  <select v-model="form.penandatanganId" :disabled="!isEditMode" class="form-select">
                    <option v-for="user in potentialSigners" :key="user.id" :value="user.id">{{ user.name }} ({{ user.jabatan }})</option>
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
                  <option v-for="user in potentialSigners" :key="user.id" :value="user.id">{{ user.name }} ({{ user.jabatan }})</option>
                </select>
              </div>

              <div class="md:col-span-2">
                <label class="form-label">Perihal</label>
                <input v-model="form.perihal" :disabled="!isEditMode" type="text" class="form-input" />
              </div>

              <div class="md:col-span-2">
                <label class="form-label">Kepada (Tujuan Lengkap)</label>
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

            <div class="flex justify-end pt-4" v-if="isEditMode">
              <button class="btn-primary" @click="saveDoc">
                {{ isCreateRoute ? 'Buat Draft Surat' : 'Simpan Perubahan' }}
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-6">
          <div class="card bg-white">
            <h3 class="font-semibold text-gray-800 mb-4 border-b pb-2">Tindakan</h3>
            
            <div v-if="isCreateRoute" class="text-sm text-gray-500">
              Silakan simpan surat ini sebagai Draft terlebih dahulu sebelum dapat diajukan ke tahap verifikasi.
            </div>
            
            <div v-else>
              <div class="flex items-center gap-2 mb-4">
                <span class="w-2 h-2 rounded-full" :class="docStore.getStatusInfo(doc?.status).color === 'green' ? 'bg-green-500' : 'bg-gray-400'"></span>
                <span class="text-sm font-medium text-gray-700">{{ docStore.getStatusInfo(doc?.status).label }}</span>
              </div>
              <div v-if="doc.status !== 'selesai'">
                <div class="border-t border-gray-100 pt-3">
                  <button v-if="canAdvance && !canSign && !isEditMode" class="btn-primary btn-sm w-full" @click="advanceDoc">
                    Setujui & Lanjutkan
                  </button>

                  <div v-if="canSign" class="bg-primary-50 border border-primary-200 p-4 rounded-lg text-sm mt-3 space-y-4">
                    <p class="font-bold text-primary-900 text-sm border-b border-primary-200 pb-2">Verifikasi Akhir & Pengesahan</p>
                    <p class="text-xs text-primary-700">Pilih metode penandatanganan:</p>
                    <button class="btn-secondary btn-sm w-full" @click="signDocBasah">
                      Sahkan dengan TTD Basah
                    </button>
                    <button class="btn-primary btn-sm w-full" @click="signDocTte">
                      Sahkan dengan TTE (Otomatis QR)
                    </button>
                  </div>
                  
                  <button class="btn-danger btn-sm w-full mt-3" v-if="doc.status !== 'draft'" @click="showRejectModal = true">
                    Tolak / Kembalikan ke Draft
                  </button>
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

        <div v-if="form.isManual && manualFileUrl" class="w-full h-[800px]">
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
            :method="doc.tteMethod || 'bsre'"
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
    </Teleport>
  </div>
</template>
