<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useDocumentsStore } from '../../stores/documents.js'
import { useMasterDataStore } from '../../stores/masterData.js'
import DocumentKop from '../../components/common/DocumentKop.vue'
import WorkflowStepper from '../../components/common/WorkflowStepper.vue'
import StatusBadge from '../../components/common/StatusBadge.vue'
import TteBlock from '../../components/common/TteBlock.vue'

const props = defineProps({
  id:   { type: String, default: '' },
  mode: { type: String, default: 'view' }, // 'view' | 'create'
})

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const docStore = useDocumentsStore()
const mdStore = useMasterDataStore()

const isCreateRoute = computed(() => props.mode === 'create' || route.name === 'SuratKeluarBuat')

// ── Existing doc ──────────────────────────────────────────────────────────────
const doc = computed(() => docStore.documents.find(d => d.id === props.id))


// ── RBAC Checks ───────────────────────────────────────────────────────────────
const isAdmin = computed(() => auth.isAdmin)
const isPembuat = computed(() => doc.value?.createdBy === auth.currentUser?.id)
const isPenandatangan = computed(() => doc.value?.penandatanganId === auth.currentUser?.id)

// Hak Akses Tata Usaha: Hanya Admin, Unit Admin, atau staf Bagian Tata Usaha Pimpinan (TU)
const isTU = computed(() => auth.isAdmin || auth.isUnitAdmin || auth.currentUser?.unitId === 'tu')

// Hierarchical RBAC Logic
const isVerifikator = computed(() => {
  if (isAdmin.value) return true
  const user = auth.currentUser
  if (!user || !doc.value) return false
  
  const docUnitId = doc.value.unitId
  const userUnitId = user.unitId
  
  // Penandatangan tidak memverifikasi suratnya sendiri (langsung TTE di tahap akhir)
  if (isPenandatangan.value) return false

  // Yang berhak memverifikasi: Wakil Rektor, Wakil Dekan, Kabag, atau Pimpinan (selain penandatangan)
  if (docUnitId === userUnitId && (user.role === 'pimpinan' || ['kabag', 'wakil_dekan', 'warek'].includes(user.sppdRole))) {
    return true
  }
  
  // Find unit details
  const docUnit = mdStore.units.find(u => u.id === docUnitId)
  
  // Rule 2: If document is from a Prodi or Jurusan or BEM Fakultas, the Dekan of the parent Fakultas can verify
  if (docUnit && (docUnit.type === 'prodi' || docUnit.type === 'jurusan' || (docUnit.type === 'ukm' && docUnit.parentFakultas))) {
     if (userUnitId === docUnit.parentFakultas && user.sppdRole === 'dekan') return true
  }
  
  // Rule 3: Rektor/Warek can verify anything from lower units as the highest authority
  if (['rektor', 'warek'].includes(user.sppdRole)) {
    return true
  }
  
  return false
})

// Can edit if creating new, or if the doc is in draft and user is creator/admin
const isEditMode = computed(() => isCreateRoute.value || (doc.value?.status === 'draft' && (isPembuat.value || isAdmin.value)))

// ── Action Permissions ────────────────────────────────────────────────────────
const canVerify = computed(() => doc.value?.status === 'draft' && isVerifikator.value) // In this MVP, verifying moves it from draft->verifikasi, actually the state machine is Draft -> Verifikasi -> Penomoran
// Let's correct this based on the states:
// draft -> verifikasi (Action by Pembuat to submit, or auto by saving)
// verifikasi -> penomoran (Action by Verifikator)
// penomoran -> menunggu_tte (Action by TU)
// menunggu_tte -> selesai (Action by Penandatangan)

  const canSubmit = computed(() => doc.value?.status === 'draft' && (isPembuat.value || auth.isAdmin || auth.isUnitAdmin))
  const canApproveVerifikasi = computed(() => doc.value?.status === 'verifikasi' && isVerifikator.value)
  const canApprovePengesahan = computed(() => doc.value?.status === 'pengesahan' && (isVerifikator.value || auth.isAdmin || auth.isUnitAdmin))
  const canAssignNumber = computed(() => doc.value?.status === 'penomoran' && isTU.value)
  const canSign = computed(() => doc.value?.status !== 'draft' && doc.value?.status !== 'selesai' && (isPenandatangan.value || isAdmin.value))
  
  const canAdvance = computed(() => canSubmit.value || canApproveVerifikasi.value || canApprovePengesahan.value || canAssignNumber.value || canSign.value)
