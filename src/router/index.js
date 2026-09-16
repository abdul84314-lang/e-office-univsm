import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('../components/layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
      },
      {
        path: 'surat-keluar',
        name: 'SuratKeluarList',
        component: () => import('../views/surat/SuratKeluarList.vue'),
      },
      {
        path: 'surat-keluar/generator',
        name: 'SuratKeluarGenerator',
        component: () => import('../views/surat/GeneratorNomor.vue'),
      },
      {
        path: 'surat-keluar/buat',
        name: 'SuratKeluarBuat',
        component: () => import('../views/surat/SuratKeluarDetail.vue'),
        props: { mode: 'create' },
      },
      {
        path: 'surat-keluar/:id',
        name: 'SuratKeluarDetail',
        component: () => import('../views/surat/SuratKeluarDetail.vue'),
        props: route => ({ id: route.params.id, mode: 'view' }),
      },
      {
        path: 'surat-masuk',
        name: 'SuratMasukList',
        component: () => import('../views/surat/SuratMasukList.vue'),
      },
      {
        path: 'surat-masuk/buat',
        name: 'SuratMasukBuat',
        component: () => import('../views/surat/SuratMasukDetail.vue'),
        props: { mode: 'create' },
      },
      {
        path: 'surat-masuk/:id',
        name: 'SuratMasukDetail',
        component: () => import('../views/surat/SuratMasukDetail.vue'),
        props: true,
      },
      {
        path: 'sppd',
        name: 'SppdList',
        component: () => import('../views/sppd/SppdList.vue'),
      },
      {
        path: 'sppd/buat',
        name: 'SppdBuat',
        component: () => import('../views/sppd/SppdForm.vue'),
      },
      {
        path: 'sppd/:id',
        name: 'SppdDetail',
        component: () => import('../views/sppd/SppdDetail.vue'),
        props: true,
      },
      {
        path: 'admin/users',
        name: 'UserManagement',
        component: () => import('../views/admin/UserManagement.vue'),
        meta: { requireAdmin: true },
      },
      {
        path: 'admin/units',
        name: 'UnitManagement',
        component: () => import('../views/admin/UnitManagement.vue'),
        meta: { requireAdmin: true },
      },
      {
        path: 'admin/jenis-surat',
        name: 'JenisSuratManagement',
        component: () => import('../views/admin/JenisSuratManagement.vue'),
        meta: { requireAdmin: true },
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.isAuthenticated) {
    return { name: 'Login' }
  }
  if (to.name === 'Login' && auth.isAuthenticated) {
    return { name: 'Dashboard' }
  }
  if (to.meta.requireAdmin && !auth.isAdmin) {
    return { name: 'Dashboard' }
  }
})

export default router
