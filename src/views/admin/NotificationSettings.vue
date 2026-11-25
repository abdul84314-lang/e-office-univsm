<script setup>
import { ref, watch } from 'vue'
import { useSettingsStore } from '../../stores/settings.js'
import { useAuthStore } from '../../stores/auth.js'
import { gasPost } from '../../api/gasClient.js'
import { normalizeWaPhone } from '../../composables/useNotification.js'

const settingsStore = useSettingsStore()
const auth = useAuthStore()

const form = ref({ ...settingsStore.settings })
const saveMessage = ref('')
const testEmail = ref(auth.currentUser?.email || '')
const testPhone = ref(auth.currentUser?.phone || '')
const isTesting = ref(false)
const testResult = ref(null)

watch(() => settingsStore.settings, (val) => {
  if (val) form.value = { ...val }
}, { deep: true })

function handleProviderChange() {
  if (form.value.waProvider === 'fonnte') {
    form.value.waApiUrl = 'https://api.fonnte.com/send'
  } else if (form.value.waProvider === 'wablas') {
    form.value.waApiUrl = 'https://pati.wablas.com/api/send-message'
  }
}

async function handleSave() {
  saveMessage.value = ''
  const ok = await settingsStore.saveSettings(form.value)
  saveMessage.value = ok
    ? 'Pengaturan berhasil disimpan ke server!'
    : 'Tersimpan di browser lokal, namun sinkronisasi ke server gagal.'
  setTimeout(() => { saveMessage.value = '' }, 4000)
}

