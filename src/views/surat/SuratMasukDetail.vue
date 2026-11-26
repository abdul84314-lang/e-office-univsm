<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useSuratMasukStore } from '../../stores/suratMasuk.js'
import StatusBadge from '../../components/common/StatusBadge.vue'
import LembarDisposisiView from '../../components/common/LembarDisposisiView.vue'
import ParafPad from '../../components/common/ParafPad.vue'
import NotificationPanel from '../../components/common/NotificationPanel.vue'
import {
  SIFAT_SURAT_OPTIONS,
  DISPOSISI_HARAP_DEFAULTS,
  formatIndonesianDate,
  formatShortSlashDate,
  getSifatLabel,
  getAppBaseUrl,
  buildDisposisiEmailHtml,
  buildDisposisiWaText,
  buildSuratMasukEmailHtml,
  buildSuratMasukWaText,
  dispatchNotification,
} from '../../composables/useNotification.js'

const props = defineProps({
  id:   { type: String, default: '' },
  mode: { type: String, default: 'view' },
})

const route   = useRoute()
const router  = useRouter()
const auth    = useAuthStore()
const smStore = useSuratMasukStore()

const isCreateRoute = computed(() => props.mode === 'create' || route.name === 'SuratMasukBuat')
const doc = computed(() => smStore.documents.find(d => d.id === props.id))

const isSuperAdmin = computed(() => auth.isAdmin)
const isAdmin = computed(() => auth.currentUser?.role === 'admin' || auth.isAdmin)
const isTU = computed(() => isAdmin.value || auth.currentUser?.unitId === 'tu')

const isEditMode = ref(false)
const isEditing = computed(() => isCreateRoute.value || isEditMode.value)

// Form registrasi / edit surat masuk
const todayISO = new Date().toISOString().slice(0, 10)
const form = ref({
  asalSurat: '',
  nomorSuratAsal: '',
  tanggalSurat: todayISO,
  tanggalDiterima: todayISO,
  nomorAgenda: '',
  sifatSurat: 'segera',
  perihal: '',
  penerimaId: 1,
  fileBase64: null,
  fileMime: null,
  fileName: '',
  sendNotifOnRegister: true,
})

watch(doc, (newVal) => {
  if (newVal) {
    form.value = {
      asalSurat: newVal.asalSurat || '',
      nomorSuratAsal: newVal.nomorSuratAsal || '',
      tanggalSurat: newVal.tanggalSurat || todayISO,
      tanggalDiterima: newVal.tanggalDiterima || (newVal.createdAt ? newVal.createdAt.slice(0, 10) : todayISO),
      nomorAgenda: newVal.nomorAgenda || '',
      sifatSurat: newVal.sifatSurat || 'segera',
      perihal: newVal.perihal || '',
      penerimaId: newVal.penerimaId || 1,
      fileBase64: null,
      fileMime: null,
      fileName: '',
      sendNotifOnRegister: true,
    }
  } else if (isCreateRoute.value) {
    form.value.nomorAgenda = smStore.generateNextNomorAgenda()
  }
}, { immediate: true })

const handleFileUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  form.value.fileName = file.name
  form.value.fileMime = file.type
  const reader = new FileReader()
  reader.onload = (ev) => { form.value.fileBase64 = ev.target.result.split(',')[1] }
  reader.readAsDataURL(file)
}

const isTujuanDisposisi = computed(() =>
  doc.value?.penerimaId === auth.currentUser?.id ||
  isAdmin.value ||
  auth.isPimpinan ||
  auth.currentUser?.sppdRole === 'rektor'
)

const isPenerimaTindakLanjut = computed(() => {
  if (isAdmin.value) return true
  const uid = auth.currentUser?.id
  if (!uid || !doc.value?.disposisi) return false
  if (doc.value.disposisi.kepadaId === uid) return true
  if (Array.isArray(doc.value.disposisi.kepadaIds) && doc.value.disposisi.kepadaIds.includes(uid)) return true
  if (Array.isArray(doc.value.disposisi.penerimaList) && doc.value.disposisi.penerimaList.some(p => p.id === uid)) return true
  return false
})

const pimpinanList = computed(() =>
  auth.users.filter(u => ['rektor', 'warek', 'dekan', 'wakil_dekan', 'kabag'].includes(u.sppdRole) || u.role === 'pimpinan')
)

const previewUrl = computed(() => {
  if (doc.value?.driveViewUrl) return doc.value.driveViewUrl
  if (doc.value?.fileBase64) return `data:${doc.value.fileMime || 'application/pdf'};base64,${doc.value.fileBase64}`
  return null
})

// Notification state
const notifSending = ref(false)
const notifStatus = ref(null)
const copiedPublicLink = ref(false)

