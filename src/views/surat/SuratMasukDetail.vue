<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'
import { useSuratMasukStore } from '../../stores/suratMasuk.js'
import StatusBadge from '../../components/common/StatusBadge.vue'

const props = defineProps({
  id:   { type: String, default: '' },
  mode: { type: String, default: 'view' },
})

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const smStore = useSuratMasukStore()

const isCreateRoute = computed(() => props.mode === 'create' || route.name === 'SuratMasukBuat')
const doc = computed(() => smStore.documents.find(d => d.id === props.id))

// Form for registering new mail
const form = ref({
  asalSurat: '',
  nomorSuratAsal: '',
  tanggalSurat: '',
  perihal: '',
  penerimaId: 1, // Usually directed to Rektor first
})

// RBAC
const isAdmin = computed(() => auth.isAdmin)
const isTU = computed(() => auth.isAdmin || auth.isUnitAdmin || auth.currentUser?.unitId === 'tu')
const isTujuanDisposisi = computed(() => doc.value?.penerimaId === auth.currentUser?.id || isAdmin.value)
const isPenerimaTindakLanjut = computed(() => doc.value?.disposisi?.kepadaId === auth.currentUser?.id || isAdmin.value)

// Potential recipients of disposition
const pimpinanList = computed(() => auth.users.filter(u => ['rektor', 'warek', 'dekan', 'wakil_dekan', 'kabag'].includes(u.sppdRole)))

function handleRegister() {
  if (!form.value.asalSurat || !form.value.nomorSuratAsal || !form.value.perihal) {
    alert('Harap lengkapi Asal Surat, Nomor, dan Perihal.')
    return
  }
  const newDoc = smStore.createSuratMasuk({ ...form.value })
  router.push(`/surat-masuk/${newDoc.id}`)
}

// Disposisi state
const showDisposisiModal = ref(false)
const disposisiForm = ref({ kepadaId: '', instruksi: '' })

function submitDisposisi() {
  if (!disposisiForm.value.kepadaId || !disposisiForm.value.instruksi) {
    alert('Pilih tujuan disposisi dan isi instruksi.')
    return
  }
  const targetUser = auth.users.find(u => u.id === disposisiForm.value.kepadaId)
  smStore.addDisposisi(doc.value.id, {
    olehId: auth.currentUser.id,
    olehNama: auth.currentUser.name,
    kepadaId: targetUser.id,
    kepadaNama: targetUser.name,
    instruksi: disposisiForm.value.instruksi
  })
  showDisposisiModal.value = false
}

// Tindak Lanjut state
const showSelesaiModal = ref(false)
const selesaiNote = ref('')

function submitSelesai() {
  if (!selesaiNote.value) {
    alert('Isi catatan tindak lanjut penyelesaian.')
    return
  }
  smStore.selesaikanSurat(doc.value.id, selesaiNote.value, auth.currentUser.id)
  showSelesaiModal.value = false
}

function deleteDoc() {
  if (confirm('Apakah Anda yakin ingin menghapus surat masuk ini?')) {
    smStore.deleteSuratMasuk(doc.value.id)
    router.push('/surat-masuk')
  }
}
</script>