const canReject = computed(() => doc.value && doc.value.status !== 'draft' && doc.value.status !== 'selesai' && canAdvance.value) // if they can advance it, they can reject it

const nextStatusLabel = computed(() => {
  if (!doc.value) return ''
  const next = docStore.getNextStatus(doc.value.status)
  return docStore.DOCUMENT_STATUSES.find(s => s.key === next)?.label ?? ''
})

// ── Form state ────────────────────────────────────────────────────────────────
const form = ref({
  judul:     '',
  kodeSurat: 'ST',
  unitId:    auth.currentUser?.unitId ?? 'rektor',
  sifatTujuan: 'internal', // 'internal' or 'eksternal'
  penandatanganId: 1, // Default to Rektor (ID 1)
  perihal:   '',
  kepada:    '',
  isiSurat:  '',
  lampiran:  '-',
})

// Allowed Signers
const potentialSigners = computed(() => {
  // Only high-ranking officials can sign (Rektor, Warek, Dekan)
  return auth.users.filter(u => ['rektor', 'warek', 'dekan'].includes(u.sppdRole) || u.role === 'admin')
})

watch(doc, (d) => {
  if (d && !isCreateRoute.value) {
    form.value = {
      judul:    d.judul,
      kodeSurat:d.kodeSurat,
      unitId:   d.unitId,
      sifatTujuan: d.sifatTujuan || 'internal',
      penandatanganId: d.penandatanganId || 1,
      perihal:  d.perihal,
      kepada:   d.kepada,
      isiSurat: d.isiSurat,
      lampiran: d.lampiran ?? '-',
    }
  }
}, { immediate: true })

// ── Save/Create Draft ────────────────────────────────────────────────────────
function handleSaveDraft() {
  if (!form.value.judul || !form.value.perihal || !form.value.isiSurat) {
    alert('Harap lengkapi Judul, Perihal, dan Isi Surat terlebih dahulu.')
    return
  }
  
  if (isCreateRoute.value) {
    const newDoc = docStore.createDocument({ ...form.value }, auth.currentUser)
    router.push(`/surat-keluar/${newDoc.id}`)
  } else if (isEditMode.value && doc.value) {
    docStore.updateDocument(doc.value.id, { ...form.value })
    alert('Draft berhasil diperbarui.')
  }
}

// ── Workflow actions ─────────────────────────────────────────────────────────
const rejectReason = ref('')
const showRejectModal = ref(false)

function advanceDoc() {
  if (isEditMode.value) {
    // If still in edit mode (draft), save first then advance
    handleSaveDraft()
  }
  
  const signerUser = auth.users.find(u => u.id === form.value.penandatanganId)
  docStore.advanceStatus(doc.value.id, auth.currentUser, signerUser)
}

const uploadedFile = ref(null)
const uploadedFileName = ref('')

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (file && file.type === 'application/pdf') {
    uploadedFile.value = file
    uploadedFileName.value = file.name
  } else {
    alert('Harap unggah file berformat PDF.')
    event.target.value = ''
    uploadedFile.value = null
  }
}

function signDocBasah() {
  const signerUser = auth.users.find(u => u.id === form.value.penandatanganId)
  docStore.signDocument(doc.value.id, auth.currentUser, signerUser, { tteMethod: 'basah' })
}

function signDocTte() {
  if (!uploadedFile.value) return
  const fakeUrl = URL.createObjectURL(uploadedFile.value)
  const signerUser = auth.users.find(u => u.id === form.value.penandatanganId)
  docStore.signDocument(doc.value.id, auth.currentUser, signerUser, { 
    tteMethod: 'bsre', 
    fileTteUrl: fakeUrl, 
    fileTteName: uploadedFileName.value 
  })
}

