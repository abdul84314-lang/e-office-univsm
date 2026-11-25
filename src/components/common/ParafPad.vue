<script setup>
import { ref, onMounted, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' }, // dataUrl if canvas mode
  mode: { type: String, default: 'canvas' }, // 'canvas' | 'auto'
  userKey: { type: [String, Number], default: 'default' },
  signerName: { type: String, default: 'Pimpinan' },
})

const emit = defineEmits(['update:modelValue', 'update:mode'])

const canvasRef = ref(null)
const isDrawing = ref(false)
const hasStroke = ref(false)
const saveAsDefault = ref(true)

const storageKey = () => `eoffice_paraf_${props.userKey}`

function initCanvas(existingDataUrl = '') {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = '#111827'
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const src = existingDataUrl || props.modelValue || localStorage.getItem(storageKey()) || ''
  if (src) {
    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      hasStroke.value = true
      emit('update:modelValue', src)
    }
    img.src = src
  }
}

onMounted(() => {
  if (props.mode === 'canvas') {
    setTimeout(() => initCanvas(), 30)
  }
})

watch(() => props.mode, (m) => {
  if (m === 'canvas') {
    setTimeout(() => initCanvas(), 30)
  }
})

function getPoint(e) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  return {
    x: ((clientX - rect.left) / rect.width) * canvas.width,
    y: ((clientY - rect.top) / rect.height) * canvas.height,
  }
}

function startDraw(e) {
  e.preventDefault()
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const { x, y } = getPoint(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
  isDrawing.value = true
  hasStroke.value = true
}

function draw(e) {
  if (!isDrawing.value) return
  e.preventDefault()
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const { x, y } = getPoint(e)
  ctx.lineTo(x, y)
  ctx.stroke()
}

function endDraw() {
  if (!isDrawing.value) return
  isDrawing.value = false
  const canvas = canvasRef.value
  if (!canvas) return
  const dataUrl = canvas.toDataURL('image/png')
  emit('update:modelValue', dataUrl)
  if (saveAsDefault.value) {
    try { localStorage.setItem(storageKey(), dataUrl) } catch {}
  }
}

function clearCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  hasStroke.value = false
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="space-y-2">
    <div class="flex gap-2">
      <button
        type="button"
        @click="emit('update:mode', 'canvas')"
        :class="[
          'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
          mode === 'canvas' ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
        ]"
      >
        Coret Paraf Langsung
      </button>
      <button
        type="button"
        @click="emit('update:mode', 'auto')"
        :class="[
          'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
          mode === 'auto' ? 'bg-primary-900 text-white border-primary-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
        ]"
      >
        Paraf Elektronik Otomatis (Tanpa Coret)
      </button>
    </div>

    <div v-if="mode === 'canvas'" class="space-y-1.5">
      <div class="relative border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref="canvasRef"
          width="320"
          height="110"
          class="w-full h-28 touch-none cursor-crosshair block"
          @mousedown="startDraw"
          @mousemove="draw"
          @mouseup="endDraw"
          @mouseleave="endDraw"
          @touchstart="startDraw"
          @touchmove="draw"
          @touchend="endDraw"
        ></canvas>
        <span
          v-if="!hasStroke"
          class="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-gray-400"
        >
          Coret paraf Anda di sini (mouse / layar sentuh)
        </span>
      </div>
      <div class="flex items-center justify-between text-xs">
        <label class="inline-flex items-center gap-1.5 text-gray-600 cursor-pointer">
          <input type="checkbox" v-model="saveAsDefault" class="rounded" />
          <span>Simpan sebagai paraf default saya</span>
        </label>
        <button type="button" @click="clearCanvas" class="text-red-600 hover:underline font-medium">
          Hapus Coretan
        </button>
      </div>
    </div>

    <div v-else class="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
      <p class="font-semibold">Paraf Elektronik Aktif (Tanpa Upload File)</p>
      <p class="text-emerald-700 mt-0.5">
        Sistem otomatis membubuhkan stempel paraf elektronik atas nama <strong>{{ signerName }}</strong> beserta tanggal disposisi.
      </p>
    </div>
  </div>
</template>
