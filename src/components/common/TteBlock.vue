<script setup>
const props = defineProps({
  tte: { type: Object, required: true },
  tanggalSurat: { type: String, default: '' },
  kotaSurat:    { type: String, default: 'Paringin' },
  method:       { type: String, default: 'bsre' }, // 'bsre' | 'basah'
  docId:        { type: String, default: 'DOC-UNIVSM' },
})
</script>

<template>
  <!-- TTE Signature block -->
  <div class="flex flex-col items-end mt-12 print:mt-16 font-serif">
    <div class="text-left w-72">
      <table class="w-full mb-3 text-sm">
        <tr>
          <td class="w-24">Dikeluarkan di</td>
          <td>: {{ kotaSurat }}</td>
        </tr>
        <tr>
          <td>Pada Tanggal</td>
          <td>: {{ tte.tanggal }}</td>
        </tr>
      </table>

      <p class="text-sm font-semibold text-gray-900 mb-2">{{ tte.signer.jabatan }},</p>

      <!-- BSrE QR Representation -->
      <div v-if="method === 'bsre'" class="flex items-center gap-3 my-4">
        <!-- Real Scannable QR -->
        <div class="w-[72px] h-[72px] p-1 border border-gray-400 rounded-sm bg-white shrink-0 flex items-center justify-center">
          <img 
            :src="`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://e-office.univsm.ac.id/verify/${docId}`" 
            alt="QR Code TTE" 
            class="w-full h-full object-contain"
          />
        </div>
        <div class="text-[9px] text-gray-500 leading-tight">
          <p class="font-bold text-gray-700">Ditandatangani secara elektronik oleh:</p>
          <p class="mt-0.5">{{ tte.signer.nama }}</p>
          <p>{{ tte.signer.jabatan }}</p>
        </div>
      </div>

      <!-- TTD Basah Space -->
      <div v-else class="h-24 w-full"></div>

      <!-- Signed name underlined -->
      <p class="text-sm font-bold text-gray-900 underline underline-offset-4 mt-2">
        {{ tte.signer.nama }}
      </p>
      <p class="text-sm text-gray-900 mt-0.5">NIK/NIDN. {{ tte.signer.nidn || tte.signer.nik || '-' }}</p>
    </div>
  </div>

  <div v-if="method === 'bsre'" class="mt-8 text-[10px] text-gray-500 border-t border-gray-300 pt-2 font-serif text-justify print:mb-0">
    <i>Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh Balai Sertifikasi Elektronik (BSrE), Badan Siber dan Sandi Negara (BSSN). Sistem memastikan keaslian dan keutuhan dokumen ini.</i>
  </div>
</template>