function confirmReject() {
  if (!rejectReason.value.trim()) return
  docStore.rejectDocument(doc.value.id, rejectReason.value, auth.currentUser?.name)
  showRejectModal.value = false
  rejectReason.value = ''
}

// ── Print ─────────────────────────────────────────────────────────────────────
function handlePrint() { window.print() }
</script>

<template>
  <div class="space-y-5 max-w-5xl mx-auto">

    <!-- Page Header -->
    <div class="flex items-center gap-4 no-print">
      <button class="btn-secondary btn-sm" @click="router.back()">
        ← Kembali
      </button>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900">
          {{ isCreateRoute ? 'Buat Surat Keluar Baru' : (doc?.judul ?? 'Detail Surat') }}
        </h1>
        <p v-if="!isCreateRoute && doc" class="text-sm text-gray-500 mt-0.5 font-mono">
          {{ doc.nomorSurat ?? doc.id }}
        </p>
      </div>
      <div v-if="!isCreateRoute && doc" class="flex gap-2">
        <button class="btn-secondary btn-sm" @click="handlePrint">
          🖨️ Cetak
        </button>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- EDIT / CREATE MODE PANEL                                   -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <template v-if="isEditMode">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 no-print">
        <div class="lg:col-span-2 space-y-4">
          <div class="card space-y-4 border-l-4 border-l-blue-500">
            <div class="flex justify-between items-center border-b pb-2">
              <h2 class="font-semibold text-gray-800">Formulir Surat (Mode Edit)</h2>
              <span class="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Hanya Pembuat yang dapat mengedit</span>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="form-label">Jenis / Kode Surat</label>
                <select v-model="form.kodeSurat" class="form-select">
                  <option v-for="k in mdStore.kodeSurat" :key="k.singkatan" :value="k.singkatan">
                    {{ k.kodeNomor }} — {{ k.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="form-label">Unit / Prodi Pengirim (KOP)</label>
                <select v-model="form.unitId" class="form-select">
                  <option v-for="u in mdStore.units" :key="u.id" :value="u.id">
                    [{{ u.kode }}] {{ u.label }}
                  </option>
                </select>
              </div>

              <div>
                <label class="form-label">Sifat / Tujuan Surat (Logo KOP)</label>
                <select v-model="form.sifatTujuan" class="form-select">
                  <option value="internal">Internal (Logo Hitam Putih)</option>
                  <option value="eksternal">Eksternal (Logo Berwarna)</option>
                </select>
              </div>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-2">
                <label class="form-label">Penandatangan (TTE)</label>
                <select v-model="form.penandatanganId" class="form-select">
                  <option v-for="u in potentialSigners" :key="u.id" :value="u.id">
                    {{ u.name }} — {{ u.jabatan }}
                  </option>
                </select>
                <p class="text-xs text-gray-400 mt-1">Hanya pimpinan (Rektor/Warek/Dekan) yang diizinkan melakukan TTE.</p>
              </div>
            </div>

            <div>
              <label class="form-label">Judul Surat / Agenda <span class="text-red-500">*</span></label>
              <input v-model="form.judul" type="text" class="form-input" placeholder="Contoh: Surat Tugas Menghadiri Seminar..." />
            </div>

            <div>
              <label class="form-label">Perihal <span class="text-red-500">*</span></label>
              <input v-model="form.perihal" type="text" class="form-input" placeholder="Perihal singkat surat" />
            </div>

            <div>
              <label class="form-label">Kepada Yth. (Tujuan)</label>
              <textarea v-model="form.kepada" class="form-textarea" rows="2" placeholder="Nama/Instansi tujuan..." />
            </div>

            <div>
              <label class="form-label">Lampiran</label>
              <input v-model="form.lampiran" type="text" class="form-input" placeholder="- / 1 berkas / dst" />
            </div>

            <div>
              <label class="form-label">Isi Surat <span class="text-red-500">*</span></label>
              <textarea v-model="form.isiSurat" class="form-textarea" rows="6" placeholder="Tuliskan isi surat di sini..." />
            </div>

            <div class="flex justify-end gap-3 pt-2 border-t">
              <button class="btn-secondary" @click="router.back()">Batal</button>
              <button class="btn-primary" @click="handleSaveDraft">
                💾 Simpan Draft
              </button>
              <button v-if="doc && canAdvance" class="btn-primary bg-green-600 hover:bg-green-700 border-none" @click="advanceDoc">
                Kirim ke Verifikasi →
              </button>
            </div>
          </div>
        </div>

        <!-- Live KOP Preview -->
        <div class="space-y-4">
          <div class="card">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Preview KOP Surat</h3>
            <DocumentKop :unit-id="form.unitId" :compact="true" :is-internal="form.sifatTujuan === 'internal'" />
          </div>
        </div>
      </div>
    </template>

    <!-- ═══════════════════════════════════════════════════════════ -->
    <!-- VIEW / READONLY MODE (For Workflow Tracking)               -->
    <!-- ═══════════════════════════════════════════════════════════ -->
    <template v-if="doc">
      <!-- Workflow stepper -->
      <div class="card no-print">
        <WorkflowStepper :current-status="doc.status" />
        
        <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
          <div>
            <StatusBadge
              :status="docStore.getStatusInfo(doc.status).color"
              :label="docStore.getStatusInfo(doc.status).label"
            />
            <span class="text-xs text-gray-400 ml-2">
              Terakhir diperbarui: {{ new Date(doc.statusHistory.at(-1)?.at).toLocaleString('id-ID') }}
              oleh {{ doc.statusHistory.at(-1)?.by }}
            </span>
          </div>
          <div v-if="doc.status !== 'selesai' && !isCreateRoute">
            <div class="border-t border-gray-100 pt-3">
              <button v-if="canReject" class="btn-danger btn-sm w-full mb-2" @click="showRejectModal = true">
                Tolak / Kembalikan ke Draft
              </button>
              
              <!-- Regular Workflow Button -->
              <button v-if="canAdvance && !canSign && !isEditMode" class="btn-primary btn-sm w-full" @click="advanceDoc">
                Setujui & Lanjutkan → {{ nextStatusLabel }}
              </button>

              <!-- Panel Pimpinan (Penandatangan) -->
              <div v-if="canSign" class="bg-primary-50 border border-primary-200 p-4 rounded-lg text-sm mt-3 space-y-4">
                <p class="font-bold text-primary-900 text-sm border-b border-primary-200 pb-2">Verifikasi Akhir & Pengesahan</p>
                <p class="text-xs text-primary-700">Pilih metode penandatanganan untuk surat ini:</p>
                
                <!-- Opsi 1: TTD Basah -->
                <div class="bg-white p-3 rounded border border-gray-200">
                  <p class="font-semibold text-gray-800 text-xs mb-2">Opsi 1: TTD Basah (Manual)</p>
                  <button class="btn-secondary btn-sm w-full" @click="signDocBasah">
                    Sahkan dengan TTD Basah
                  </button>
                </div>

                <!-- Opsi 2: TTE BSrE -->
                <div class="bg-white p-3 rounded border border-gray-200">
                  <p class="font-semibold text-gray-800 text-xs mb-2">Opsi 2: TTE BSrE (Manual Upload BeSign)</p>
                  <button class="btn-secondary btn-sm w-full mb-2" @click="handlePrint">
                    1. Download / Cetak PDF Draf
                  </button>
                  <label class="block text-xs font-semibold text-gray-700 mb-1">2. Upload PDF Tersertifikasi</label>
                  <input type="file" accept="application/pdf" class="block w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary-100 file:text-primary-700 hover:file:bg-primary-200 border border-gray-200 rounded cursor-pointer mb-2" @change="handleFileUpload" />
                  
                  <button class="btn-primary btn-sm w-full" :disabled="!uploadedFile" @click="signDocTte">
                    3. Sahkan dengan TTE
                  </button>
                </div>
              </div>
              
              <div v-if="!canAdvance && !isEditMode" class="text-xs text-gray-500 italic mt-2">
                Menunggu tindakan dari bagian berwenang.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Document preview (print-ready) -->
      <div class="card bg-white print:shadow-none print:border-0 relative">
        <!-- Watermark for non-finished docs -->
        <div v-if="doc.status !== 'selesai'" class="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 print:hidden">
          <h1 class="text-8xl font-black rotate-[-30deg] text-gray-900">{{ doc.status.toUpperCase() }}</h1>
        </div>

        <!-- KOP SURAT -->
        <DocumentKop :unit-id="form.unitId" :is-internal="form.sifatTujuan === 'internal'" />

        <!-- Document number & date -->
        <div class="mt-4 mb-6 text-sm space-y-1">
          <div class="flex gap-2">
            <span class="w-36 text-gray-600">Nomor</span>
            <span class="font-semibold">: {{ doc.nomorSurat ?? '…………………………………' }}</span>
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

        <!-- Kepada -->
        <div class="mb-6 text-sm">
          <p>Kepada Yth.</p>
          <p class="font-semibold whitespace-pre-line ml-2">{{ form.kepada }}</p>
          <p class="ml-2">di Tempat</p>
        </div>

        <!-- Pembuka -->
        <div class="mb-4 text-sm leading-relaxed">
          <p class="mb-2">Dengan hormat,</p>
          <p class="whitespace-pre-line text-justify">{{ form.isiSurat }}</p>
        </div>

        <!-- Penutup -->
        <p class="text-sm mt-6">Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.</p>

        <!-- TTE Block -->
        <TteBlock
          v-if="doc.status === 'selesai' && doc.tte"
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

      <!-- Status history (no-print) -->
      <div class="card no-print">
        <h3 class="font-semibold text-gray-800 mb-3">Riwayat Status</h3>
        <ol class="relative border-l border-gray-200 space-y-3 ml-2">
          <li v-for="h in doc.statusHistory" :key="h.at" class="ml-4">
            <span class="absolute -left-2 w-4 h-4 rounded-full border-2 border-white"
              :class="docStore.getStatusInfo(h.status).color === 'green' ? 'bg-green-400' :
                      docStore.getStatusInfo(h.status).color === 'blue' ? 'bg-blue-400' :
                      docStore.getStatusInfo(h.status).color === 'purple' ? 'bg-purple-400' :
                      docStore.getStatusInfo(h.status).color === 'yellow' ? 'bg-yellow-400' : 
                      docStore.getStatusInfo(h.status).color === 'orange' ? 'bg-orange-400' : 'bg-gray-300'"
            />
            <p class="text-sm font-semibold text-gray-800">{{ docStore.getStatusInfo(h.status).label }}</p>
            <p class="text-xs text-gray-500">{{ new Date(h.at).toLocaleString('id-ID') }} — {{ h.by }}</p>
            <p v-if="h.note" class="text-xs text-red-600 mt-0.5">Catatan: {{ h.note }}</p>
          </li>
        </ol>
      </div>
    </template>

    <!-- 404 -->
    <div v-else-if="!isCreateRoute" class="card text-center py-12 text-gray-400">
      Dokumen tidak ditemukan.
      <RouterLink to="/surat-keluar" class="block mt-2 text-primary-700 hover:underline text-sm">← Kembali ke daftar</RouterLink>
    </div>

    <!-- ── Reject Modal ─────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showRejectModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <h3 class="font-bold text-gray-900 text-lg">Tolak / Kembalikan Surat</h3>
          <p class="text-sm text-gray-600">Surat akan dikembalikan ke status <strong>Draft</strong>. Berikan alasan penolakan:</p>
          <textarea v-model="rejectReason" class="form-textarea" rows="3" placeholder="Alasan penolakan..." />
          <div class="flex justify-end gap-3">
            <button class="btn-secondary" @click="showRejectModal = false; rejectReason=''">Batal</button>
            <button class="btn-danger" :disabled="!rejectReason.trim()" @click="confirmReject">Konfirmasi Tolak</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
