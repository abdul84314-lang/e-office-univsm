<script setup>
import { computed } from 'vue'
import DocumentKop from './DocumentKop.vue'
import {
  DISPOSISI_HARAP_DEFAULTS,
  formatIndonesianDate,
  formatShortSlashDate,
} from '../../composables/useNotification.js'

const props = defineProps({
  doc: { type: Object, required: true },
  disposisi: { type: Object, required: true },
})

const sifat = computed(() => props.disposisi?.sifatSurat || props.doc?.sifatSurat || 'segera')

const penerimaRows = computed(() => {
  if (Array.isArray(props.disposisi?.penerimaList) && props.disposisi.penerimaList.length > 0) {
    return props.disposisi.penerimaList
  }
  if (props.disposisi?.kepadaNama) {
    return [{ nama: props.disposisi.kepadaNama, jabatan: '' }]
  }
  return []
})

const harapSet = computed(() => new Set(props.disposisi?.harapList || []))

const tanggalParaf = computed(() => {
  return props.disposisi?.parafTanggal || formatShortSlashDate(props.disposisi?.tanggal)
})

const initials = computed(() => {
  const name = props.disposisi?.olehNama || 'Pimpinan'
  return name
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
})
</script>

<template>
  <div
    class="bg-white text-black p-6 sm:p-8 border border-gray-300 shadow-sm print:shadow-none print:border-0 print:p-0"
    style="font-family: 'Times New Roman', Times, serif;"
  >
    <!-- KOP Resmi Universitas Sapta Mandiri -->
    <DocumentKop unit-id="rektor" :is-internal="true" />

    <!-- Bingkai Utama Lembar Disposisi -->
    <div class="border-[2.5px] border-black mt-3">
      <!-- Judul -->
      <div class="text-center font-bold text-base sm:text-lg tracking-wide py-2 border-b-[3px] border-double border-black">
        LEMBAR DISPOSISI
      </div>

      <!-- Baris 1: Info Surat (Kiri) & Agenda/Sifat (Kanan) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 border-b border-black text-sm leading-relaxed">
        <!-- Kolom Kiri -->
        <div class="p-3 sm:border-r border-black space-y-2 min-h-[145px]">
          <p>Surat Dari : {{ doc.asalSurat }}</p>
          <div>
            <p>Nomor Surat :</p>
            <p class="mt-0.5 break-words">{{ doc.nomorSuratAsal }}</p>
          </div>
          <p>Tanggal Surat : {{ formatIndonesianDate(doc.tanggalSurat) }}</p>
        </div>

        <!-- Kolom Kanan -->
        <div class="p-3 border-t sm:border-t-0 border-black space-y-2 min-h-[145px]">
          <p>Diterima Tanggal : {{ formatIndonesianDate(doc.tanggalDiterima || doc.createdAt) }}</p>
          <p>Nomor Agenda : {{ doc.nomorAgenda || '-' }}</p>
          <div>
            <p>Sifat Surat :</p>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 text-sm">
              <span class="inline-flex items-center gap-1.5">
                <span class="inline-flex items-center justify-center w-4 h-4 border border-black text-xs font-bold leading-none">
                  {{ sifat === 'sangat_segera' ? '✓' : '' }}
                </span>
                <span>Sangat Segera</span>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="inline-flex items-center justify-center w-4 h-4 border border-black text-xs font-bold leading-none">
                  {{ sifat === 'segera' ? '✓' : '' }}
                </span>
                <span>Segera</span>
              </span>
              <span class="inline-flex items-center gap-1.5">
                <span class="inline-flex items-center justify-center w-4 h-4 border border-black text-xs font-bold leading-none">
                  {{ sifat === 'rahasia' ? '✓' : '' }}
                </span>
                <span>Rahasia</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Baris 2: Perihal -->
      <div class="p-3 border-b border-black text-sm min-h-[75px]">
        <span>Perihal : </span>
        <span class="italic">{{ doc.perihal }}</span>
      </div>

      <!-- Baris 3: Diteruskan Kepada (Kiri) & Dengan Hormat Harap (Kanan) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 border-b border-black text-sm">
        <!-- Diteruskan Kepada -->
        <div class="p-3 sm:border-r border-black min-h-[175px]">
          <p class="mb-2">Diteruskan Kepada :</p>
          <ol class="pl-5 space-y-1.5 list-decimal">
            <li v-for="(p, idx) in penerimaRows" :key="idx">
              <span class="border-b border-dotted border-gray-500 pb-0.5">
                {{ p.jabatan ? `${p.jabatan} (${p.nama})` : p.nama }}
              </span>
            </li>
            <li v-if="penerimaRows.length === 0" class="text-gray-400 italic">Belum ditentukan</li>
          </ol>
        </div>

        <!-- Dengan Hormat Harap -->
        <div class="p-3 border-t sm:border-t-0 border-black min-h-[175px]">
          <p class="mb-2">Dengan Hormat Harap :</p>
          <div class="space-y-2 pl-2">
            <div v-for="opt in DISPOSISI_HARAP_DEFAULTS" :key="opt" class="flex items-center gap-2.5">
              <span class="inline-flex items-center justify-center w-4 h-4 border border-gray-700 text-xs font-bold leading-none shrink-0">
                {{ harapSet.has(opt) ? '✓' : '' }}
              </span>
              <span>{{ opt }}</span>
            </div>

            <!-- Baris Kustom 1 -->
            <div class="flex items-center gap-2.5">
              <span class="inline-flex items-center justify-center w-4 h-4 border border-gray-700 text-xs font-bold leading-none shrink-0">
                {{ disposisi.harapCustom1 ? '✓' : '' }}
              </span>
              <span v-if="disposisi.harapCustom1">{{ disposisi.harapCustom1 }}</span>
              <span v-else class="text-gray-500">...............................................</span>
            </div>

            <!-- Baris Kustom 2 -->
            <div class="flex items-center gap-2.5">
              <span class="inline-flex items-center justify-center w-4 h-4 border border-gray-700 text-xs font-bold leading-none shrink-0">
                {{ disposisi.harapCustom2 ? '✓' : '' }}
              </span>
              <span v-if="disposisi.harapCustom2">{{ disposisi.harapCustom2 }}</span>
              <span v-else class="text-gray-500">...............................................</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Baris 4: Catatan & Paraf Pimpinan -->
      <div class="p-3 min-h-[150px] flex flex-col justify-between text-sm">
        <div>
          <p class="mb-2">Catatan :</p>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 pl-2">
            <div class="whitespace-pre-line leading-relaxed flex-1" style="font-family: Arial, Helvetica, sans-serif;">
              {{ disposisi.catatan || disposisi.instruksi || '-' }}
            </div>

            <!-- Blok Paraf & Tanggal di Pojok Kanan Bawah -->
            <div class="text-center shrink-0 min-w-[130px] self-end">
              <div v-if="disposisi.parafMode === 'canvas' && disposisi.parafDataUrl" class="flex justify-center">
                <img :src="disposisi.parafDataUrl" alt="Paraf Pimpinan" class="h-14 max-w-[140px] object-contain" />
              </div>
              <div v-else class="inline-flex flex-col items-center border border-gray-800 rounded px-2.5 py-1 bg-gray-50">
                <span class="text-[10px] uppercase tracking-wider text-gray-600 font-sans">Paraf Digital</span>
                <span class="font-bold text-base leading-tight italic">{{ initials }}</span>
                <span class="text-[10px] text-gray-700 font-sans">{{ disposisi.olehNama?.split(',')[0] }}</span>
              </div>
              <p class="mt-1 font-sans text-xs font-medium">{{ tanggalParaf }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
