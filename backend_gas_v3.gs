/**
 * BACKEND GOOGLE APPS SCRIPT (GAS) - E-OFFICE UNIVSM v3 (JSON CHUNKS)
 * 
 * Cara Penggunaan:
 * 1. Buka Google Spreadsheet E-Office Anda
 * 2. Pastikan sheet berikut ADA: "Users", "Documents"
 *    (Kita menyatukan SuratKeluar, SPPD, dan SuratMasuk ke dalam sheet "Documents" 
 *     agar lebih fleksibel menyimpan data berukuran besar).
 * 3. Hapus kode lama, paste kode ini.
 * 4. Terapkan (Deploy) -> Kelola Deployment -> Versi Baru -> Siapa saja -> Terapkan.
 */

function doPost(e) {
  try {
    const action = e.parameter.action;
    const data = JSON.parse(e.postData.contents);
    
    if (action === 'login') return handleLogin(data);
    if (action === 'save_document') return handleSaveDocument(data);
    if (action === 'update_document') return handleUpdateDocument(data);
    if (action === 'delete_document') return handleDeleteDocument(data);
    
    return jsonResponse({ error: 'Action not found' }, 404);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'get_documents') return handleGetDocuments();
    return jsonResponse({ status: 'API E-Office UNIVSM v3 Aktif' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

function jsonResponse(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function handleLogin(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  if (!sheet) throw new Error("Sheet 'Users' tidak ditemukan!");
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][2] === data.email && rows[i][3] === data.password) {
      return jsonResponse({
        success: true,
        user: {
          id: rows[i][0], name: rows[i][1], email: rows[i][2],
          nik: rows[i][4], nidn: rows[i][5], phone: rows[i][6],
          role: rows[i][7], unitId: rows[i][8], sppdRole: rows[i][9] || 'user'
        }
      });
    }
  }
  return jsonResponse({ success: false, message: 'Email atau Password salah' });
}

// --- UNIVERSAL DOCUMENT STORAGE ---
// Columns: 0:id, 1:type, 2:chunk1, 3:chunk2, 4:chunk3, 5:chunk4, 6:chunk5, 7:chunk6
// This allows storing up to 6 * 45000 = 270,000 characters per document (enough for Base64 PDFs)

const CHUNK_SIZE = 45000;

function chunkString(str) {
  const chunks = [];
  for (let i = 0; i < str.length; i += CHUNK_SIZE) {
    chunks.push(str.substring(i, i + CHUNK_SIZE));
  }
  return chunks;
}

function handleGetDocuments() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Documents");
  if (!sheet) return jsonResponse({ success: true, documents: [] });
  
  const rows = sheet.getDataRange().getValues();
  const docs = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    let fullJson = '';
    // Concatenate chunks (cols 2 to 7)
    for (let c = 2; c <= 7; c++) {
      if (rows[i][c]) fullJson += rows[i][c];
    }
    
    if (fullJson) {
      try {
        const docObj = JSON.parse(fullJson);
        docs.push(docObj);
      } catch (e) {}
    }
  }
  return jsonResponse({ success: true, documents: docs });
}

function handleSaveDocument(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Documents");
  if (!sheet) throw new Error("Sheet 'Documents' tidak ditemukan!");
  
  const docType = data.type || (data.isSPPD ? 'SPPD' : (data.asalSurat ? 'SuratMasuk' : 'SuratKeluar'));
  const jsonStr = JSON.stringify(data);
  const chunks = chunkString(jsonStr);
  
  const rowData = [
    data.id, docType,
    chunks[0] || '', chunks[1] || '', chunks[2] || '',
    chunks[3] || '', chunks[4] || '', chunks[5] || ''
  ];
  
  sheet.appendRow(rowData);
  return jsonResponse({ success: true, id: data.id });
}

function handleUpdateDocument(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Documents");
  if (!sheet) throw new Error("Sheet 'Documents' tidak ditemukan!");
  
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const docType = data.type || (data.isSPPD ? 'SPPD' : (data.asalSurat ? 'SuratMasuk' : 'SuratKeluar'));
  const jsonStr = JSON.stringify(data);
  const chunks = chunkString(jsonStr);
  
  const rowData = [
    data.id, docType,
    chunks[0] || '', chunks[1] || '', chunks[2] || '',
    chunks[3] || '', chunks[4] || '', chunks[5] || ''
  ];
  
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, 8).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return jsonResponse({ success: true, id: data.id });
}

function handleDeleteDocument(data) {
  // Optional if needed later
  return jsonResponse({ success: true });
}
