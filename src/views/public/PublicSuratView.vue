<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useDocumentsStore } from '../../stores/documents.js'
import DocumentKop from '../../components/common/DocumentKop.vue'
import TteBlock from '../../components/common/TteBlock.vue'

const route = useRoute()
const docStore = useDocumentsStore()

const docId = computed(() => route.params.id)
const tokenParam = computed(() => String(route.query.t || '').trim())
const isVerifyRoute = computed(() => route.name === 'VerifySurat')

const isLoading = ref(true)
const loadError = ref('')

onMounted(async () => {
  isLoading.value = true
  try {
    await docStore.fetchDocuments()
  } catch (e) {
    loadError.value = 'Gagal memuat dokumen dari server.'
  } finally {
    isLoading.value = false
  }
})

const doc = computed(() => docStore.documents.find(d => d.id === docId.value))

const isAuthorized = computed(() => {
  if (!doc.value) return false
  // Dokumen publik hanya boleh diakses jika sudah selesai / disahkan
  if (doc.value.status !== 'selesai') return false
  // Jika lewat scan QR /verify/:id, dokumen yang sudah disahkan boleh diverifikasi publik
  if (isVerifyRoute.value) return true
  // Jika lewat tautan penerima /surat/:id, cek token jika ada
  if (doc.value.shareToken) return tokenParam.value === doc.value.shareToken
  return true
})

const fileUrl = computed(() => {
  if (doc.value?.driveViewUrl) return doc.value.driveViewUrl
  if (doc.value?.fileBase64) return `data:${doc.value.fileMime || 'application/pdf'};base64,${doc.value.fileBase64}`
  return null
})

const tteMethodLabel = computed(() => {
  const m = doc.value?.tteMethod || doc.value?.tte?.method
  if (m === 'bsre_api') return 'Tanda Tangan Elektronik Tersertifikasi API BSrE (BSSN)'
  if (m === 'bsre_external') return 'Tanda Tangan Elektronik BSrE Digital (Tersertifikasi)'
  if (m === 'bsre_qr' || m === 'bsre') return 'Tanda Tangan Elektronik Barcode / QR Verifikasi UNIVSM'
  if (m === 'basah') return 'Tanda Tangan Basah Resmi'
  return 'Dokumen Resmi Universitas Sapta Mandiri'
})

