<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useSuratMasukStore } from '../../stores/suratMasuk.js'
import LembarDisposisiView from '../../components/common/LembarDisposisiView.vue'
import StatusBadge from '../../components/common/StatusBadge.vue'
import { formatIndonesianDate, getSifatLabel } from '../../composables/useNotification.js'

const route = useRoute()
const smStore = useSuratMasukStore()

const docId = computed(() => route.params.id)
const tokenParam = computed(() => String(route.query.t || '').trim())

const isLoading = ref(true)
const loadError = ref('')

// Form tindak lanjut tanpa login
const pelaporNama = ref('')
const catatanSelesai = ref('')
const isSubmitting = ref(false)
const submitSuccess = ref(false)

onMounted(async () => {
  isLoading.value = true
  try {
    await smStore.fetchSuratMasuk()
    // Pre-fill nama pelapor jika penerima disposisi hanya 1 orang
    const found = smStore.documents.find(d => d.id === docId.value)
    if (found?.disposisi?.penerimaList?.length === 1) {
      const p = found.disposisi.penerimaList[0]
      pelaporNama.value = p.jabatan ? `${p.nama} (${p.jabatan})` : p.nama
    }
  } catch (e) {
    loadError.value = 'Gagal memuat data disposisi dari server.'
  } finally {
    isLoading.value = false
  }
})

const doc = computed(() => smStore.documents.find(d => d.id === docId.value))

const isAuthorized = computed(() => {
  if (!doc.value) return false
  // Jika dokumen memiliki shareToken, cocokkan dengan query ?t=
  if (doc.value.shareToken) {
    return tokenParam.value === doc.value.shareToken
  }
  // Kompatibilitas mundur untuk dokumen lama sebelum fitur token
  return true
})

const recipientOptions = computed(() => {
  if (!doc.value?.disposisi) return []
  if (Array.isArray(doc.value.disposisi.penerimaList) && doc.value.disposisi.penerimaList.length > 0) {
    return doc.value.disposisi.penerimaList.map(p =>
      p.jabatan ? `${p.nama} (${p.jabatan})` : p.nama
    )
  }
  return doc.value.disposisi.kepadaNama ? [doc.value.disposisi.kepadaNama] : []
})

const previewUrl = computed(() => {
  if (doc.value?.driveViewUrl) return doc.value.driveViewUrl
  if (doc.value?.fileBase64) return `data:${doc.value.fileMime || 'application/pdf'};base64,${doc.value.fileBase64}`
  return null
})

async function handleSubmitTindakLanjut() {
  if (!pelaporNama.value.trim()) {
    alert('Harap pilih atau isi nama Anda sebagai pelapor tindak lanjut.')
    return
  }
  if (!catatanSelesai.value.trim()) {
    alert('Harap isi catatan hasil tindak lanjut disposisi.')
    return
  }
  isSubmitting.value = true
  try {
    await smStore.selesaikanSurat(doc.value.id, catatanSelesai.value.trim(), null, pelaporNama.value.trim())
    submitSuccess.value = true
    catatanSelesai.value = ''
  } finally {
    isSubmitting.value = false
  }
}

