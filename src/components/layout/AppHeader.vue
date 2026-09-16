<script setup>
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const breadcrumbs = {
  '/dashboard': ['Dashboard'],
  '/surat-keluar': ['Persuratan', 'Surat Keluar'],
  '/sppd': ['Perjalanan Dinas', 'SPPD'],
}

function getBreadcrumb() {
  const path = '/' + route.path.split('/').slice(1, 3).join('/')
  return breadcrumbs[path] ?? [route.name ?? 'Halaman']
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <header class="print:hidden bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm">
      <span class="font-bold text-primary-900">E-Office</span>
      <span class="text-gray-400">/</span>
      <template v-for="(crumb, i) in getBreadcrumb()" :key="i">
        <span :class="i === getBreadcrumb().length - 1 ? 'text-gray-700 font-medium' : 'text-gray-400'">{{ crumb }}</span>
        <span v-if="i < getBreadcrumb().length - 1" class="text-gray-400">/</span>
      </template>
    </div>

    <!-- Right: user info -->
    <div class="flex items-center gap-4">
      <!-- Notification bell placeholder -->
      <button class="relative text-gray-500 hover:text-primary-900 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        <span class="absolute -top-1 -right-1 w-2 h-2 bg-gold-600 rounded-full"></span>
      </button>

      <!-- User avatar + info -->
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <p class="text-sm font-semibold text-gray-800 leading-tight">{{ auth.currentUser?.name }}</p>
          <p class="text-xs text-gray-500">{{ auth.currentUser?.jabatan }}</p>
        </div>
        <div class="w-9 h-9 rounded-full bg-primary-900 text-white flex items-center justify-center text-sm font-bold select-none">
          {{ auth.currentUser?.avatar ?? '??' }}
        </div>
        <button
          class="text-gray-500 hover:text-red-600 transition-colors"
          title="Keluar"
          @click="handleLogout"
        >
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>