const docAppLink = computed(() => `${getAppBaseUrl()}/surat-masuk/${doc.value?.id || ''}`)

const publicDisposisiLink = computed(() => {
  if (!doc.value) return ''
  const tokenQ = doc.value.shareToken ? `?t=${encodeURIComponent(doc.value.shareToken)}` : ''
  return `${getAppBaseUrl()}/disposisi/${doc.value.id}${tokenQ}`
})

async function copyPublicDisposisiLink() {
  if (!publicDisposisiLink.value) return
  try {
    await navigator.clipboard.writeText(publicDisposisiLink.value)
    copiedPublicLink.value = true
    setTimeout(() => { copiedPublicLink.value = false }, 2500)
  } catch {}
}

const suratMasukPenerimaObj = computed(() => {
  const u = auth.users.find(x => x.id === doc.value?.penerimaId)
  return u ? [{ name: u.name, jabatan: u.jabatan, email: u.email, phone: u.phone }] : []
})

const disposisiRecipients = computed(() => {
  if (!doc.value?.disposisi) return []
  if (Array.isArray(doc.value.disposisi.penerimaList) && doc.value.disposisi.penerimaList.length > 0) {
    return doc.value.disposisi.penerimaList.map(p => {
      const u = p.id ? auth.users.find(x => x.id === p.id) : null
      return {
        name: p.nama || u?.name || '-',
        jabatan: p.jabatan || u?.jabatan || '',
        email: p.email || u?.email || '',
        phone: p.phone || u?.phone || '',
      }
    })
  }
  const u = auth.users.find(x => x.id === doc.value.disposisi.kepadaId)
  return u ? [{ name: u.name, jabatan: u.jabatan, email: u.email, phone: u.phone }] : []
})

const activeNotifRecipients = computed(() =>
  doc.value?.disposisi ? disposisiRecipients.value : suratMasukPenerimaObj.value
)

const activeWaText = computed(() => {
  if (!doc.value) return ''
  if (doc.value.disposisi) {
    return buildDisposisiWaText(doc.value, doc.value.disposisi, publicDisposisiLink.value)
  }
  const p = auth.users.find(x => x.id === doc.value.penerimaId)
  return buildSuratMasukWaText(doc.value, p, docAppLink.value)
})

async function triggerSuratMasukNotif(targetDoc) {
  const pimpinan = auth.users.find(u => u.id === targetDoc.penerimaId)
  if (!pimpinan) return
  notifSending.value = true
  const link = `${getAppBaseUrl()}/surat-masuk/${targetDoc.id}`
  const res = await dispatchNotification({
    docId: targetDoc.id,
    category: 'surat_masuk',
    recipients: [{ name: pimpinan.name, email: pimpinan.email, phone: pimpinan.phone }],
    subject: `[Surat Masuk - ${getSifatLabel(targetDoc.sifatSurat)}] ${targetDoc.perihal}`,
    htmlBody: buildSuratMasukEmailHtml(targetDoc, pimpinan, link),
    waText: buildSuratMasukWaText(targetDoc, pimpinan, link),
  })
  notifStatus.value = res
  notifSending.value = false
  smStore.appendNotifLog(targetDoc.id, {
    category: 'surat_masuk',
    recipients: [pimpinan.name],
    success: res.success,
    message: res.message || res.error || '',
  })
}

async function triggerDisposisiNotif(targetDoc) {
  if (!targetDoc?.disposisi) return
  let recips = (targetDoc.disposisi.penerimaList || []).map(p => {
    const u = p.id ? auth.users.find(x => x.id === p.id) : null
    return {
      name: p.nama || u?.name || '-',
      email: p.email || u?.email || '',
      phone: p.phone || u?.phone || '',
    }
  })
  if (!recips.length && targetDoc.disposisi.kepadaId) {
    const u = auth.users.find(x => x.id === targetDoc.disposisi.kepadaId)
    if (u) recips = [{ name: u.name, email: u.email || '', phone: u.phone || '' }]
  }
  notifSending.value = true
  const tokenQ = targetDoc.shareToken ? `?t=${encodeURIComponent(targetDoc.shareToken)}` : ''
  const link = `${getAppBaseUrl()}/disposisi/${targetDoc.id}${tokenQ}`
  const res = await dispatchNotification({
    docId: targetDoc.id,
    category: 'disposisi',
    recipients: recips,
    subject: `[LEMBAR DISPOSISI - ${getSifatLabel(targetDoc.disposisi.sifatSurat || targetDoc.sifatSurat)}] ${targetDoc.perihal}`,
    htmlBody: buildDisposisiEmailHtml(targetDoc, targetDoc.disposisi, link),
    waText: buildDisposisiWaText(targetDoc, targetDoc.disposisi, link),
  })
  notifStatus.value = res
  notifSending.value = false
  smStore.appendNotifLog(targetDoc.id, {
    category: 'disposisi',
    recipients: recips.map(r => r.name),
    success: res.success,
    message: res.message || res.error || '',
  })
}

