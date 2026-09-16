<script setup>
import { DOCUMENT_STATUSES } from '../../stores/documents.js'

const props = defineProps({
  currentStatus: { type: String, required: true },
})

const stepIndex = (key) => DOCUMENT_STATUSES.findIndex(s => s.key === key)
const current = stepIndex(props.currentStatus)
</script>

<template>
  <div class="flex items-center w-full overflow-x-auto py-2">
    <template v-for="(step, i) in DOCUMENT_STATUSES" :key="step.key">
      <!-- Step circle -->
      <div class="flex flex-col items-center shrink-0">
        <div
          :class="[
            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
            i < current  ? 'bg-green-500 border-green-500 text-white' :
            i === current ? 'bg-primary-900 border-primary-900 text-white shadow-lg ring-4 ring-primary-200' :
                            'bg-white border-gray-300 text-gray-400',
          ]"
        >
          <svg v-if="i < current" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span v-else>{{ i + 1 }}</span>
        </div>
        <span
          class="mt-1 text-xs text-center whitespace-nowrap max-w-[80px] leading-tight"
          :class="i === current ? 'text-primary-900 font-semibold' : i < current ? 'text-green-600' : 'text-gray-400'"
        >
          {{ step.label }}
        </span>
      </div>

      <!-- Connector line -->
      <div
        v-if="i < DOCUMENT_STATUSES.length - 1"
        :class="['flex-1 h-0.5 mx-1 rounded transition-all', i < current ? 'bg-green-400' : 'bg-gray-200']"
      />
    </template>
  </div>
</template>
