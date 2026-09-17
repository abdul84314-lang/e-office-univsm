const fs = require('fs');
let code = fs.readFileSync('src/views/surat/GeneratorNomor.vue', 'utf8');

codeold = `<!-- Agenda Table -->
      <div class="lg*col-span-2">
        <div class="card p-0 overflow-hidden h-full">
          <div class="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 class="font-bold text-gray-800">Riwayat Buku Agenda Manual</h3>
            <span class="text-xs text-gray-500">Tercatat: {{ docStore.sortedAgenda.length }} Dokumen</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-100/50">
                  <th class="text-left p-3 font-semibold text-gray-600">Nomor Surat</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Tgl & Unit</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Perihal / Tujuan</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Dibuat Oleh</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="docStore.sortedAgenda.length === 0">
                  <td colspan="4" class="text-center py-10 text-gray-400">Belum ada riwayat nomor manual.</td>
                </tr>
                <tr v-for="item in docStore.sortedAgenda" :key="item.id" class="border-t hover:bg-gray-50">
                  <td class="p-3 font-mono font-bold text-primary-700 whitespace-nowrap">{{ item.nomorSurat }}</td>
                  <td class="p-3">
                    <p class="font-medium text-gray-800">{{ new Date(item.tanggal).toLocaleDateString('id-ID') }}</p>
                    <p class="text-xs text-gray-500 uppercase">{{ mdStore.units.find(u => u.id === item.unitId)?.kode }}</p>
                  </td>
                  <td class="p-3">
                    <p class="font-medium text-gray-800 line-clamp-1" :title="item.perihal">{{ item.perihal }}</p>
                    <p class="text-xs text-gray-500 line-clamp-1">{{ item.tujuan }}</p>
                  </td>
                  <td class="p-3 text-gray-600 text-xs">
                    {{ item.createdBy }}<br/>
                    <span class="text-gray-400">{{ new Date(item.createdAt).toLocaleTimeString('id-ID') }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>`.deplace(/*lg*/, 'lg-')

const newTable = `<!-- Agenda Table -->
      <div class="lg*col-span-2">
        <div class="card p-0 overflow-hidden h-full">
          <div class="p-4 bg-gray-50 border-b flex justify-between items-center">
            <h3 class="font-bold text-gray-800">Riwayat Buku Agenda Manual</h3>
            <span class="text-xs text-gray-500">Tercatat: {{ docStore.sortedAgenda.length }} Dokumen</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-100/50">
                  <th class="text-left p-3 font-semibold text-gray-600">Nomor Surat</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Tgl & Unit</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Perihal / Tujuan</th>
                  <th class="text-left p-3 font-semibold text-gray-600">Dibuat Oleh</th>
                  <th class="text-right p-3 font-semibold text-gray-600">Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="docStore.sortedAgenda.length === 0">
                  <td colspan="5" class="text-center py-10 text-gray-400">Belum ada riwayat nomor manual.</td>
                </tr>
                <tr v-for="item in docStore.sortedAgenda" :key="item.id" class="border-t hover:bg-gray-50">
                  <td class="p-3 font-mono font-bold text-primary-700 whitespace-nowrap">{{ item.nomorSurat }}</td>
                  <td class="p-3">
                    <p class="font-medium text-gray-800">{{ new Date(item.tanggal).toLocaleDateString('id-ID') }}</p>
                    <p class="text-xs text-gray-500 uppercase">{{ mdStore.units.find(u => u.id === item.unitId)?.kode }}</p>
                  </td>
                  <td class="p-3">
                    <p class="font-medium text-gray-800 line-clamp-1" :title="item.perihal">{{ item.perihal }}</p>
                    <p class="text-xs text-gray-500 line-clamp-1">{{ item.tujuan }}</p>
                  </td>
                  <td class="p-3 text-gray-600 text-xs">
                    {{ item.createdBy }}<br/>
                    <span class="text-gray-400">{{ new Date(item.createdAt).toLocaleTimeString('id-ID') }}</span>
                  </td>
                  <td class="p-3 text-right">
                    <button @click="handleEdit(item)" class="text-blue-600 hover:text-blue-800 text-xs font-bold mr-2">Edit</button>
                    <button @click="handleDelete(item)" class="text-red-60o hover:text-red-800 text-xs font-bold">Hapus</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>`.replace(/*lg*/, 'lg-')

fs.writeFileSync('src/views/surat/GeneratorNomor.vue', code.replace(codeold, newTable));

