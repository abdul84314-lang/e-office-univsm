<script setup>
import { ref } from 'vue'
import { buildWaLink, normalizeWaPhone } from '../../composables/useNotification.js'

const props = defineProps({
  title: { type: String, default: 'Distribusi Notifikasi (Email & WhatsApp)' },
  recipients: { type: Array, default: () => [] }, // [{ name, jabatan, email, phone }]
  waText: { type: String, default: '' },
  lastStatus: { type: Object, default: null },
  isSending: { type: Boolean, default: false },
})

const emit = defineEmits(['resend'])
const copied = ref(false)

function openWa(recipient) {
  const url = buildWaLink(recipient.phone, props.waText)
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function copyWaMessage() {
  try {
    await navigator.clipboard.writeText(props.waText)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {}
}
</script>

<template>
  <div class="card bg-emerald-50/70 border border-emerald-200 space-y-3 print:hidden">
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
      <div>
        <h3 class="font-semibold text-emerald-950 text-sm">{{ title }}</h3>
        <p class="text-xs text-emerald-800">
          Tanpa perlu download/cetak PDF — notifikasi langsung mengarah ke Email & WhatsApp masing-masing pihak tujuan.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn-secondary btn-sm text-xs"
          @click="copyWaMessage"
        >
          {{ copied ? 'Teks Disalin!' : 'Salin Teks WA' }}
        </button>
        <button
          type="button"
          class="btn-primary btn-sm text-xs bg-emerald-700 hover:bg-emerald-800 border-none"
          :disabled="isSending || !recipients.length"
          @click="emit('resend')"
        >
          {{ isSending ? 'Mengirim...' : 'Kirim / Kirim Ulang Otomatis' }}
        </button>
      </div>
    </div>

    <!-- Status terakhir -->
    <div
      v-if="lastStatus"
      class="text-xs px-3 py-2 rounded-lg border"
      :class="lastStatus.success ? 'bg-white border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'"
    >
      <span class="font-semibold">Status Pengiriman: </span>
      <span>
        {{ lastStatus.message || (lastStatus.success
          ? `Email terkirim: ${lastStatus.emailSentCount ?? 0} | WA Gateway terkirim: ${lastStatus.waSentCount ?? 0}`
          : (lastStatus.error || 'Menunggu update backend GAS v7 / token WA. Gunakan tombol Kirim WA di bawah.')) }}
      </span>
    </div>

    <!-- Daftar Penerima + Tombol WA langsung -->
    <div v-if="recipients.length" class="space-y-2">
      <div
        v-for="(r, i) in recipients"
        :key="i"
        class="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-emerald-100 text-xs"
      >
        <div>
          <p class="font-semibold text-gray-900">
            {{ i + 1 }}. {{ r.name || r.nama }}
            <span v-if="r.jabatan" class="font-normal text-gray-500">({{ r.jabatan }})</span>
          </p>
          <p class="text-gray-500 mt-0.5">
            Email: <span class="font-mono">{{ r.email || '-' }}</span>
            &bull;
            WA: <span class="font-mono">{{ r.phone || '-' }}</span>
          </p>
        </div>

        <div class="flex items-center gap-1.5">
          <button
            v-if="normalizeWaPhone(r.phone)"
            type="button"
            class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
            @click="openWa(r)"
          >
            <span>Kirim WA</span>
          </button>
          <span v-else class="text-[11px] text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
            No. WA belum diisi
          </span>
        </div>
      </div>
    </div>
    <p v-else class="text-xs text-gray-500 italic">
      Belum ada penerima dengan alamat Email/WA yang dipilih.
    </p>
  </div>
</template>