async function handleResendNotif() {
  if (!doc.value) return
  if (doc.value.disposisi) {
    await triggerDisposisiNotif(doc.value)
  } else {
    await triggerSuratMasukNotif(doc.value)
  }
}

async function handleRegister() {
  if (!form.value.asalSurat || !form.value.nomorSuratAsal || !form.value.perihal) {
    alert('Harap lengkapi Asal Surat, Nomor Surat, dan Perihal.')
    return
  }

  if (isCreateRoute.value) {
    if (!form.value.fileBase64) return alert('Upload Dokumen PDF wajib saat registrasi baru.')
    const shouldNotif = form.value.sendNotifOnRegister
    const payload = { ...form.value }
    delete payload.sendNotifOnRegister
    const newDoc = await smStore.createSuratMasuk(payload)
    if (shouldNotif) {
      triggerSuratMasukNotif(newDoc)
    }
    router.push(`/surat-masuk/${newDoc.id}`)
  } else {
    const updateData = { ...form.value }
    delete updateData.sendNotifOnRegister
    if (!updateData.fileBase64) {
      delete updateData.fileBase64
      delete updateData.fileMime
      delete updateData.fileName
    }
    await smStore.updateSuratMasuk(doc.value.id, updateData)
    isEditMode.value = false
  }
}

// ── Modal Disposisi Resmi UNIVSM ──────────────────────────────────────────
const showDisposisiModal = ref(false)
const disposisiForm = ref({
  sifatSurat: 'segera',
  selectedUserIds: [],
  customRecipients: [], // [{ nama, jabatan, email, phone }]
  harapList: ['Proses Lebih Lanjut'],
  harapCustom1: '',
  harapCustom2: '',
  catatan: '',
  parafMode: 'canvas',
  parafDataUrl: '',
  parafTanggal: formatShortSlashDate(),
  sendNotifNow: true,
})

const newCustom = ref({ nama: '', jabatan: '', email: '', phone: '' })
const editingCustomIdx = ref(-1)

function openDisposisiModal() {
  editingCustomIdx.value = -1
  newCustom.value = { nama: '', jabatan: '', email: '', phone: '' }
  const existing = doc.value?.disposisi
  if (existing) {
    disposisiForm.value = {
      sifatSurat: existing.sifatSurat || doc.value?.sifatSurat || 'segera',
      selectedUserIds: (existing.penerimaList || []).filter(p => p.id).map(p => p.id),
      customRecipients: (existing.penerimaList || []).filter(p => !p.id).map(p => ({ ...p })),
      harapList: Array.isArray(existing.harapList) ? [...existing.harapList] : [],
      harapCustom1: existing.harapCustom1 || '',
      harapCustom2: existing.harapCustom2 || '',
      catatan: existing.catatan || existing.instruksi || '',
      parafMode: existing.parafMode || 'canvas',
      parafDataUrl: existing.parafDataUrl || '',
      parafTanggal: existing.parafTanggal || formatShortSlashDate(),
      sendNotifNow: true,
    }
  } else {
    disposisiForm.value = {
      sifatSurat: doc.value?.sifatSurat || 'segera',
      selectedUserIds: [],
      customRecipients: [],
      harapList: ['Proses Lebih Lanjut', 'Koordinasi / Konfirmasikan'],
      harapCustom1: '',
      harapCustom2: '',
      catatan: 'Kepada Yth. Pihak terkait :\n1. ',
      parafMode: 'canvas',
      parafDataUrl: '',
      parafTanggal: formatShortSlashDate(),
      sendNotifNow: true,
    }
  }
  showDisposisiModal.value = true
}

function toggleRecipientUser(userId) {
  const idx = disposisiForm.value.selectedUserIds.indexOf(userId)
  if (idx === -1) disposisiForm.value.selectedUserIds.push(userId)
  else disposisiForm.value.selectedUserIds.splice(idx, 1)
}

function addCustomRecipient() {
  if (!newCustom.value.nama.trim()) return
  const entry = {
    id: null,
    nama: newCustom.value.nama.trim(),
    jabatan: newCustom.value.jabatan.trim(),
    email: newCustom.value.email.trim(),
    phone: newCustom.value.phone.trim(),
    isCustom: true,
  }
  if (editingCustomIdx.value >= 0) {
    disposisiForm.value.customRecipients.splice(editingCustomIdx.value, 1, entry)
    editingCustomIdx.value = -1
  } else {
    disposisiForm.value.customRecipients.push(entry)
  }
  newCustom.value = { nama: '', jabatan: '', email: '', phone: '' }
}