<template>
  <div class="space-y-5 max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button class="btn-secondary btn-sm" @click="router.back()">Kembali</button>
      <button v-if="!isCreateRoute && isAdmin" class="btn-danger btn-sm" @click="deleteDoc">Hapus Surat</button>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900">
          {{ isCreateRoute ? 'Registrasi Surat Masuk Baru' : 'Detail Surat Masuk' }}
        </h1>
        <p v-if="!isCreateRoute && doc" class="text-sm text-gray-500 font-mono">{{ doc.id }}</p>
      </div>
    </div>

    <!-- ── Create Mode ─────────────────────────────────────────── -->
    <template v-if="isCreateRoute">
      <div v-if="isTU" class="card space-y-4 border-l-4 border-l-blue-500">
        <h2 class="font-semibold text-gray-800 border-b pb-2">Formulir Registrasi Surat Masuk</h2>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="form-label">Instansi / Asal Surat <span class="text-red-500">*</span></label>
            <input v-model="form.asalSurat" type="text" class="form-input" placeholder="Contoh: Kemendikbud Ristek" />
          </div>
          <div>
            <label class="form-label">Nomor Surat (dari pengirim) <span class="text-red-500">*</span></label>
            <input v-model="form.nomorSuratAsal" type="text" class="form-input" />
          </div>
          <div>
            <label class="form-label">Tanggal Surat</label>
            <input v-model="form.tanggalSurat" type="date" class="form-input" />
          </div>
          <div>
            <label class="form-label">Tujuan Utama (Disposisi Ke)</label>
            <select v-model="form.penerimaId" class="form-select">
              <option v-for="u in pimpinanList" :key="u.id" :value="u.id">{{ u.name }} ({{ u.jabatan }})</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="form-label">Perihal / Ringkasan Isi <span class="text-red-500">*</span></label>
            <textarea v-model="form.perihal" class="form-textarea" rows="3" placeholder="Ringkasan isi surat masuk..."></textarea>
          </div>
        </div>

        <div class="flex justify-end pt-4">
          <button class="btn-primary" @click="handleRegister">💾 Simpan & Registrasi Surat</button>
        </div>
      </div>
      <div v-else class="card bg-red-50 text-red-700">
        Anda tidak memiliki akses untuk meregistrasi surat masuk. Hubungi Bagian Tata Usaha.
      </div>
    </template>

    <!-- ── Detail Mode ─────────────────────────────────────────── -->
    <template v-else-if="doc">
      <!-- Status Box -->
      <div class="card flex justify-between items-center bg-gray-50">
        <div>
          <p class="text-xs text-gray-500 mb-1">Status Dokumen</p>
          <StatusBadge
            :status="smStore.getStatusInfo(doc.status).color"
            :label="smStore.getStatusInfo(doc.status).label"
          />
        </div>
        <div class="flex gap-2">
          <!-- Action: Rektor makes disposition -->
          <button v-if="doc.status === 'disposisi' && isTujuanDisposisi" class="btn-primary" @click="showDisposisiModal = true">
            ✍️ Buat Lembar Disposisi
          </button>
          
          <!-- Action: Assignee finishes the task -->
          <button v-if="doc.status === 'tindak_lanjut' && isPenerimaTindakLanjut" class="btn-primary bg-green-600 hover:bg-green-700 border-none" @click="showSelesaiModal = true">
            ✅ Tandai Selesai (Tindak Lanjut)
          </button>
        </div>
      </div>

      <!-- Detail Info -->
      <div class="card space-y-4">
        <h2 class="font-semibold text-gray-800 border-b pb-2">Informasi Surat Masuk</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 text-sm">
          <div>
            <p class="text-gray-500 text-xs">Asal Instansi</p>
            <p class="font-bold text-gray-900">{{ doc.asalSurat }}</p>
          </div>
          <div>
            <p class="text-gray-500 text-xs">Nomor Surat Asal</p>
            <p class="font-mono">{{ doc.nomorSuratAsal }}</p>
          </div>
          <div>
            <p class="text-gray-500 text-xs">Tanggal Surat</p>
            <p>{{ new Date(doc.tanggalSurat).toLocaleDateString('id-ID', { dateStyle: 'long' }) }}</p>
          </div>
          <div>
            <p class="text-gray-500 text-xs">Di-registrasi Pada</p>
            <p>{{ new Date(doc.createdAt).toLocaleDateString('id-ID', { dateStyle: 'long' }) }}</p>
          </div>
          <div class="md:col-span-2">
            <p class="text-gray-500 text-xs">Perihal</p>
            <p class="font-medium bg-gray-50 p-3 rounded border border-gray-100 mt-1">{{ doc.perihal }}</p>
          </div>
          <div class="md:col-span-2">
            <p class="text-gray-500 text-xs">File Scan / Lampiran</p>
            <div class="mt-1 flex items-center gap-2">
              <span class="text-primary-600 hover:underline cursor-pointer flex items-center gap-1">
                📄 {{ doc.fileLampiran || 'surat_scan.pdf' }}
              </span>
              <span class="text-xs text-gray-400">(Tampilan Preview Belum Tersedia)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Disposisi History -->
      <div v-if="doc.disposisi" class="card bg-yellow-50 border border-yellow-200">
        <h2 class="font-semibold text-yellow-900 border-b border-yellow-200 pb-2 mb-3">Lembar Disposisi Pimpinan</h2>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between">
            <span class="text-yellow-800">Dari: <strong>{{ doc.disposisi.olehNama }}</strong></span>
            <span class="text-yellow-600 text-xs">{{ new Date(doc.disposisi.tanggal).toLocaleString('id-ID') }}</span>
          </div>
          <div>
            <span class="text-yellow-800">Diteruskan Kepada: <strong>{{ doc.disposisi.kepadaNama }}</strong></span>
          </div>
          <div>
            <p class="text-yellow-800 text-xs mb-1">Instruksi Pimpinan:</p>
            <p class="bg-white p-3 rounded border border-yellow-200 font-medium whitespace-pre-line">{{ doc.disposisi.instruksi }}</p>
          </div>
        </div>
      </div>

      <!-- Tindak Lanjut Result -->
      <div v-if="doc.tindakLanjut" class="card bg-green-50 border border-green-200">
        <h2 class="font-semibold text-green-900 border-b border-green-200 pb-2 mb-3">Laporan Tindak Lanjut Selesai</h2>
        <div class="text-sm">
          <p class="text-green-800 text-xs mb-1">Catatan Penyelesaian:</p>
          <p class="bg-white p-3 rounded border border-green-200 font-medium whitespace-pre-line">{{ doc.tindakLanjut.catatan }}</p>
          <p class="text-green-600 text-xs mt-2 text-right">Diselesaikan pada: {{ new Date(doc.tindakLanjut.tanggal).toLocaleString('id-ID') }}</p>
        </div>
      </div>
    </template>

    <div v-else class="card text-center py-12 text-gray-400">
      Surat Masuk tidak ditemukan.
    </div>

    <!-- ── Modals ─────────────────────────────────────────────── -->
    <Teleport to="body">
      <!-- Modal Disposisi -->
      <div v-if="showDisposisiModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <h3 class="font-bold text-gray-900 text-lg">Buat Disposisi</h3>
          <p class="text-sm text-gray-600">Teruskan surat ini kepada pejabat/staf untuk ditindaklanjuti.</p>
          
          <div>
            <label class="form-label">Teruskan Kepada</label>
            <select v-model="disposisiForm.kepadaId" class="form-select">
              <option v-for="u in auth.users" :key="u.id" :value="u.id">{{ u.name }} ({{ u.jabatan }})</option>
            </select>
          </div>
          <div>
            <label class="form-label">Instruksi / Catatan</label>
            <textarea v-model="disposisiForm.instruksi" class="form-textarea" rows="3" placeholder="Contoh: Harap dipelajari dan disiapkan draft balasannya..."></textarea>
          </div>

          <div class="flex justify-end gap-3 pt-2">
            <button class="btn-secondary" @click="showDisposisiModal = false">Batal</button>
            <button class="btn-primary" @click="submitDisposisi">Kirim Disposisi</button>
          </div>
        </div>
      </div>

      <!-- Modal Tindak Lanjut / Selesai -->
      <div v-if="showSelesaiModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
          <h3 class="font-bold text-green-700 text-lg">Selesaikan Surat</h3>
          <p class="text-sm text-gray-600">Catat hasil tindak lanjut instruksi pimpinan sebelum mengarsipkan surat ini.</p>
          
          <div>
            <label class="form-label">Catatan Penyelesaian</label>
            <textarea v-model="selesaiNote" class="form-textarea" rows="3" placeholder="Contoh: Sudah ditindaklanjuti dengan membuat laporan balasan pada tanggal..."></textarea>
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
