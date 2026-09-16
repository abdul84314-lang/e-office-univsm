<script setup>
const props = defineProps({
  status: { type: String, required: true },
  label: { type: String, default: '' },
})

const colorMap = {
  gray:   'bg-gray-100 text-gray-700 border-gray-300',
  yellow: 'bg-yellow-50 text-yellow-800 border-yellow-300',
  orange: 'bg-orange-50 text-orange-800 border-orange-300',
  blue:   'bg-blue-50 text-blue-800 border-blue-300',
  purple: 'bg-purple-50 text-purple-800 border-purple-300',
  green:  'bg-green-50 text-green-800 border-green-300',
  red:    'bg-red-50 text-red-800 border-red-300',
}

const dotMap = {
  gray:   'bg-gray-400',
  yellow: 'bg-yellow-500',
  orange: 'bg-orange-500',
  blue:   'bg-blue-500',
  purple: 'bg-purple-500',
  green:  'bg-green-500',
  red:    'bg-red-500',
}

const colorClass = colorMap[props.status] ?? colorMap.gray
const dotClass   = dotMap[props.status] ?? dotMap.gray
</script>

<template>
  <span :class="['inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border', colorClass]">
    <span :class="['w-1.5 h-1.5 rounded-full', dotClass]"></span>
    {{ label }}
  </span>
</template>
