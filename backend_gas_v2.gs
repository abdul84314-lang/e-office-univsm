/**
 * BACKEND GOOGLE APPS SCRIPT (GAS) - E-OFFICE UNIVSM v2
 * 
 * Cara Penggunaan:
 * 1. Buka Google Spreadsheet E-Office Anda
 * 2. Pastikan sheet berikut ADA: "Users", "Units", "SuratKeluar", "SPPD"
 * 3. Buka menu Ekstensi -> Apps Script
 * 4. Paste semua kode ini.
 * 5. Klik "Terapkan" (Deploy) -> Kelola Deployment (atau Deployment Baru) -> Pilih jenis "Aplikasi Web".
 * 6. WAJIB set Akses: "Siapa saja" (Anyone).
 * 7. Salin URL Web App yang baru dan update di src/api/gasClient.js
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doPost(e) {
  try {
    const action = e.parameter.action;
    const data = JSON.parse(e.postData.contents);
    
    if (action === 'login') return handleLogin(data);
    if (action === 'save_document') return handleSaveDocument(data);
    if (action === 'update_document') return handleUpdateDocument(data);
    if (action === 'save_sppd') return handleSaveSppd(data);
    if (action === 'save_surat_masuk') return handleSaveSuratMasuk(data);
    if (action === 'update_surat_masuk') return handleUpdateSuratMasuk(data);
    
    return jsonResponse({ error: 'Action not found' }, 404);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'get_documents') return handleGetDocuments();
    if (action === 'get_sppd') return handleGetSppd();
    if (action === 'get_surat_masuk') return handleGetSuratMasuk();
    
    return jsonResponse({ status: 'API E-Office UNIVSM v2 Aktif' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

function jsonResponse(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// HANDLERS
// ==========================================

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

// --- SURAT KELUAR ---
// Columns: 
// 0:id, 1:unitId, 2:sifatTujuan, 3:judul, 4:perihal, 5:penandatanganId, 6:nomorSurat, 7:status
// 8:statusHistory (JSON), 9:tte (JSON), 10:createdAt, 11:createdBy, 12:fileTteUrl, 13:fileTteName, 14:tteMethod

function handleGetDocuments() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SuratKeluar");
  if (!sheet) return jsonResponse({ success: true, documents: [] });
  
  const rows = sheet.getDataRange().getValues();
  const docs = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    docs.push({
      id: rows[i][0],
      unitId: rows[i][1],
      sifatTujuan: rows[i][2],
      judul: rows[i][3],
      perihal: rows[i][4],
      penandatanganId: rows[i][5],
      nomorSurat: rows[i][6],
      status: rows[i][7],
      statusHistory: rows[i][8] ? JSON.parse(rows[i][8]) : [],
      tte: rows[i][9] ? JSON.parse(rows[i][9]) : null,
      createdAt: rows[i][10],
      createdBy: rows[i][11],
      fileTteUrl: rows[i][12],
      fileTteName: rows[i][13],
      tteMethod: rows[i][14] || 'bsre',
      isSPPD: false
    });
  }
  return jsonResponse({ success: true, documents: docs });
}

function handleSaveDocument(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SuratKeluar");
  if (!sheet) throw new Error("Sheet 'SuratKeluar' tidak ditemukan!");
  
  sheet.appendRow([
    data.id, data.unitId, data.sifatTujuan, data.judul, data.perihal,
    data.penandatanganId, data.nomorSurat || '', data.status,
    JSON.stringify(data.statusHistory || []),
    JSON.stringify(data.tte || null),
    data.createdAt, data.createdBy,
    data.fileTteUrl || '', data.fileTteName || '', data.tteMethod || 'bsre'
  ]);
  
  return jsonResponse({ success: true, id: data.id });
}

function handleUpdateDocument(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SuratKeluar");
  if (!sheet) throw new Error("Sheet 'SuratKeluar' tidak ditemukan!");
  
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      rowIndex = i + 1; // 1-based index for GAS Range
      break;
    }
  }
  
  if (rowIndex > -1) {
    // Update entire row
    sheet.getRange(rowIndex, 1, 1, 15).setValues([[
      data.id, data.unitId, data.sifatTujuan, data.judul, data.perihal,
      data.penandatanganId, data.nomorSurat || '', data.status,
      JSON.stringify(data.statusHistory || []),
      JSON.stringify(data.tte || null),
      data.createdAt, data.createdBy,
      data.fileTteUrl || '', data.fileTteName || '', data.tteMethod || 'bsre'
    ]]);
    return jsonResponse({ success: true, id: data.id });
  } else {
    // Fallback if not found, create new
    return handleSaveDocument(data);
  }
}

// --- SPPD ---
// Columns:
// 0:id, 1:sppdNumber, 2:unitId, 3:dasar, 4:tujuan, 5:waktuBerangkat, 6:waktuKembali, 
// 7:transportasi, 8:bebanAnggaran, 9:keterangan, 10:createdAt, 11:createdBy, 12:pegawaiList (JSON)

function handleGetSppd() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SPPD");
  if (!sheet) return jsonResponse({ success: true, sppds: [] });
  
  const rows = sheet.getDataRange().getValues();
  const sppds = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    sppds.push({
      id: rows[i][0],
      sppdNumber: rows[i][1],
      unitId: rows[i][2],
      dasar: rows[i][3],
      tujuan: rows[i][4],
      waktuBerangkat: rows[i][5],
      waktuKembali: rows[i][6],
      transportasi: rows[i][7],
      bebanAnggaran: rows[i][8],
      keterangan: rows[i][9],
      createdAt: rows[i][10],
      createdBy: rows[i][11],
      pegawaiList: rows[i][12] ? JSON.parse(rows[i][12]) : [],
      isSPPD: true
    });
  }
  return jsonResponse({ success: true, sppds: sppds });
}

function handleSaveSppd(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SPPD");
  if (!sheet) throw new Error("Sheet 'SPPD' tidak ditemukan!");
  
  sheet.appendRow([
    data.id, data.sppdNumber, data.unitId, data.dasar, data.tujuan,
    data.waktuBerangkat, data.waktuKembali, data.transportasi,
    data.bebanAnggaran, data.keterangan, data.createdAt, data.createdBy,
    JSON.stringify(data.pegawaiList || [])
  ]);
  
  return jsonResponse({ success: true, id: data.id });
}

// --- SURAT MASUK ---
// Columns:
// 0:id, 1:asalSurat, 2:nomorSuratAsal, 3:tanggalSurat, 4:perihal, 5:penerimaId, 
// 6:status, 7:createdAt, 8:fileLampiran, 9:disposisi (JSON), 10:tindakLanjut (JSON)

function handleGetSuratMasuk() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SuratMasuk");
  if (!sheet) return jsonResponse({ success: true, documents: [] });
  
  const rows = sheet.getDataRange().getValues();
  const docs = [];
  
  for (let i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    docs.push({
      id: rows[i][0],
      asalSurat: rows[i][1],
      nomorSuratAsal: rows[i][2],
      tanggalSurat: rows[i][3],
      perihal: rows[i][4],
      penerimaId: rows[i][5],
      status: rows[i][6],
      createdAt: rows[i][7],
      fileLampiran: rows[i][8],
      disposisi: rows[i][9] ? JSON.parse(rows[i][9]) : null,
      tindakLanjut: rows[i][10] ? JSON.parse(rows[i][10]) : null,
    });
  }
  return jsonResponse({ success: true, documents: docs });
}

function handleSaveSuratMasuk(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SuratMasuk");
  if (!sheet) throw new Error("Sheet 'SuratMasuk' tidak ditemukan!");
  
  sheet.appendRow([
    data.id, data.asalSurat, data.nomorSuratAsal, data.tanggalSurat, data.perihal,
    data.penerimaId, data.status, data.createdAt, data.fileLampiran || '',
    JSON.stringify(data.disposisi || null), JSON.stringify(data.tindakLanjut || null)
  ]);
  return jsonResponse({ success: true, id: data.id });
}

function handleUpdateSuratMasuk(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SuratMasuk");
  if (!sheet) throw new Error("Sheet 'SuratMasuk' tidak ditemukan!");
  
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  if (rowIndex > -1) {
    sheet.getRange(rowIndex, 1, 1, 11).setValues([[
      data.id, data.asalSurat, data.nomorSuratAsal, data.tanggalSurat, data.perihal,
      data.penerimaId, data.status, data.createdAt, data.fileLampiran || '',
      JSON.stringify(data.disposisi || null), JSON.stringify(data.tindakLanjut || null)
    ]]);
    return jsonResponse({ success: true, id: data.id });
  } else {
    return handleSaveSuratMasuk(data);
  }
}
