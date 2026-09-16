import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { gasPost } from '../api/gasClient.js'

const INITIAL_USERS = [
  { id: 99, name: 'Super Admin', nik: '9999999999999999', jabatan: 'Administrator Sistem', sppdRole: 'staf', unitId: 'rektor', email: 'admin@univsm.ac.id', phone: '081234567890', avatar: 'SA', role: 'admin', password: 'admin' },
  { id: 1, name: 'Abdul Hamid, S.Kom., M.M., M.Kom.', nik: '3501010101850001', nidn: '1101018501', jabatan: 'Rektor', sppdRole: 'rektor', unitId: 'rektor', email: 'rektor@univsm.ac.id', phone: '081200000001', avatar: 'AH', role: 'user', password: 'password' },
  { id: 2, name: 'Dr. Siti Rahmah, M.Pd.', nik: '3501010101820002', nidn: '1102028201', jabatan: 'Wakil Rektor I', sppdRole: 'warek', unitId: 'rektor', email: 'wr1@univsm.ac.id', phone: '081200000002', avatar: 'SR', role: 'user', password: 'password' },
  { id: 3, name: 'Ir. Budi Santoso, M.T.', nik: '3501010101780003', nidn: '1103037801', jabatan: 'Wakil Rektor II', sppdRole: 'warek', unitId: 'rektor', email: 'wr2@univsm.ac.id', phone: '081200000003', avatar: 'BS', role: 'user', password: 'password' },
  { id: 4, name: 'Dr. Hj. Fatimah, M.Hum.', nik: '3501010101750004', nidn: '1104047501', jabatan: 'Dekan FST', sppdRole: 'dekan', unitId: 'fst', email: 'dekan.fst@univsm.ac.id', phone: '081200000004', avatar: 'HF', role: 'user', password: 'password' },
  { id: 5, name: 'Rudi Hartono, S.E., M.M.', nik: '3501010101880005', nidn: '1105058801', jabatan: 'Dekan Humaniora', sppdRole: 'dekan', unitId: 'fhm', email: 'dekan.fhm@univsm.ac.id', phone: '081200000005', avatar: 'RH', role: 'user', password: 'password' },
  { id: 6, name: 'Nurul Hidayah, S.T., M.Kom.', nik: '3501010101900006', nidn: '1106069001', jabatan: 'Kaprodi Ilmu Komputer', sppdRole: 'wakil_dekan', unitId: 'ilkom', email: 'kaprodi.ilkom@univsm.ac.id', phone: '081200000006', avatar: 'NH', role: 'user', password: 'password' },
  { id: 7, name: 'Ahmad Fauzi, S.Pd., M.Pd.', nik: '3501010101870007', nidn: '', jabatan: 'Bagian Akademik', sppdRole: 'kabag', unitId: 'aka', email: 'bag.akd@univsm.ac.id', phone: '081200000007', avatar: 'AF', role: 'user', password: 'password' },
  { id: 8, name: 'Dewi Lestari, A.Md.', nik: '3501010101920008', nidn: '', jabatan: 'Staf TU', sppdRole: 'staf', unitId: 'tu', email: 'staf.tu@univsm.ac.id', phone: '081200000008', avatar: 'DL', role: 'user', password: 'password' },
]

export const useAuthStore = defineStore('auth', () => {
  const users = ref([...INITIAL_USERS])
  const currentUser = ref(null)
  
  const isAuthenticated = computed(() => currentUser.value !== null)
  const isAdmin = computed(() => currentUser.value?.role === 'super_admin')
  const isUnitAdmin = computed(() => currentUser.value?.role === 'admin')
  const isPimpinan = computed(() => currentUser.value?.role === 'pimpinan')
  const isRegularUser = computed(() => currentUser.value?.role === 'user')

  // Login backend GAS
  async function loginWithCredentials(email, password) {
    try {
      console.log('Mencoba login via API GAS...')
      const res = await gasPost('login', { email, password })
      
      if (res && res.success && res.user) {
        // Berhasil login dari Google Sheet
        currentUser.value = res.user
        localStorage.setItem('eoffice_user', JSON.stringify(res.user))
        return true
      }
    } catch (e) {
      console.warn('Login GAS gagal/timeout, mencoba fallback lokal...', e)
    }

    // FALLBACK LOKAL: Jika spreadsheet masih kosong atau belum disiapkan, gunakan data statis
    console.log('Menggunakan autentikasi lokal (Fallback)...')
    const user = users.value.find(u => u.email === email && u.password === password)
    if (user) {
      currentUser.value = user
      localStorage.setItem('eoffice_user', JSON.stringify(user))
      return true
    }
    
    return false
  }

  function logout() {
    currentUser.value = null
    localStorage.removeItem('eoffice_user')
  }

  function restoreSession() {
    const saved = localStorage.getItem('eoffice_user')
    if (saved) {
      try { 
        const parsed = JSON.parse(saved)
        // Refresh with latest data from users ref in case it was updated
        const freshUser = users.value.find(u => u.id === parsed.id)
        if (freshUser) currentUser.value = freshUser
        else currentUser.value = parsed
      } catch {}
    }
  }

  // --- CRUD Users for Admin ---
  function addUser(userData) {
    const newId = Math.max(...users.value.map(u => u.id), 0) + 1
    const newUser = {
      ...userData,
      id: newId,
      avatar: userData.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    }
    users.value.push(newUser)
  }

  function updateUser(id, userData) {
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) {
      users.value[idx] = { ...users.value[idx], ...userData }
      // Update session if editing self
      if (currentUser.value?.id === id) {
        currentUser.value = { ...users.value[idx] }
        localStorage.setItem('eoffice_user', JSON.stringify(currentUser.value))
      }
    }
  }

  function deleteUser(id) {
    users.value = users.value.filter(u => u.id !== id)
  }

  restoreSession()

  // Export MOCK_USERS for the login dropdown backward compatibility
  const MOCK_USERS = computed(() => users.value)

  return { 
    users, 
    currentUser, 
    isAuthenticated, 
    isAdmin, 
    isUnitAdmin,
    isPimpinan,
    isRegularUser,
    loginWithCredentials, 
    logout, 
    MOCK_USERS,
    addUser,
    updateUser,
    deleteUser
  }
})
