<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSppdStore } from '../../stores/sppd.js'
import { SPPD_ZONES, formatRp } from '../../data/sppdData.js'
import DocumentKop from '../../components/common/DocumentKop.vue'

const props = defineProps({
  id: { type: String, required: true }
})

const router = useRouter()
const sppdStore = useSppdStore()

const sppd = computed(() => sppdStore.sppdList.find(s => s.id === props.id))
const calc = computed(() => sppd.value ? sppdStore.getCalc(sppd.value) : null)

function getZoneLabel(zoneId) {
  return SPPD_ZONES.find(z => z.id === zoneId)?.label ?? zoneId
}

function handlePrint() {
  window.print()
}

// Logic Penandatangan (Pejabat yang berwenang memberi perintah)
const pejabatBerwenang = computed(() => {
  // Rule: Kalau yang berangkat adalah Rektor (sppdRole == 'rektor'), yang tanda tangan Wakil Rektor II
  if (sppd.value?.sppdRole === 'rektor') {
    return {
      nama: 'Adieb Mursyada, SP., MM',
      jabatan: 'Wakil Rektor II',
      nik: '7 1 0422 020379'
    }
  } else {
    // Kalau yang berangkat BUKAN Rektor, maka yang tanda tangan adalah Rektor
    return {
      nama: 'Abdul Hamid, S.Kom., M.M., M.Kom.',
      jabatan: 'Rektor',
      nik: '3501010101850001'
    }
  }
})
</script>

