import { defineStore } from 'pinia'
import { ref } from 'vue'
import { gasPost } from '../api/gasClient.js'

const STORAGE_KEY = 'eoffice_system_settings_v1'

const DEFAULT_SETTINGS = {
  id: 'system_settings',
  type: 'Settings',
  // Aplikasi
  appBaseUrl: typeof window !== 'undefined' ? window.location.origin : '',
  // Email (Google Apps Script MailApp - Gratis)
  emailEnabled: true,
  emailSenderName: 'E-Office Universitas Sapta Mandiri',
  // WhatsApp Notification
  waMode: 'hybrid', // 'hybrid' | 'gateway' | 'manual'
  waProvider: 'fonnte', // 'fonnte' | 'wablas' | 'custom'
  waApiUrl: 'https://api.fonnte.com/send',
  waApiToken: '',
  // BSrE BSSN Integration (Opsi 1 - API)
  bsreEnabled: false,
  bsreApiUrl: '',
  bsreUsername: '',
  bsrePassword: '',
}

function loadCached() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {}
  return { ...DEFAULT_SETTINGS }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(loadCached())
  const isLoading = ref(false)
  const isSaving = ref(false)

  // Always default appBaseUrl if empty
  if (!settings.value.appBaseUrl && typeof window !== 'undefined') {
    settings.value.appBaseUrl = window.location.origin
  }

  async function fetchSettings() {
    isLoading.value = true
    try {
      const res = await gasPost('get_table', { table: 'Settings' })
      if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
        const remote = res.data.find(r => r.id === 'system_settings') || res.data[0]
        settings.value = {
          ...DEFAULT_SETTINGS,
          ...remote,
          appBaseUrl: remote.appBaseUrl || (typeof window !== 'undefined' ? window.location.origin : ''),
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings.value))
      }
    } catch (e) {
      console.warn('Gagal memuat pengaturan dari server, menggunakan cache lokal', e)
    } finally {
      isLoading.value = false
    }
  }

  async function saveSettings(newValues) {
    isSaving.value = true
    const updated = {
      ...DEFAULT_SETTINGS,
      ...settings.value,
      ...newValues,
      id: 'system_settings',
      type: 'Settings',
      updatedAt: new Date().toISOString(),
    }
    settings.value = updated
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    try {
      await gasPost('update_data', { table: 'Settings', record: updated })
      return true
    } catch (e) {
      console.error('Gagal menyimpan pengaturan ke server', e)
      return false
    } finally {
      isSaving.value = false
    }
  }

  fetchSettings()

  return {
    settings,
    isLoading,
    isSaving,
    DEFAULT_SETTINGS,
    fetchSettings,
    saveSettings,
  }
})