function handlePrint() {
  if (fileUrl.value && (doc.value?.isManual || doc.value?.tteMethod === 'bsre_external' || doc.value?.tteMethod === 'bsre_api')) {
    window.open(fileUrl.value, '_blank', 'noopener,noreferrer')
  } else {
    window.print()
  }
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 py-6 px-3 sm:px-6 print:bg-white print:p-0">
    <div class="max-w-4xl mx-auto space-y-5">
      <!-- Header -->
      <div class="bg-primary-900 text-white rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-3 shadow-sm print:hidden">
        <div class="flex items-center gap-3">
          <img src="/logo.png" alt="Logo UNIVSM" class="w-10 h-10 rounded-full bg-white p-0.5 object-contain shrink-0" />
          <div>
            <p class="font-bold text-sm leading-tight">E-Office Universitas Sapta Mandiri</p>
            <p class="text-xs text-primary-200">
              {{ isVerifyRoute ? 'Verifikasi Keaslian Tanda Tangan Elektronik (TTE)' : 'Portal Penerima Surat Resmi (Tanpa Login)' }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <a
            v-if="doc && isAuthorized && doc.driveDownloadUrl"
            :href="doc.driveDownloadUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
          >
            Unduh PDF Resmi
          </a>
          <button
            v-if="doc && isAuthorized"
            class="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors"
            @click="handlePrint"
          >
            Cetak / Buka PDF
          </button>
          <RouterLink to="/login" class="px-3 py-1.5 rounded-lg bg-gold-500 hover:bg-gold-600 text-primary-950 text-xs font-bold transition-colors">
            Masuk E-Office
          </RouterLink>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="card text-center py-14 space-y-2">
        <div class="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-sm text-gray-500">Memverifikasi keaslian dokumen di server UNIVSM...</p>
      </div>

      <!-- Not Found / Not Signed -->
      <div v-else-if="loadError || !doc" class="card text-center py-12 space-y-2">
        <p class="text-lg font-bold text-gray-800">Dokumen Tidak Ditemukan</p>
        <p class="text-sm text-gray-500">{{ loadError || 'Nomor/ID dokumen tidak terdaftar di sistem E-Office Universitas Sapta Mandiri.' }}</p>
      </div>

      <div v-else-if="doc.status !== 'selesai'" class="card text-center py-12 space-y-2 border-l-4 border-l-amber-500">
        <p class="text-lg font-bold text-amber-800">Dokumen Belum Disahkan</p>
        <p class="text-sm text-gray-600">
          Dokumen ini masih dalam proses internal dan belum memiliki pengesahan/tanda tangan resmi pimpinan.
        </p>
      </div>

      <div v-else-if="!isAuthorized" class="card text-center py-12 space-y-2 border-l-4 border-l-red-500">
        <p class="text-lg font-bold text-red-700">Tautan Surat Tidak Valid</p>
        <p class="text-sm text-gray-600">Pastikan Anda membuka tautan lengkap dari Email atau WhatsApp resmi Universitas Sapta Mandiri.</p>
      </div>

      <!-- Dokumen Resmi Terverifikasi -->
      <template v-else>
        <!-- Banner Verifikasi Keaslian -->
        <div class="card bg-emerald-50 border border-emerald-300 space-y-3 print:hidden">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
              ✓
            </div>
            <div class="flex-1">
              <p class="font-bold text-emerald-950 text-base">DOKUMEN RESMI TERVERIFIKASI</p>
              <p class="text-xs text-emerald-800 mt-0.5">{{ tteMethodLabel }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-lg border border-emerald-200">
            <div>
              <span class="text-gray-500">Nomor Surat:</span>
              <p class="font-mono font-bold text-gray-900">{{ doc.nomorSurat || doc.id }}</p>
            </div>
            <div>
              <span class="text-gray-500">Perihal / Judul:</span>
              <p class="font-semibold text-gray-900">{{ doc.perihal || doc.judul }}</p>
            </div>
            <div>
              <span class="text-gray-500">Penandatangan:</span>
              <p class="font-semibold text-gray-900">
                {{ doc.tte?.signer?.nama || '-' }}
                <span v-if="doc.tte?.signer?.jabatan" class="font-normal text-gray-600">({{ doc.tte.signer.jabatan }})</span>
              </p>
            </div>
            <div>
              <span class="text-gray-500">Tanggal Pengesahan / NIK:</span>
              <p class="font-medium text-gray-900">
                {{ doc.tte?.tanggal || '-' }}
                <span v-if="doc.tte?.signer?.nik"> &bull; NIK. {{ doc.tte.signer.nik }}</span>
              </p>
            </div>
          </div>
        </div>

        <!-- Isi Surat / Preview PDF -->
        <div class="card bg-white print:shadow-none print:border-0">
          <div v-if="fileUrl && (doc.isManual || doc.tteMethod === 'bsre_external' || doc.tteMethod === 'bsre_api')" class="w-full h-[800px]">
            <iframe :src="fileUrl" class="w-full h-full border-0"></iframe>
          </div>
          <div v-else>
            <DocumentKop :unit-id="doc.unitId" :is-internal="doc.sifatTujuan === 'internal'" />
            <div class="mt-4 mb-6 text-sm space-y-1">
              <div class="flex gap-2">
                <span class="w-36 text-gray-600">Nomor</span>
                <span class="font-semibold">: {{ doc.nomorSurat || doc.id }}</span>
              </div>
              <div class="flex gap-2">
                <span class="w-36 text-gray-600">Lampiran</span>
                <span>: {{ doc.lampiran || '-' }}</span>
              </div>
              <div class="flex gap-2">
                <span class="w-36 text-gray-600">Perihal</span>
                <span class="font-semibold">: {{ doc.perihal || doc.judul }}</span>
              </div>
            </div>
            <div class="mb-6 text-sm">
              <p>Kepada Yth.</p>
              <p class="font-semibold whitespace-pre-line ml-2">{{ doc.kepada }}</p>
              <p class="ml-2">di Tempat</p>
            </div>
            <div class="mb-4 text-sm leading-relaxed">
              <p class="mb-2">Dengan hormat,</p>
              <p class="whitespace-pre-line text-justify">{{ doc.isiSurat }}</p>
            </div>
            <p class="text-sm mt-6">Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.</p>
            <TteBlock
              v-if="doc.tte"
              :tte="doc.tte"
              :method="doc.tteMethod || 'bsre_qr'"
              :doc-id="doc.id"
            />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
