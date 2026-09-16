<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const loginError = ref(false)
const isLoading = ref(false)

async function handleLogin() {
  loginError.value = false
  isLoading.value = true
  
  try {
    const success = await auth.loginWithCredentials(email.value, password.value)
    if (success) {
      router.push('/dashboard')
    } else {
      loginError.value = true
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-primary-900 flex">
    <!-- Left panel — branding -->
    <div class="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden">
      <!-- Background pattern -->
      <div class="absolute inset-0 opacity-10">
        <div class="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gold-400 blur-3xl"></div>
        <div class="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-white blur-3xl"></div>
      </div>

      <div class="relative z-10 text-center">
        <img src="/logo.png" alt="Logo UNIVSM" class="w-32 h-32 mx-auto mb-6 drop-shadow-lg" />
        <h1 class="text-4xl font-extrabold text-white leading-tight">E-Office</h1>
        <h2 class="text-xl font-bold text-gold-400 mt-1">Universitas Sapta Mandiri</h2>
        <p class="text-primary-200 mt-4 max-w-xs mx-auto text-sm leading-relaxed">
          Sistem Persuratan dan Administrasi Elektronik Terpadu Universitas Sapta Mandiri
        </p>
        <div class="mt-6 flex flex-col gap-2 text-xs text-primary-300">
          <p>📍 Paringin, Kab. Balangan, Kalimantan Selatan</p>
          <p>🌐 www.univsm.ac.id</p>
        </div>
      </div>
    </div>

    <!-- Right panel — login form -->
    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
      <div class="w-full max-w-md">
        <!-- Mobile logo -->
        <div class="lg:hidden text-center mb-8">
          <img src="/logo.png" alt="Logo UNIVSM" class="w-20 h-20 mx-auto mb-3" />
          <h1 class="text-2xl font-extrabold text-primary-900">E-Office UNIVSM</h1>
        </div>

        <div class="card">
          <h2 class="text-2xl font-bold text-gray-900 mb-1">Masuk</h2>
          <p class="text-sm text-gray-500 mb-6">Silakan masukkan Email dan Password Anda</p>

          <form @submit.prevent="handleLogin" class="space-y-4">
            <div v-if="loginError" class="p-3 bg-red-100 text-red-700 text-sm rounded-lg border border-red-200">
              Email atau Password salah. Silakan coba lagi.
            </div>
            
            <div>
              <label class="form-label">Alamat Email</label>
              <input 
                v-model="email"
                type="email" 
                class="form-input" 
                placeholder="contoh: rektor@univsm.ac.id" 
                required 
              />
            </div>

            <div>
              <label class="form-label">Password</label>
              <input 
                v-model="password"
                type="password" 
                class="form-input" 
                placeholder="Masukkan Password" 
                required 
              />
            </div>

            <button type="submit" class="btn-primary w-full py-2.5 text-base mt-2" :disabled="isLoading">
              {{ isLoading ? 'Menghubungkan ke Server...' : 'Masuk ke Sistem' }}
            </button>
          </form>
        </div>

        <p class="text-center text-xs text-gray-400 mt-6">
          &copy; 2025 Yayasan Sapta Bakti Pendidikan — UNIVSM
        </p>
      </div>
    </div>
  </div>
</template>