<template>
  <div class="space-y-5 max-w-4xl mx-auto print:max-w-none print:w-full print:m-0 print:space-y-0">
    <!-- Header / Actions (No Print) -->
    <div class="flex items-center gap-4 print:hidden">
      <button class="btn-secondary btn-sm" @click="router.back()">â† Kembali</button>
      <div class="flex-1">
        <h1 class="text-xl font-bold text-gray-900">Detail SPPD</h1>
        <p class="text-sm text-gray-500 mt-0.5 font-mono">{{ sppd?.nomorSurat ?? props.id }}</p>
      </div>
      <button class="btn-primary btn-sm" @click="handlePrint">ðŸ–¨ï¸ Cetak SPPD</button>
    </div>

    <div v-if="sppd && calc" class="card print:shadow-none print:border-0 bg-white">
      <!-- KOP Surat -->
      <DocumentKop :unit-id="sppd.unitId" :is-internal="false" />

      <!-- Title -->
      <div class="text-center mt-6 mb-8 font-serif">
        <h2 class="text-lg font-bold text-gray-900 underline underline-offset-4 tracking-wide uppercase">
          SURAT PERINTAH PERJALANAN DINAS (SPPD)
        </h2>
        <p class="text-sm mt-1 font-bold">Nomor : {{ sppd.nomorSurat }}</p>
      </div>

      <!-- Content Table (Matches Image Format) -->
      <div class="border-2 border-black font-serif">
        <table class="w-full text-sm text-left align-top">
          <tbody>
            <!-- 1. Pejabat Berwenang -->
            <tr class="border-b border-black">
              <td class="w-8 border-r border-black p-2 text-center align-top">1.</td>
              <td class="w-1/3 border-r border-black p-2 align-top">Pejabat berwenang yang memberi perintah</td>
              <td class="p-2">
                <table class="w-full">
                  <tr><td class="w-20">Nama</td><td class="w-2">:</td><td>{{ pejabatBerwenang.nama }}</td></tr>
                  <tr><td>Jabatan</td><td>:</td><td>{{ pejabatBerwenang.jabatan }}</td></tr>
                  <tr><td>NIK/NIP</td><td>:</td><td>{{ pejabatBerwenang.nik }}</td></tr>
                </table>
              </td>
            </tr>

            <!-- 2. Pegawai yang diperintahkan -->
            <tr class="border-b border-black">
              <td class="w-8 border-r border-black p-2 text-center align-top">2.</td>
              <td class="w-1/3 border-r border-black p-2 align-top">Pegawai yang diperintahkan</td>
              <td class="p-2">
                  <table class="w-full">
                    <tr><td class="w-20 font-bold">Nama</td><td class="w-2">:</td><td class="font-bold">{{ sppd.travelers?.[0]?.nama || sppd.nama }}</td></tr>
                    <tr><td>Jabatan</td><td>:</td><td>{{ sppd.travelers?.[0]?.jabatan || sppd.jabatan }}</td></tr>
                    <tr><td>NIK/NIP</td><td>:</td><td>{{ sppd.travelers?.[0]?.nip || sppd.nip || '-' }}</td></tr>
                  </table>
                </td>
              </tr>

              <tr v-if="sppd.travelers && sppd.travelers.length > 1" class="border-b border-black">
                <td class="w-8 border-r border-black p-2 text-center align-top"></td>
                <td class="w-1/3 border-r border-black p-2 align-top">Pengikut</td>
                <td class="p-2">
                  <div v-for="(p, i) in sppd.travelers.slice(1)" :key="i" class="mb-2">
                    <table class="w-full">
                      <tr><td class="w-20 font-bold">{{ i+1 }}. Nama</td><td class="w-2">:</td><td class="font-bold">{{ p.nama }}</td></tr>
                      <tr><td class="w-20">Jabatan</td><td class="w-2">:</td><td>{{ p.jabatan }}</td></tr>
                      <tr><td class="w-20">NIK/NIP</td><td class="w-2">:</td><td>{{ p.nip }}</td></tr>
                    </table>
                  </div>
                </td>
              </tr>

              <!-- 3. Maksud Perjalanan Dinas -->
            <tr class="border-b border-black">
              <td class="w-8 border-r border-black p-2 text-center align-top">3.</td>
              <td class="w-1/3 border-r border-black p-2 align-top">Maksud Perjalanan Dinas</td>
              <td class="p-2 font-bold font-italic">"{{ sppd.keperluan }}"</td>
            </tr>

            <!-- 4. Alat angkutan yang dipergunakan -->
            <tr class="border-b border-black">
              <td class="w-8 border-r border-black p-2 text-center align-top">4.</td>
              <td class="w-1/3 border-r border-black p-2 align-top">Alat angkutan yang dipergunakan</td>
              <td class="p-2">{{ calc.transportMode === 'operasional' ? 'Transportasi Kampus' : 'Transportasi Umum / Pribadi' }}</td>
            </tr>

            <!-- 5. Tempat berangkat & tujuan -->
            <tr class="border-b border-black">
              <td class="w-8 border-r border-black p-2 text-center align-top">5.</td>
              <td class="w-1/3 border-r border-black p-2 align-top">
                a. Tempat berangkat<br/>
                b. Tempat tujuan<br/>
                c. Waktu Berangkat
              </td>
              <td class="p-2">
                a. Kampus Universitas Sapta Mandiri<br/>
                b. {{ sppd.tujuan }} ({{ getZoneLabel(sppd.zoneId) }})<br/>
                c. - 
              </td>
            </tr>

            <!-- 6. Lama perjalanan -->
            <tr class="border-b border-black">
              <td class="w-8 border-r border-black p-2 text-center align-top">6.</td>
              <td class="w-1/3 border-r border-black p-2 align-top">
                a. Lama perjalanan dinas<br/>
                b. Tanggal berangkat<br/>
                c. Tanggal kembali
              </td>
              <td class="p-2">
                a. {{ sppd.jumlahHari }} Hari<br/>
                b. {{ new Date(sppd.tanggalBerangkat).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }}<br/>
                c. {{ new Date(sppd.tanggalKembali).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }}
              </td>
            </tr>

            <!-- 7. Biaya -->
            <tr class="border-b border-black">
              <td class="w-8 border-r border-black p-2 text-center align-top">7.</td>
              <td class="w-1/3 border-r border-black p-2 align-top">Biaya</td>
              <td class="p-2">Anggaran Universitas Sapta Mandiri</td>
            </tr>

            <!-- 8. Keterangan -->
            <tr class="border-black">
              <td class="w-8 border-r border-black p-2 text-center align-top">8.</td>
              <td class="w-1/3 border-r border-black p-2 align-top">Keterangan lain-lain</td>
              <td class="p-2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TTD Block -->
      <div class="mt-8 flex justify-end font-serif text-sm">
        <div class="w-72 text-left">
          <table class="w-full mb-6">
            <tr>
              <td class="w-24">Dikeluarkan di</td>
              <td>: Balangan</td>
            </tr>
            <tr>
              <td>Pada Tanggal</td>
              <td>: {{ new Date(sppd.createdAt || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) }}</td>
            </tr>
          </table>
          
          <p class="mb-20">{{ pejabatBerwenang.jabatan }},</p>
          
          <p class="font-bold underline underline-offset-4">{{ pejabatBerwenang.nama }}</p>
          <p>NIK. {{ pejabatBerwenang.nik }}</p>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- HALAMAN 2: CATATAN KEDATANGAN & KEBERANGKATAN  -->
      <!-- ============================================== -->
      <div class="break-before-page mt-8 pt-8">
        <!-- KOP Surat Halaman 2 -->
        <DocumentKop :unit-id="sppd.unitId" :is-internal="false" />

        <!-- Tabel Halaman 2 -->
        <div class="border-2 border-black font-serif mt-6">
          <table class="w-full text-sm text-left align-top table-fixed">
            <tbody>
              <!-- Baris 1 -->
              <tr class="border-b border-black h-40">
                <td class="w-1/2 border-r border-black p-3 align-top"></td>
                <td class="w-1/2 p-3 align-top relative">
                  <p>Berangkat dari (Universitas Sapta Mandiri)</p>
                  <p>Pada Tanggal :</p>
                  <p>Tujuan &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</p>
                  <div class="absolute bottom-4 left-3 right-8 border-b border-black"></div>
                </td>
              </tr>
              <!-- Baris 2 -->
              <tr class="border-b border-black h-40">
                <td class="w-1/2 border-r border-black p-3 align-top relative">
                  <p>1. Tiba di tempat :</p>
                  <p>&nbsp;&nbsp;&nbsp;Pada Tanggal &nbsp;&nbsp;:</p>
                  <div class="absolute bottom-4 left-3 right-8 border-b border-black"></div>
                </td>
                <td class="w-1/2 p-3 align-top relative">
                  <p>Berangkat dari (........................................)</p>
                  <p>Pada Tanggal :</p>
                  <p>Tujuan &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</p>
                  <div class="absolute bottom-4 left-3 right-8 border-b border-black"></div>
                </td>
              </tr>
              <!-- Baris 3 -->
              <tr class="border-b border-black h-40">
                <td class="w-1/2 border-r border-black p-3 align-top relative">
                  <p>2. Tiba di tempat :</p>
                  <p>&nbsp;&nbsp;&nbsp;Pada Tanggal &nbsp;&nbsp;:</p>
                  <div class="absolute bottom-4 left-3 right-8 border-b border-black"></div>
                </td>
                <td class="w-1/2 p-3 align-top relative">
                  <p>Berangkat dari (........................................)</p>
                  <p>Pada Tanggal :</p>
                  <p>Tujuan &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:</p>
                  <div class="absolute bottom-4 left-3 right-8 border-b border-black"></div>
                </td>
              </tr>
              <!-- Baris 4 (Tanda tangan pimpinan) -->
              <tr class="border-black">
                <td class="w-1/2 border-r border-black p-3 align-top"></td>
                <td class="w-1/2 p-3 align-top">
                  <p>Tiba di Tempat :</p>
                  <p>Pada Tanggal :</p>
                  <p class="text-center mt-6">{{ pejabatBerwenang.jabatan }},</p>
                  <p class="text-center mt-20 font-bold underline underline-offset-4">{{ pejabatBerwenang.nama }}</p>
                  <p class="text-center">NIK. {{ pejabatBerwenang.nik }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Catatan -->
        <div class="mt-4 font-serif text-[11px] leading-tight">
          <p>CATATAN :</p>
          <ul class="list-none pl-4 mt-1 space-y-1">
            <li class="relative before:content-['-'] before:absolute before:-left-3">SEMUA BIAYA YANG MENYIMPANG DARI PERINTAH PERJALANAN DINAS MENJADI TANGGUNGAN YANG BERSANGKUTAN</li>
            <li class="relative before:content-['-'] before:absolute before:-left-3">UNIT PENERIMA TIDAK BOLEH MENERIMA PERSEKOT UNTUK PEGAWAI YANG SEDANG MELAKUKAN PERJALANAN DINAS KECUALI SEIJIN UNIT PENGIRIM</li>
            <li class="relative before:content-['-'] before:absolute before:-left-3">SPPD INI SUDAH HARUS DISERAHKAN KEMBALI SELAMBAT-LAMBATNYA 2 (DUA) MINGGU SETELAH KEMBALI DI TEMPAT</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 404 Error -->
    <div v-else class="card text-center py-12 text-gray-400">
      SPPD tidak ditemukan.
      <RouterLink to="/sppd" class="block mt-2 text-primary-700 hover:underline text-sm">â† Kembali ke daftar SPPD</RouterLink>
    </div>
  </div>
</template>