function handlePrint() {
  window.print()
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-6 px-3 sm:px-6 print:bg-white print:p-0">
    <div class="max-w-4xl mx-auto space-y-5">
      <!-- Top Bar (Tanpa Login) -->
      <div class="bg-primary-900 text-white rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm print:hidden">
        <div class="flex items-center gap-3">
          <img src="/logo.png" alt="Logo UNIVSM" class="w-10 h-10 rounded-full bg-white p-0.5 object-contain shrink-0" />
          <div>
            <p class="font-bold text-sm leading-tight">E-Office Universitas Sapta Mandiri</p>
            <p class="text-xs text-primary-200">Akses Penerima Disposisi (Tanpa Login)</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="doc && isAuthorized && doc.disposisi" class="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors" @click="handlePrint">
            Cetak Lembar Disposisi
          </button>
          <RouterLink to="/login" class="px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-primary-950 text-xs font-bold transition-colors">
            Masuk E-Office
          </RouterLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="card text-center py-14 space-y-2">
        <div class="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-sm text-gray-500">Memuat Lembar Disposisi dari server...</p>
      </div>

      <!-- Error / Tidak Ditemukan / Token Salah -->
      <div v-else-if="loadError || !doc" class="card text-center py-12 space-y-3">
        <p class="text-lg font-bold text-gray-800">Disposisi Tidak Ditemukan</p>
        <p class="text-sm text-gray-500">{{ loadError || 'Dokumen mungkin telah dihapus atau tautan tidak lengkap.' }}</p>
      </div>

      <div v-else-if="!isAuthorized" class="card text-center py-12 space-y-3 border-l-4 border-l-red-500">
        <p class="text-lg font-bold text-red-700">Akses Tautan Tidak Valid</p>
        <p class="text-sm text-gray-600">
          Token keamanan disposisi tidak cocok. Pastikan Anda membuka tautan lengkap langsung dari Email atau WhatsApp resmi E-Office UNIVSM.
        </p>
      </div>

      <!-- Konten Disposisi Valid -->
      <template v-else>
        <!-- Ringkasan Status -->
        <div class="card flex flex-wrap items-center justify-between gap-3 bg-white print:hidden">
          <div class="flex flex-wrap items-center gap-3">
            <div>
              <p class="text-xs text-gray-500 mb-1">Status Disposisi</p>
              <StatusBadge
                :status="smStore.getStatusInfo(doc.status).color"
                :label="smStore.getStatusInfo(doc.status).label"
              />
            </div>
            <span
              class="px-2.5 py-1 rounded-full text-xs font-semibold border"
              :class="doc.sifatSurat === 'sangat_segera' ? 'bg-red-50 text-red-700 border-red-200' : doc.sifatSurat === 'rahasia' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'"
            >
              Sifat: {{ getSifatLabel(doc.disposisi?.sifatSurat || doc.sifatSurat) }}
            </span>
          </div>
          <div class="text-xs text-gray-500 font-mono">
            Agenda: {{ doc.nomorAgenda || doc.id }}
          </div>
        </div>

        <!-- Lembar Disposisi Resmi UNIVSM -->
        <LembarDisposisiView v-if="doc.disposisi" :doc="doc" :disposisi="doc.disposisi" />

        <div v-else class="card bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          Surat masuk ini tercatat pada {{ formatIndonesianDate(doc.tanggalDiterima || doc.createdAt) }} dan saat ini masih menunggu lembar disposisi dari pimpinan.
        </div>

        <!-- Form Laporan Tindak Lanjut Selesai (Tanpa Login) -->
        <div v-if="doc.status === 'tindak_lanjut' && doc.disposisi" class="card border-l-4 border-l-emerald-600 space-y-4 print:hidden">
          <div>
            <h2 class="font-bold text-emerald-900 text-base">Laporkan Tindak Lanjut Selesai (Tanpa Login)</h2>
            <p class="text-xs text-gray-600 mt-0.5">
              Setelah melaksanakan arahan pimpinan di atas, Anda dapat langsung melaporkan penyelesaian di sini agar status surat tercatat selesai di sistem E-Office.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-if="recipientOptions.length > 0">
              <label class="form-label">Pilih Nama Penerima Disposisi</label>
              <select
                class="form-select text-sm"
                @change="pelaporNama = $event.target.value || pelaporNama"
              >
                <option value="">-- Pilih dari daftar tujuan --</option>
                <option v-for="opt in recipientOptions" :key="opt" :value="opt">{{ opt }}</option>
              </select>
            </div>
            <div :class="recipientOptions.length === 0 ? 'md:col-span-2' : ''">
              <label class="form-label">Nama & Jabatan Pelapor <span class="text-red-500">*</span></label>
              <input v-model="pelaporNama" type="text" class="form-input text-sm" placeholder="Contoh: Dr. Ahmad (Ketua LPPM)" />
            </div>
            <div class="md:col-span-2">
              <label class="form-label">Catatan Hasil Tindak Lanjut <span class="text-red-500">*</span></label>
              <textarea
                v-model="catatanSelesai"
                rows="3"
                class="form-textarea text-sm"
                placeholder="Contoh: Surat tugas telah disiapkan, kegiatan telah dilaksanakan dengan baik, dan laporan kegiatan sudah diarsipkan."
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              class="btn-primary bg-emerald-600 hover:bg-emerald-700 border-none"
              :disabled="isSubmitting"
              @click="handleSubmitTindakLanjut"
            >
              {{ isSubmitting ? 'Menyimpan Laporan...' : 'Kirim Laporan & Tandai Selesai' }}
            </button>
          </div>
        </div>

        <!-- Hasil Tindak Lanjut Selesai -->
        <div v-if="doc.tindakLanjut" class="card bg-green-50 border border-green-200 print:hidden">
          <div class="flex items-center justify-between border-b border-green-200 pb-2 mb-3">
            <h2 class="font-bold text-green-900 text-sm">Laporan Tindak Lanjut Selesai</h2>
            <span v-if="submitSuccess" class="text-xs font-semibold text-green-800 bg-green-200 px-2 py-0.5 rounded-full">
              Berhasil Dilaporkan!
            </span>
          </div>
          <p class="bg-white p-3 rounded border border-green-200 text-sm font-medium whitespace-pre-line">
            {{ doc.tindakLanjut.catatan }}
          </p>
          <p class="text-green-700 text-xs mt-2 text-right">
            Dilaporkan {{ doc.tindakLanjut.olehNama ? `oleh ${doc.tindakLanjut.olehNama}` : '' }} pada {{ new Date(doc.tindakLanjut.tanggal).toLocaleString('id-ID') }}
          </p>
        </div>

        <!-- Lampiran File Surat Masuk -->
        <div class="card space-y-3 print:hidden">
          <div class="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
            <div>
              <h2 class="font-semibold text-gray-800 text-sm">Lampiran Surat Masuk Asli</h2>
              <p class="text-xs text-gray-500">{{ doc.asalSurat }} &bull; {{ doc.nomorSuratAsal }}</p>
            </div>
            <a
              v-if="doc.driveViewUrl"
              :href="doc.driveViewUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-secondary btn-sm text-xs"
            >
              Buka di Tab Baru
            </a>
          </div>
          <div v-if="previewUrl" class="w-full h-[650px] border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
            <iframe :src="previewUrl" class="w-full h-full border-0"></iframe>
          </div>
          <p v-else class="text-xs text-gray-500 italic py-4">
            Lampiran PDF belum tersedia untuk preview.
          </p>
        </div>
      </template>
    </div>
  </div>
</template>
