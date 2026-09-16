<script setup>
import { computed } from 'vue'
import { useKopSurat } from '../../composables/useKopSurat.js'

const props = defineProps({
  unitId: { type: String, default: 'rektor' },
  compact: { type: Boolean, default: false },
  isInternal: { type: Boolean, default: false },
})

const kop = computed(() => useKopSurat(props.unitId))
</script>

<template>
  <!-- KOP Surat -->
  <div class="kop-surat mb-4" style="font-family: 'Times New Roman', Times, serif;" :class="compact ? 'text-xs' : 'text-sm'">
    <div class="flex items-center gap-4 px-2">
      <!-- Logo -->
      <img
        :src="isInternal ? '/logo-bw.png' : '/logo.png'"
        alt="Logo UNIVSM"
        :class="compact ? 'w-[70px] h-[70px]' : 'w-[110px] h-[110px]'"
        class="object-contain shrink-0"
      />

      <!-- Text block -->
      <div class="flex-1 text-center">
        <!-- Yayasan -->
        <p :class="compact ? 'text-[10px]' : 'text-xs'" class="text-black uppercase font-normal mb-0.5">
          {{ kop.yayasan }}
        </p>

        <!-- UNIVERSITAS SAPTA MANDIRI -->
        <h1
          class="font-bold uppercase text-black leading-tight"
          :class="compact ? 'text-lg' : 'text-[26px]'"
        >
          {{ kop.univName }}
        </h1>

        <!-- Lembaga / UPT / Biro line (if applicable) -->
        <p
          v-if="kop.lembagaLine"
          class="font-bold uppercase text-black mt-1"
          :class="compact ? 'text-xs' : 'text-[15px]'"
        >
          {{ kop.lembagaLine }}
        </p>

        <!-- Fakultas line -->
        <p
          v-if="kop.fakultasLine"
          class="font-bold uppercase text-black mt-1"
          :class="compact ? 'text-xs' : 'text-[15px]'"
        >
          {{ kop.fakultasLine }}
        </p>

        <!-- Prodi line -->
        <p
          v-if="kop.prodiLine"
          class="font-bold uppercase text-black"
          :class="compact ? 'text-xs' : 'text-[15px]'"
        >
          {{ kop.prodiLine }}
        </p>

        <!-- SK Pendirian -->
        <p class="font-bold text-black my-1" :class="compact ? 'text-xs' : 'text-[14px]'">
          {{ kop.sk }}
        </p>

        <!-- Address block -->
        <div v-if="!compact" class="mt-1 leading-snug font-normal text-black text-[11px]">
          <p v-for="line in kop.address" :key="line">
            <span v-html="line.replace(/www\.univsm\.ac\.id/g, '<a href=\'http://www.univsm.ac.id\' class=\'text-blue-600 underline\'>www.univsm.ac.id</a>').replace(/info@univsm\.ac\.id/g, '<a href=\'mailto:info@univsm.ac.id\' class=\'text-blue-600 underline\'>info@univsm.ac.id</a>')"></span>
          </p>
        </div>
        <div v-else class="mt-1 leading-snug font-normal text-black text-[9px]">
          <p>{{ kop.address[3] }}</p>
          <p>{{ kop.address[4] }}</p>
        </div>
      </div>
      
      <!-- Right spacer to balance the flex if needed, or leave empty if text should fill. -->
      <div :class="compact ? 'w-[70px]' : 'w-[110px]'" class="shrink-0 opacity-0 pointer-events-none hidden sm:block"></div>
    </div>
    
    <!-- Precise Double Line Border -->
    <div style="border-top: 3px solid black; border-bottom: 1px solid black; height: 5px; width: 100%; margin-top: 8px;"></div>
  </div>
</template>