function editCustomRecipient(idx) {
  const c = disposisiForm.value.customRecipients[idx]
  if (!c) return
  editingCustomIdx.value = idx
  newCustom.value = {
    nama: c.nama || '',
    jabatan: c.jabatan || '',
    email: c.email || '',
    phone: c.phone || '',
  }
}

function cancelEditCustomRecipient() {
  editingCustomIdx.value = -1
  newCustom.value = { nama: '', jabatan: '', email: '', phone: '' }
}

function removeCustomRecipient(idx) {
  disposisiForm.value.customRecipients.splice(idx, 1)
  if (editingCustomIdx.value === idx) {
    cancelEditCustomRecipient()
  } else if (editingCustomIdx.value > idx) {
    editingCustomIdx.value--
  }
}

function toggleHarap(item) {
  const idx = disposisiForm.value.harapList.indexOf(item)
  if (idx === -1) disposisiForm.value.harapList.push(item)
  else disposisiForm.value.harapList.splice(idx, 1)
}

async function submitDisposisi() {
  const userRecipients = disposisiForm.value.selectedUserIds
    .map(uid => auth.users.find(u => u.id === uid))
    .filter(Boolean)
    .map(u => ({
      id: u.id,
      nama: u.name,
      jabatan: u.jabatan,
      email: u.email,
      phone: u.phone,
    }))

  const allRecipients = [...userRecipients, ...disposisiForm.value.customRecipients]

  if (allRecipients.length === 0) {
    alert('Pilih minimal 1 tujuan pada bagian "Diteruskan Kepada".')
    return
  }
  if (!disposisiForm.value.catatan.trim() && disposisiForm.value.harapList.length === 0) {
    alert('Centang minimal satu pilihan "Dengan Hormat Harap" atau isi "Catatan".')
    return
  }

  const updatedDoc = await smStore.addDisposisi(doc.value.id, {
    olehId: auth.currentUser.id,
    olehNama: auth.currentUser.name,
    olehJabatan: auth.currentUser.jabatan || 'Pimpinan',
    sifatSurat: disposisiForm.value.sifatSurat,
    penerimaList: allRecipients,
    harapList: [...disposisiForm.value.harapList],
    harapCustom1: disposisiForm.value.harapCustom1.trim(),
    harapCustom2: disposisiForm.value.harapCustom2.trim(),
    catatan: disposisiForm.value.catatan.trim(),
    parafMode: disposisiForm.value.parafMode,
    parafDataUrl: disposisiForm.value.parafMode === 'canvas' ? disposisiForm.value.parafDataUrl : '',
    parafTanggal: disposisiForm.value.parafTanggal || formatShortSlashDate(),
  })

  showDisposisiModal.value = false

  if (disposisiForm.value.sendNotifNow && updatedDoc) {
    triggerDisposisiNotif(updatedDoc)
  }
}

// Tindak Lanjut state
const showSelesaiModal = ref(false)
const selesaiNote = ref('')

function submitSelesai() {
  if (!selesaiNote.value.trim()) {
    alert('Isi catatan tindak lanjut penyelesaian.')
    return
  }
  smStore.selesaikanSurat(doc.value.id, selesaiNote.value.trim(), auth.currentUser.id, auth.currentUser.name)
  showSelesaiModal.value = false
  selesaiNote.value = ''
}

function deleteDoc() {
  if (confirm('Apakah Anda yakin ingin menghapus surat masuk ini?')) {
    smStore.deleteSuratMasuk(doc.value.id)
    router.push('/surat-masuk')
  }
}

function printDisposisi() {
  window.print()
}
</script>

