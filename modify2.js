const fs = require('fs');
let content = fs.readFileSync('src/views/surat/SuratKeluarDetail.vue', 'utf8');

const newScript = \
const isEditingNomor = ref(false)
const manualNomor = ref('')

const startEditNomor = () => {
  manualNomor.value = doc.value?.nomorSurat || ''
  isEditingNomor.value = true
}

const saveNomor = async () => {
  if (doc.value) {
    await docStore.updateDocument(doc.value.id, { nomorSurat: manualNomor.value || null })
    isEditingNomor.value = false
  }
}
\;

content = content.replace('</script>', newScript + '</script>');

const headerStr = '{{ doc.nomorSurat ?? doc.id }}';
const newHeader = \
              <span v-if="!isEditingNomor">{{ doc.nomorSurat ?? doc.id }}</span>
              <div v-else class="flex items-center gap-2 mt-1">
                <input v-model="manualNomor" type="text" class="form-input text-xs py-1 px-2 h-7 w-64" placeholder="Kosongkan untuk menghapus nomor" />
                <button @click="saveNomor" class="btn-primary text-xs py-1 px-2 h-7">Simpan</button>
                <button @click="isEditingNomor = false" class="btn-secondary text-xs py-1 px-2 h-7">Batal</button>
              </div>
              <button v-if="!isEditingNomor && doc.nomorSurat && (isAdmin || auth.currentUser?.role === 'tu')" @click="startEditNomor" class="ml-2 text-xs text-blue-600 hover:underline">
                [Edit / Hapus Nomor]
              </button>
\;

content = content.replace(headerStr, newHeader);

fs.writeFileSync('src/views/surat/SuratKeluarDetail.vue', content);
