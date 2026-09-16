/**
 * BACKEND GOOGLE APPS SCRIPT (GAS) - E-OFFICE UNIVSM
 * 
 * Cara Penggunaan:
 * 1. Buka Google Spreadsheet baru di drive.google.com
 * 2. Buat sheet dengan nama "Users", "Documents", dan "Units"
 * 3. Klik menu Ekstensi -> Apps Script
 * 4. Hapus semua kode bawaan, lalu paste kode ini.
 * 5. Klik "Terapkan" (Deploy) -> Deployment Baru -> Pilih jenis "Aplikasi Web" (Web App).
 * 6. Akses: "Siapa saja" (Anyone) -> Salin URL Web App yang dihasilkan.
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();

function doPost(e) {
  try {
    const action = e.parameter.action;
    const data = JSON.parse(e.postData.contents);
    
    if (action === 'login') {
      return handleLogin(data);
    } else if (action === 'create_document') {
      return handleCreateDocument(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ error: 'Action not found' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'get_documents') {
    return handleGetDocuments();
  } else if (action === 'get_users') {
    return handleGetUsers();
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'API E-Office UNIVSM Aktif' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// -- HANDLERS --

function handleLogin(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  const rows = sheet.getDataRange().getValues();
  // Header: id, name, email, password, nik, nidn, phone, role, unitId
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][2] === data.email && rows[i][3] === data.password) {
      const user = {
        id: rows[i][0],
        name: rows[i][1],
        email: rows[i][2],
        nik: rows[i][4],
        nidn: rows[i][5],
        phone: rows[i][6],
        role: rows[i][7],
        unitId: rows[i][8]
      };
      return ContentService.createTextOutput(JSON.stringify({ success: true, user: user }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Email atau Password salah' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleGetDocuments() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Documents");
  const rows = sheet.getDataRange().getValues();
  // Header: id, judul, perihal, unitId, status, createdAt, createdBy
  
  const docs = [];
  for (let i = 1; i < rows.length; i++) {
    docs.push({
      id: rows[i][0],
      judul: rows[i][1],
      perihal: rows[i][2],
      unitId: rows[i][3],
      status: rows[i][4],
      createdAt: rows[i][5],
      createdBy: rows[i][6]
    });
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, documents: docs }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleCreateDocument(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Documents");
  const newId = "DOC-" + new Date().getTime();
  
  sheet.appendRow([
    newId,
    data.judul,
    data.perihal,
    data.unitId,
    "draft",
    new Date().toISOString(),
    data.createdBy
  ]);
  
  return ContentService.createTextOutput(JSON.stringify({ success: true, id: newId }))
    .setMimeType(ContentService.MimeType.JSON);
}