<template>
  <div class="space-y-5 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex flex-wrap items-center gap-3 print:hidden">
      <button class="btn-secondary btn-sm" @click="router.back()">Kembali</button>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900">
          {{ isCreateRoute ? 'Registrasi Surat Masuk Baru' : (isEditMode ? 'Edit Surat Masuk' : 'Detail Surat Masuk & Disposisi') }}
        </h1>
        <p v-if="!isCreateRoute && doc" class="text-sm text-gray-500 font-mono">
          {{ doc.nomorAgenda ? `Agenda: ${doc.nomorAgenda}` : doc.id }}
        </p>
      </div>
      <div v-if="!isCreateRoute && doc" class="flex flex-wrap items-center gap-2">
        <button v-if="doc.disposisi" class="btn-secondary btn-sm text-xs" @click="copyPublicDisposisiLink">
          {{ copiedPublicLink ? 'Link Disposisi Disalin!' : 'Salin Link Disposisi (Tanpa Login)' }}
        </button>
        <button v-if="doc.disposisi" class="btn-secondary btn-sm" @click="printDisposisi">
          Cetak Lembar Disposisi
        </button>
        <button v-if="isSuperAdmin && !isEditMode" class="btn-secondary btn-sm" @click="isEditMode = true">
          Edit Surat
        </button>
        <button v-if="isAdmin" class="btn-danger btn-sm" @click="deleteDoc">
          Hapus
        </button>
      </div>
    </div>

    <!-- ── Create / Edit Mode ────────────────────────────────────── -->
    <template v-if="isEditing">
      <div v-if="isTU || isSuperAdmin" class="card space-y-4 border-l-4 border-l-blue-500">
        <h2 class="font-semibold text-gray-800 border-b pb-2">
          {{ isCreateRoute ? 'Formulir Registrasi Surat Masuk' : 'Edit Surat Masuk' }}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="form-label">Surat Dari (Instansi / Pengirim) <span class="text-red-500">*</span></label>
            <input v-model="form.asalSurat" type="text" class="form-input" placeholder="Contoh: SMKN 1 Murung Pudak" />
          </div>
          <div>
            <label class="form-label">Nomor Surat (dari pengirim) <span class="text-red-500">*</span></label>
            <input v-model="form.nomorSuratAsal" type="text" class="form-input" placeholder="800.1.11.1/571/SMKN.1.MP/2026" />
          </div>
          <div>
            <label class="form-label">Tanggal Surat</label>
            <input v-model="form.tanggalSurat" type="date" class="form-input" />
          </div>
          <div>
            <label class="form-label">Diterima Tanggal</label>
            <input v-model="form.tanggalDiterima" type="date" class="form-input" />
          </div>
          <div>
            <label class="form-label">Nomor Agenda</label>
            <input v-model="form.nomorAgenda" type="text" class="form-input font-mono" placeholder="001/AGD-SM/XI/2026" />
          </div>
          <div>
            <label class="form-label">Sifat Surat</label>
            <div class="flex flex-wrap gap-3 pt-2">
              <label v-for="opt in SIFAT_SURAT_OPTIONS" :key="opt.key" class="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" v-model="form.sifatSurat" :value="opt.key" class="text-primary-600" />
                <span>{{ opt.label }}</span>
              </label>
            </div>
          </div>
          <div class="md:col-span-2">
            <label class="form-label">Tujuan Pimpinan (Untuk Mendisposisikan)</label>
            <select v-model="form.penerimaId" class="form-select">
              <option v-for="u in pimpinanList" :key="u.id" :value="u.id">
                {{ u.name }} ({{ u.jabatan }}) — {{ u.email }}
              </option>
            </select>
          </div>
          <div class="md:col-span-2">
            <label class="form-label">Upload File Surat Masuk (PDF) <span v-if="isCreateRoute" class="text-red-500">*</span></label>
            <input type="file" accept="application/pdf" @change="handleFileUpload" class="form-input" />
            <p v-if="form.fileName" class="text-xs text-green-600 mt-1">File terpilih: {{ form.fileName }}</p>
            <p v-else-if="!isCreateRoute && doc?.fileLampiran" class="text-xs text-blue-600 mt-1">File tersimpan: {{ doc.fileLampiran }}</p>
          </div>
          <div class="md:col-span-2">
            <label class="form-label">Perihal / Ringkasan Isi <span class="text-red-500">*</span></label>
            <textarea v-model="form.perihal" class="form-textarea" rows="3" placeholder="Permohonan Menjadi Dewan Juri Lomba..."></textarea>
          </div>
          <div v-if="isCreateRoute" class="md:col-span-2">
            <label class="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" v-model="form.sendNotifOnRegister" class="rounded text-primary-600" />
              <span>Kirim notifikasi otomatis ke <strong>Email & WA Pimpinan</strong> setelah surat diregistrasi</span>
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-gray-100">
          <button v-if="!isCreateRoute" class="btn-secondary" @click="isEditMode = false">Batal</button>
          <button class="btn-primary" @click="handleRegister">
            {{ isCreateRoute ? 'Simpan & Registrasi Surat Masuk' : 'Simpan Perubahan' }}
          </button>
        </div>
      </div>
      <div v-else class="card bg-red-50 text-red-700">
        Anda tidak memiliki akses untuk meregistrasi surat masuk.
      </div>
    </template>

    <!-- ── Detail Mode ─────────────────────────────────────────── -->
    <template v-else-if="doc">
      <!-- Status & Action Bar -->
      <div class="card flex flex-wrap justify-between items-center gap-3 bg-gray-50 print:hidden">
        <div class="flex items-center gap-3">
          <div>
            <p class="text-xs text-gray-500 mb-1">Status Dokumen</p>
            <StatusBadge
              :status="smStore.getStatusInfo(doc.status).color"
              :label="smStore.getStatusInfo(doc.status).label"
            />
          </div>
          <span
            class="px-2.5 py-1 rounded-full text-xs font-semibold border"
            :class="doc.sifatSurat === 'sangat_segera' ? 'bg-red-50 text-red-700 border-red-200' : doc.sifatSurat === 'rahasia' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'"
          >
            Sifat: {{ getSifatLabel(doc.sifatSurat) }}
          </span>
        </div>

        <div class="flex flex-wrap gap-2">
          <!-- Buat / Edit Lembar Disposisi -->
          <button
            v-if="isTujuanDisposisi && doc.status !== 'selesai'"
            class="btn-primary btn-sm"
            @click="openDisposisiModal"
          >
            {{ doc.disposisi ? 'Edit / Tambah Disposisi' : 'Buat Lembar Disposisi' }}
          </button>

          <!-- Tindak Lanjut Selesai -->
          <button
            v-if="doc.status === 'tindak_lanjut' && isPenerimaTindakLanjut"
            class="btn-primary btn-sm bg-green-600 hover:bg-green-700 border-none"
            @click="showSelesaiModal = true"
          >
            Tandai Selesai (Tindak Lanjut)
          </button>
        </div>
      </div>

      <!-- Panel Distribusi Notifikasi Email & WA -->
      <NotificationPanel
        :title="doc.disposisi ? 'Notifikasi Lembar Disposisi ke Pihak Tujuan (Email & WA)' : 'Notifikasi Surat Masuk ke Pimpinan (Email & WA)'"
        :recipients="activeNotifRecipients"
        :wa-text="activeWaText"
        :last-status="notifStatus"
        :is-sending="notifSending"
        @resend="handleResendNotif"
      />

      <!-- Lembar Disposisi Resmi UNIVSM (Tampil langsung di halaman, tanpa download PDF) -->
      <div v-if="doc.disposisi" class="space-y-2">
        <div class="flex items-center justify-between print:hidden">
          <h2 class="font-semibold text-gray-800 text-sm">Lembar Disposisi Resmi (Format Digital)</h2>
          <span class="text-xs text-gray-500">
            Dibuat oleh {{ doc.disposisi.olehNama }} &bull; {{ new Date(doc.disposisi.tanggal).toLocaleString('id-ID') }}
          </span>
        </div>
        <LembarDisposisiView :doc="doc" :disposisi="doc.disposisi" />
      </div>

      <!-- Tindak Lanjut Result -->
      <div v-if="doc.tindakLanjut" class="card bg-green-50 border border-green-200 print:hidden">
        <h2 class="font-semibold text-green-900 border-b border-green-200 pb-2 mb-3">Laporan Tindak Lanjut Selesai</h2>
        <div class="text-sm">
          <p class="text-green-800 text-xs mb-1">Catatan Penyelesaian:</p>
          <p class="bg-white p-3 rounded border border-green-200 font-medium whitespace-pre-line">{{ doc.tindakLanjut.catatan }}</p>
          <p class="text-green-700 text-xs mt-2 text-right">
            Diselesaikan {{ doc.tindakLanjut.olehNama ? `oleh ${doc.tindakLanjut.olehNama}` : '' }} pada: {{ new Date(doc.tindakLanjut.tanggal).toLocaleString('id-ID') }}
          </p>
        </div>
      </div>

      <!-- Detail Info & Preview Lampiran Surat Masuk -->
      <div class="card space-y-4 print:hidden">
        <h2 class="font-semibold text-gray-800 border-b pb-2">Informasi & Lampiran Surat Masuk</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
          <div>
            <p class="text-gray-500 text-xs">Surat Dari</p>
            <p class="font-bold text-gray-900">{{ doc.asalSurat }}</p>
          </div>
          <div>
            <p class="text-gray-500 text-xs">Nomor Surat Asal</p>
            <p class="font-mono">{{ doc.nomorSuratAsal }}</p>
          </div>
          <div>
            <p class="text-gray-500 text-xs">Tanggal Surat</p>
            <p>{{ formatIndonesianDate(doc.tanggalSurat) }}</p>
          </div>
          <div>
            <p class="text-gray-500 text-xs">Diterima Tanggal / No. Agenda</p>
            <p>{{ formatIndonesianDate(doc.tanggalDiterima || doc.createdAt) }} &bull; <span class="font-mono">{{ doc.nomorAgenda || '-' }}</span></p>
          </div>
          <div class="md:col-span-2">
            <p class="text-gray-500 text-xs">Perihal</p>
            <p class="font-medium bg-gray-50 p-3 rounded border border-gray-100 mt-1">{{ doc.perihal }}</p>
          </div>
        </div>

        <div v-if="previewUrl" class="w-full h-[600px] border border-gray-200 rounded-lg overflow-hidden">
          <iframe :src="previewUrl" class="w-full h-full border-0"></iframe>
        </div>
        <div v-else class="border-t border-gray-100 pt-4">
          <h3 class="font-semibold text-gray-800 text-sm mb-2">File Terlampir</h3>
          <div class="flex items-center gap-2 p-3 bg-gray-50 rounded border border-gray-200 w-max text-sm">
            <span class="text-primary-700 font-medium">{{ doc.fileName || doc.fileLampiran || 'surat_masuk.pdf' }}</span>
            <span class="text-xs text-gray-400">(Preview belum tersedia)</span>
          </div>
        </div>
      </div>
    </template>

    <div v-else class="card text-center py-12 text-gray-400">
      Surat Masuk tidak ditemukan.
    </div>

    <!-- ── Modals ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <!-- Modal Lembar Disposisi UNIVSM -->
      <div v-if="showDisposisiModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-6 space-y-5">
          <div class="flex items-start justify-between border-b pb-3">
            <div>
              <h3 class="font-bold text-gray-900 text-lg">Formulir Lembar Disposisi UNIVSM</h3>
              <p class="text-xs text-gray-500 mt-0.5">
                Isi disposisi sesuai format resmi. Setelah dikirim, seluruh penerima langsung menerima notifikasi Email & WA tanpa perlu cetak PDF.
              </p>
            </div>
            <button type="button" class="text-gray-400 hover:text-gray-700 text-xl leading-none" @click="showDisposisiModal = false">&times;</button>
          </div>

          <!-- Sifat Surat -->
          <div>
            <label class="form-label">Sifat Surat</label>
            <div class="flex flex-wrap gap-4 pt-1">
              <label v-for="opt in SIFAT_SURAT_OPTIONS" :key="opt.key" class="inline-flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" v-model="disposisiForm.sifatSurat" :value="opt.key" class="text-primary-600" />
                <span class="font-medium">{{ opt.label }}</span>
              </label>
            </div>
          </div>

          <!-- Grid 2 kolom: Diteruskan Kepada & Dengan Hormat Harap -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <!-- Diteruskan Kepada (Multi-select) -->
            <div class="space-y-2">
              <label class="form-label">Diteruskan Kepada (Bisa Pilih Lebih Dari 1)</label>
              <div class="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                <label
                  v-for="u in auth.users"
                  :key="u.id"
                  class="flex items-start gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer text-xs"
                >
                  <input
                    type="checkbox"
                    :checked="disposisiForm.selectedUserIds.includes(u.id)"
                    @change="toggleRecipientUser(u.id)"
                    class="mt-0.5 rounded text-primary-600"
                  />
                  <div>
                    <p class="font-semibold text-gray-900">{{ u.jabatan || u.name }}</p>
                    <p class="text-gray-500">{{ u.name }} &bull; {{ u.phone || u.email }}</p>
                  </div>
                </label>
              </div>

              <!-- Tambah / Edit penerima manual / eksternal (misal Ketua LPPM / Ybs / Unit lain) -->
              <div class="bg-gray-50 p-2.5 rounded-lg border border-gray-200 space-y-2">
                <p class="text-[11px] font-semibold text-gray-600">
                  {{ editingCustomIdx >= 0 ? 'Edit Penerima Disposisi' : 'Tambah Penerima Tambahan (Opsional)' }}
                </p>
                <div class="grid grid-cols-2 gap-1.5">
                  <input v-model="newCustom.jabatan" type="text" class="form-input text-xs py-1" placeholder="Jabatan (mis. Ketua LPPM)" />
                  <input v-model="newCustom.nama" type="text" class="form-input text-xs py-1" placeholder="Nama / Ybs *" />
                  <input v-model="newCustom.email" type="email" class="form-input text-xs py-1" placeholder="Email (opsional)" />
                  <input v-model="newCustom.phone" type="text" class="form-input text-xs py-1" placeholder="No. WA (opsional)" />
                </div>
                <div class="flex gap-1.5">
                  <button type="button" @click="addCustomRecipient" class="btn-secondary btn-sm flex-1 text-xs">
                    {{ editingCustomIdx >= 0 ? 'Simpan Perubahan Penerima' : '+ Tambahkan ke Daftar Tujuan' }}
                  </button>
                  <button v-if="editingCustomIdx >= 0" type="button" @click="cancelEditCustomRecipient" class="btn-secondary btn-sm text-xs">
                    Batal
                  </button>
                </div>
                <div v-if="disposisiForm.customRecipients.length" class="space-y-1 pt-1">
                  <div
                    v-for="(c, idx) in disposisiForm.customRecipients"
                    :key="idx"
                    class="flex items-center justify-between gap-2 bg-white px-2 py-1.5 rounded border text-xs"
                    :class="editingCustomIdx === idx ? 'border-amber-400 bg-amber-50' : ''"
                  >
                    <div class="min-w-0">
                      <p class="font-medium text-gray-900 truncate">{{ c.jabatan ? `${c.jabatan} (${c.nama})` : c.nama }}</p>
                      <p class="text-[10px] text-gray-500 truncate">
                        {{ c.email || 'Email: -' }} &bull; {{ c.phone || 'WA: -' }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <button type="button" class="text-amber-600 hover:underline font-medium" @click="editCustomRecipient(idx)">Edit</button>
                      <button type="button" class="text-red-600 hover:underline font-medium" @click="removeCustomRecipient(idx)">Hapus</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Dengan Hormat Harap -->
            <div class="space-y-3">
              <label class="form-label">Dengan Hormat Harap</label>
              <div class="space-y-2 border border-gray-200 rounded-lg p-3 bg-gray-50/50">
                <label
                  v-for="item in DISPOSISI_HARAP_DEFAULTS"
                  :key="item"
                  class="flex items-center gap-2.5 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="disposisiForm.harapList.includes(item)"
                    @change="toggleHarap(item)"
                    class="rounded text-primary-600"
                  />
                  <span>{{ item }}</span>
                </label>

                <div class="pt-2 space-y-2 border-t border-gray-200">
                  <input
                    v-model="disposisiForm.harapCustom1"
                    type="text"
                    class="form-input text-xs"
                    placeholder="Instruksi tambahan 1 (opsional)..."
                  />
                  <input
                    v-model="disposisiForm.harapCustom2"
                    type="text"
                    class="form-input text-xs"
                    placeholder="Instruksi tambahan 2 (opsional)..."
                  />
                </div>
              </div>

              <!-- Tanggal Paraf -->
              <div>
                <label class="form-label">Tanggal Paraf Disposisi</label>
                <input v-model="disposisiForm.parafTanggal" type="text" class="form-input text-sm font-mono" placeholder="DD/MM/YYYY" />
              </div>
            </div>
          </div>

          <!-- Catatan -->
          <div>
            <label class="form-label">Catatan Pimpinan</label>
            <textarea
              v-model="disposisiForm.catatan"
              class="form-textarea text-sm"
              rows="4"
              placeholder="Kepada Yth. Pihak terkait :&#10;1. Siapkan surat tugas dan arsipkan&#10;2. Agar melaksanakan kegiatan dengan sebagaimana mestinya..."
            ></textarea>
          </div>

          <!-- Paraf Digital (Tanpa File) -->
          <div>
            <label class="form-label">Paraf Pimpinan (Tanpa Upload File)</label>
            <ParafPad
              v-model="disposisiForm.parafDataUrl"
              v-model:mode="disposisiForm.parafMode"
              :user-key="auth.currentUser?.id || 'default'"
              :signer-name="auth.currentUser?.name || 'Pimpinan'"
            />
          </div>

          <!-- Opsi Kirim Notif -->
          <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <label class="inline-flex items-center gap-2 text-sm text-emerald-950 cursor-pointer">
              <input type="checkbox" v-model="disposisiForm.sendNotifNow" class="rounded text-emerald-600" />
              <span><strong>Langsung teruskan via Email & WhatsApp</strong> ke semua penerima disposisi begitu disimpan</span>
            </label>
          </div>

          <div class="flex justify-end gap-3 pt-2 border-t">
            <button type="button" class="btn-secondary" @click="showDisposisiModal = false">Batal</button>
            <button type="button" class="btn-primary" @click="submitDisposisi">
              Simpan & Teruskan Disposisi
            </button>
          </div>
        </div>
      </div>

      <!-- Modal Tindak Lanjut / Selesai -->
      <div v-if="showSelesaiModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <h3 class="font-bold text-green-700 text-lg">Selesaikan Tindak Lanjut</h3>
          <p class="text-sm text-gray-600">Catat hasil tindak lanjut instruksi disposisi sebelum mengarsipkan surat ini.</p>

          <div>
            <label class="form-label">Catatan Penyelesaian</label>
            <textarea v-model="selesaiNote" class="form-textarea" rows="3" placeholder="Contoh: Surat tugas sudah dibuat dan kegiatan telah dilaksanakan..."></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button class="btn-secondary" @click="showSelesaiModal = false">Batal</button>
            <button class="btn-primary bg-green-600 border-none hover:bg-green-700" @click="submitSelesai">Arsipkan Surat</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