async function handleTestNotification() {
  isTesting.value = true
  testResult.value = null
  try {
    const res = await gasPost('test_notification', {
      email: testEmail.value.trim(),
      phone: normalizeWaPhone(testPhone.value),
      config: {
        emailEnabled: form.value.emailEnabled,
        emailSenderName: form.value.emailSenderName,
        waEnabled: (form.value.waMode === 'gateway' || form.value.waMode === 'hybrid') && Boolean(form.value.waApiToken),
        waProvider: form.value.waProvider,
        waApiUrl: form.value.waApiUrl,
        waApiToken: form.value.waApiToken,
      }
    })
    testResult.value = res
  } catch (e) {
    testResult.value = { success: false, error: e.message }
  } finally {
    isTesting.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-4xl mx-auto">
    <div>
      <h1 class="text-xl font-bold text-gray-900">Pengaturan Notifikasi & Integrasi BSrE</h1>
      <p class="text-sm text-gray-500 mt-0.5">
        Konfigurasi pengiriman Email otomatis, WhatsApp Gateway (Disposisi, Surat Masuk, Surat Keluar), dan koneksi API BSrE BSSN.
      </p>
    </div>

    <div v-if="saveMessage" class="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-medium">
      {{ saveMessage }}
    </div>

    <!-- URL Aplikasi -->
    <div class="card space-y-4">
      <h2 class="font-semibold text-gray-800 border-b pb-2">1. Alamat Aplikasi E-Office (Tautan Notifikasi)</h2>
      <div>
        <label class="form-label">Base URL Aplikasi</label>
        <input v-model="form.appBaseUrl" type="url" class="form-input font-mono text-sm" placeholder="https://e-office-univsm.vercel.app" />
        <p class="text-xs text-gray-500 mt-1">Digunakan sebagai link langsung di dalam pesan Email & WhatsApp agar penerima bisa membuka disposisi/surat dalam 1 klik.</p>
      </div>
    </div>

    <!-- Email Otomatis -->
    <div class="card space-y-4">
      <div class="flex items-center justify-between border-b pb-2">
        <div>
          <h2 class="font-semibold text-gray-800">2. Notifikasi Email Otomatis (Google Apps Script — Gratis)</h2>
          <p class="text-xs text-gray-500">Mengirim Lembar Disposisi & info surat berformat HTML langsung lewat MailApp Google (100/hari Gmail atau 1.500/hari Google Workspace).</p>
        </div>
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="form.emailEnabled" class="w-4 h-4 rounded text-primary-600" />
          <span class="text-sm font-semibold" :class="form.emailEnabled ? 'text-green-700' : 'text-gray-400'">
            {{ form.emailEnabled ? 'Aktif' : 'Nonaktif' }}
          </span>
        </label>
      </div>
      <div>
        <label class="form-label">Nama Pengirim Email</label>
        <input v-model="form.emailSenderName" type="text" class="form-input" placeholder="E-Office Universitas Sapta Mandiri" />
      </div>
    </div>

    <!-- WhatsApp Gateway -->
    <div class="card space-y-4">
      <h2 class="font-semibold text-gray-800 border-b pb-2">3. Notifikasi WhatsApp (Hybrid: Otomatis Gateway + Tombol WA Gratis)</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Mode Pengiriman WhatsApp</label>
          <select v-model="form.waMode" class="form-select">
            <option value="hybrid">Hybrid (Otomatis via Gateway jika token diisi + Tombol WA Gratis)</option>
            <option value="gateway">Otomatis Penuh via WA Gateway saja</option>
            <option value="manual">Tombol Kirim Cepat WA (wa.me — 100% Gratis)</option>
          </select>
        </div>
        <div>
          <label class="form-label">Penyedia WA Gateway</label>
          <select v-model="form.waProvider" @change="handleProviderChange" class="form-select">
            <option value="fonnte">Fonnte (Rekomendasi — Murah / Ada Free Tier)</option>
            <option value="wablas">Wablas</option>
            <option value="custom">Custom HTTP Webhook</option>
          </select>
        </div>
        <div>
          <label class="form-label">Endpoint API Gateway</label>
          <input v-model="form.waApiUrl" type="url" class="form-input font-mono text-xs" placeholder="https://api.fonnte.com/send" />
        </div>
        <div>
          <label class="form-label">API Token WA Gateway</label>
          <input v-model="form.waApiToken" type="password" class="form-input font-mono text-xs" placeholder="Tempel Token API Fonnte / Wablas di sini" />
          <p class="text-[11px] text-gray-500 mt-1">Kosongkan bila belum berlangganan Gateway; tombol kirim cepat WA gratis tetap muncul otomatis.</p>
        </div>
      </div>
    </div>

    <!-- Integrasi BSrE -->
    <div class="card space-y-4 border-l-4 border-l-emerald-500">
      <div class="flex items-center justify-between border-b pb-2">
        <div>
          <h2 class="font-semibold text-gray-800">4. Integrasi API TTE BSrE (BSSN)</h2>
          <p class="text-xs text-gray-500">Aktifkan jika PKS & Server E-Sign BSrE sudah tersedia. Jika belum, metode <strong>Unduh PDF &rarr; TTD BSrE Digital &rarr; Unggah Kembali</strong> dan <strong>TTE QR Verifikasi</strong> sudah langsung bisa digunakan.</p>
        </div>
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" v-model="form.bsreEnabled" class="w-4 h-4 rounded text-emerald-600" />
          <span class="text-sm font-semibold" :class="form.bsreEnabled ? 'text-emerald-700' : 'text-gray-400'">
            {{ form.bsreEnabled ? 'API Aktif' : 'Mode Lokal/Hybrid' }}
          </span>
        </label>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="md:col-span-3">
          <label class="form-label">URL Endpoint BSrE E-Sign API</label>
          <input v-model="form.bsreApiUrl" type="url" class="form-input font-mono text-xs" placeholder="https://esign.kampus.ac.id/api/sign/pdf" />
        </div>
        <div>
          <label class="form-label">Client ID / Username Basic Auth</label>
          <input v-model="form.bsreUsername" type="text" class="form-input text-sm" placeholder="esign-client" />
        </div>
        <div class="md:col-span-2">
          <label class="form-label">Client Secret / Password Basic Auth</label>
          <input v-model="form.bsrePassword" type="password" class="form-input text-sm" placeholder="••••••••••••" />
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div class="flex justify-end">
      <button class="btn-primary" :disabled="settingsStore.isSaving" @click="handleSave">
        {{ settingsStore.isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan' }}
      </button>
    </div>

    <!-- Test Connection Box -->
    <div class="card bg-gray-50 space-y-4">
      <h2 class="font-semibold text-gray-800 border-b pb-2">Uji Coba Pengiriman Email & WA (Pastikan Backend GAS v7 Sudah Di-Deploy)</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="form-label">Email Tujuan Uji Coba</label>
          <input v-model="testEmail" type="email" class="form-input bg-white" placeholder="nama@univsm.ac.id" />
        </div>
        <div>
          <label class="form-label">No. WA Tujuan Uji Coba</label>
          <input v-model="testPhone" type="text" class="form-input bg-white" placeholder="08xxxxxxxxxx" />
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button class="btn-secondary btn-sm" :disabled="isTesting" @click="handleTestNotification">
          {{ isTesting ? 'Mengirim Uji Coba...' : 'Kirim Pesan Uji Coba' }}
        </button>
        <span v-if="testResult" class="text-xs font-medium" :class="testResult.success ? 'text-green-700' : 'text-red-600'">
          {{ testResult.message || testResult.error || (testResult.success ? 'Uji coba selesai.' : 'Gagal menghubungi GAS v7.') }}
        </span>
      </div>
    </div>
  </div>
</template>
