<script setup>
import { onMounted } from 'vue'
import { useDocumentsStore } from '../../stores/documents.js'
import { useSppdStore } from '../../stores/sppd.js'
import { useSuratMasukStore } from '../../stores/suratMasuk.js'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const docStore = useDocumentsStore()
const sppdStore = useSppdStore()
const smStore = useSuratMasukStore()

onMounted(() => {
  docStore.fetchDocuments()
  sppdStore.fetchSPPDs()
  smStore.fetchSuratMasuk()
})
</script>

<template>
  <div class="flex h-screen bg-gray-50 print:h-auto print:block print:bg-white">
    <AppSidebar class="print:hidden" />
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto print:overflow-visible print:block">
      <AppHeader class="print:hidden" />
      <main class="flex-1 p-6 print:p-0 print:block">
        <RouterView />
      </main>
    </div>
  </div>
</template>
