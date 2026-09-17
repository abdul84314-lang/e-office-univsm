const fs = require('fs');

let code = fs.readFileSync('src/stores/documents.js', 'utf8');

// 1. Update fetchDocuments to load AgendaManual
code = code.replace(
  /documents\.value = res\.documents\.filter\(d => d\.type === 'SuratKeluar' \|\| \(\!d\.isSPPD && \!d\.asalSurat\)\)/,
  \
        documents.value = res.documents.filter(d => d.type === 'SuratKeluar' || (!d.isSPPD && !d.asalSurat && d.type !== 'AgendaManual'))
        agendaManual.value = res.documents.filter(d => d.type === 'AgendaManual')\
);

// 2. Add DB save to generateNomorManual
code = code.replace(
  /id: 'MANUAL-' \+ Date\.now\(\),/,
  \id: 'MANUAL-' + Date.now(),
      type: 'AgendaManual',\
);

code = code.replace(
  /agendaManual\.value\.push\(record\)\s*return record/,
  \gendaManual.value.push(record)
    // Save to DB
    gasPost('save_document', record)
    return record\
);

// 3. Add updateAgenda and deleteAgenda
const newMethods = \
  async function updateAgenda(recordId, data) {
    const doc = agendaManual.value.find(d => d.id === recordId)
    if (doc) {
      Object.assign(doc, data)
      await gasPost('update_document', doc)
    }
  }

  async function deleteAgenda(recordId) {
    const idx = agendaManual.value.findIndex(d => d.id === recordId)
    if (idx !== -1) {
      agendaManual.value.splice(idx, 1)
      await gasPost('delete_document', { id: recordId })
    }
  }

  return {
\;

code = code.replace(/return \{\s*documents, agendaManual/, newMethods + '    documents, agendaManual');
code = code.replace(
  /generateNomorManual\s*\}/,
  'generateNomorManual, updateAgenda, deleteAgenda\n  }'
);

fs.writeFileSync('src/stores/documents.js', code);
