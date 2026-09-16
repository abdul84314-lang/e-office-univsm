<script setup>
import { ref, computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth.js'

const route = useRoute()
const auth = useAuthStore()
const collapsed = ref(false)

const navItems = computed(() => {
  const items = [
    {
      group: 'Utama',
      items: [
        { name: 'Dashboard',     to: '/dashboard',    icon: 'home' },
      ],
    },
    {
      group: 'Persuratan',
      items: [
        { name: 'Surat Masuk',   to: '/surat-masuk',  icon: 'inbox' },
        { name: 'Surat Keluar',  to: '/surat-keluar', icon: 'envelope' },
      ],
    }
  ]

  // Hanya Super Admin dan Admin (TU) yang butuh akses buku agenda manual
  if (auth.isAdmin || auth.isUnitAdmin) {
    items[1].items.push({ name: 'Buku Agenda (Penomoran)', to: '/surat-keluar/generator', icon: 'collection' })
  }

  items.push({
    group: 'Perjalanan Dinas',
    items: [
      { name: 'SPPD', to: '/sppd', icon: 'map' },
    ],
  })

  if (auth.isPimpinan || auth.isAdmin) {
    items.push({
      group: 'Panel Pimpinan',
      items: [
        { name: 'Butuh Verifikasi / TTE', to: '/surat-keluar?filter=action_needed', icon: 'document' },
        { name: 'Disposisi Masuk', to: '/surat-masuk?filter=action_needed', icon: 'inbox' },
      ],
    })
  }
  
  if (auth.isAdmin) {
    items.push({
      group: 'Admin Panel',
      items: [
        { name: 'Manajemen User', to: '/admin/users', icon: 'users' },
        { name: 'Manajemen Unit', to: '/admin/units', icon: 'building' },
        { name: 'Jenis Surat', to: '/admin/jenis-surat', icon: 'document' },
      ],
    })
  }
  
  return items
})

function isActive(to) {
  return route.path === to || route.path.startsWith(to + '/')
}
</script>

<template>
  <aside
    :class="[
      'print:hidden flex flex-col bg-primary-900 text-white transition-all duration-300 shrink-0 h-screen sticky top-0',
      collapsed ? 'w-16' : 'w-64',
    ]"
  >
    <!-- Header / Logo -->
    <div class="flex items-center gap-3 px-4 py-4 border-b border-primary-800">
      <img src="/logo.png" alt="Logo UNIVSM" class="w-10 h-10 rounded-full object-cover shrink-0 bg-white p-0.5" />
      <div v-if="!collapsed" class="overflow-hidden">
        <p class="font-bold text-sm leading-tight text-white">E-Office</p>
        <p class="text-gold-400 text-xs font-medium leading-tight">UNIVSM</p>
      </div>
      <button
        class="ml-auto text-primary-300 hover:text-white transition-colors shrink-0"
        @click="collapsed = !collapsed"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path v-if="!collapsed" stroke-linecap="round" stroke-linejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          <path v-else stroke-linecap="round" stroke-linejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4 px-2 space-y-4">
      <div v-for="group in navItems" :key="group.group">
        <p v-if="!collapsed" class="text-primary-400 text-xs font-semibold uppercase tracking-widest px-2 mb-1">
          {{ group.group }}
        </p>
        <RouterLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          :class="[
            'nav-link',
            isActive(item.to) ? 'nav-link-active' : 'nav-link-inactive',
          ]"
          :title="collapsed ? item.name : ''"
        >
          <!-- Icon -->
          <span class="shrink-0 w-5 h-5 flex items-center justify-center">
            <svg v-if="item.icon === 'home'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            <svg v-else-if="item.icon === 'envelope'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
            </svg>
            <svg v-else-if="item.icon === 'inbox'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            <svg v-else-if="item.icon === 'map'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 20.25l-5.25-2.625V3.75L9 6.375m0 13.875V6.375m0 13.875l6-3.375m-6-10.5l6 3.375m0 0v13.5l5.25-2.625V3.75L15 6.375" />
            </svg>
            <svg v-else-if="item.icon === 'users'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <svg v-else-if="item.icon === 'users'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <svg v-else-if="item.icon === 'building'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
            <svg v-else-if="item.icon === 'collection'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <svg v-else-if="item.icon === 'document'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <svg v-else-if="item.icon === 'office'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
            </svg>
          </span>
          <span v-if="!collapsed" class="truncate text-sm">{{ item.name }}</span>
        </RouterLink>
      </div>
    </nav>

    <!-- Footer -->
    <div v-if="!collapsed" class="px-4 py-3 border-t border-primary-800">
      <p class="text-primary-400 text-xs text-center">© 2025 UNIVSM</p>
    </div>
  </aside>
</template>
