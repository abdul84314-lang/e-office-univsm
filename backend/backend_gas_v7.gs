/**
 * E-OFFICE UNIVSM BACKEND - v7
 * Fitur Baru v7:
 * 1. Notifikasi Email Otomatis (MailApp.sendEmail - Gratis!) dengan format HTML Lembar Disposisi resmi
 * 2. Notifikasi WhatsApp Otomatis via Gateway (Fonnte / Wablas / Custom Webhook)
 * 3. Uji Coba Notifikasi (test_notification) langsung dari Admin Panel
 * 4. Proxy Penandatanganan API BSrE BSSN (sign_bsre) -> langsung arsipkan PDF hasil BSrE ke Google Drive
 * 5. Mengembalikan object `document` (termasuk `driveFileId` & `driveViewUrl`) saat save/update
 *
 * Cara Deploy:
 * 1. Buka Google Apps Script project Anda.
 * 2. Ganti seluruh isi Code.gs dengan file ini lalu klik Save.
 * 3. Klik Deploy -> Manage deployments -> Edit (ikon pensil) -> Version: New version -> Deploy.
 * 4. Saat diminta otorisasi izin Email (MailApp) & Eksternal Request (UrlFetchApp), klik Allow/Izinkan.
 */

function doPost(e) {
  if (!e.postData || !e.postData.contents) {
    return jsonResponse({ error: 'No POST data' }, 400);
  }

  try {
    const action = e.parameter.action;
    const data = JSON.parse(e.postData.contents);

    if (action === 'login') return handleLogin(data);

    // API Universal via POST (Anti-Cache)
    if (action === 'get_table') return handleGetGeneric(data.table);
    if (action === 'save_data') return handleSaveGeneric(data.table, processDriveFiles(data.record));
    if (action === 'update_data') return handleUpdateGeneric(data.table, processDriveFiles(data.record));
    if (action === 'delete_data') return handleDeleteGeneric(data.table, data);

    // Notifikasi Email & WhatsApp (v7)
    if (action === 'send_notification') return handleSendNotification(data);
    if (action === 'test_notification') return handleTestNotification(data);

    // Integrasi API BSrE BSSN (v7)
    if (action === 'sign_bsre') return handleSignBsre(data);

    // Legacy support
    if (action === 'save_document') return handleSaveGeneric('Documents', processDriveFiles(data));
    if (action === 'update_document') return handleUpdateGeneric('Documents', processDriveFiles(data));
    if (action === 'delete_document') return handleDeleteGeneric('Documents', data);

    return jsonResponse({ error: 'Action not found: ' + action }, 404);
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === 'get_documents') return handleGetGeneric('Documents');
    if (action === 'get_table') return handleGetGeneric(e.parameter.table);
    if (action === 'get_file_b64') return handleGetFileB64(e.parameter.fileId);

    return jsonResponse({ status: 'API E-Office UNIVSM v7 Aktif (Disposisi, Email/WA Notif, BSrE Ready)' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message }, 500);
  }
}

function jsonResponse(data, code = 200) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function ensureSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["id", "type", "chunk1", "chunk2", "chunk3", "chunk4", "chunk5", "chunk6"]);
  }
  return sheet;
}

// ============================================================================
// NOTIFIKASI EMAIL (MailApp) & WHATSAPP GATEWAY (Fonnte / Wablas / Custom)
// ============================================================================

function sendWaViaGateway(phone, message, cfg) {
  if (!phone || !cfg || !cfg.waEnabled || !cfg.waApiToken) return { sent: false, reason: 'WA Gateway tidak aktif' };

  const url = cfg.waApiUrl || 'https://api.fonnte.com/send';
  const provider = cfg.waProvider || 'fonnte';

  let options;
  if (provider === 'fonnte') {
    options = {
      method: 'post',
      headers: { Authorization: cfg.waApiToken },
      payload: {
        target: phone,
        message: message,
        countryCode: '62'
      },
      muteHttpExceptions: true
    };
  } else if (provider === 'wablas') {
    options = {
      method: 'post',
      headers: { Authorization: cfg.waApiToken },
      payload: {
        phone: phone,
        message: message
      },
      muteHttpExceptions: true
    };
  } else {
    options = {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + cfg.waApiToken },
      payload: JSON.stringify({ phone: phone, target: phone, message: message }),
      muteHttpExceptions: true
    };
  }

  const res = UrlFetchApp.fetch(url, options);
  const code = res.getResponseCode();
  const body = res.getContentText();
  return { sent: code >= 200 && code < 300, code: code, body: body };
}

function handleSendNotification(payload) {
  const recipients = payload.recipients || [];
  const cfg = payload.config || {};
  const subject = payload.subject || 'Notifikasi E-Office UNIVSM';
  const htmlBody = payload.htmlBody || '<p>Anda memiliki pembaruan dokumen di E-Office UNIVSM.</p>';
  const waText = payload.waText || subject;
  const senderName = cfg.emailSenderName || 'E-Office Universitas Sapta Mandiri';

  let emailSentCount = 0;
  let waSentCount = 0;
  const errors = [];

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];

    // 1. Kirim Email otomatis (Gratis via Google Apps Script MailApp)
    if (cfg.emailEnabled !== false && r.email) {
      try {
        MailApp.sendEmail({
          to: r.email,
          subject: subject,
          htmlBody: htmlBody,
          name: senderName
        });
        emailSentCount++;
      } catch (e) {
        errors.push('Email ke ' + r.email + ' gagal: ' + e.message);
      }
    }

    // 2. Kirim WhatsApp otomatis jika Token WA Gateway tersedia
    if (cfg.waEnabled && cfg.waApiToken && r.phone) {
      try {
        const waRes = sendWaViaGateway(r.phone, waText, cfg);
        if (waRes.sent) waSentCount++;
        else errors.push('WA ke ' + r.phone + ' gagal (HTTP ' + waRes.code + ')');
      } catch (e) {
        errors.push('WA ke ' + r.phone + ' error: ' + e.message);
      }
    }
  }

  const msgParts = [];
  msgParts.push('Email terkirim: ' + emailSentCount);
  if (cfg.waEnabled && cfg.waApiToken) {
    msgParts.push('WA Gateway terkirim: ' + waSentCount);
  } else {
    msgParts.push('WA Gateway belum aktif (gunakan tombol Kirim WA)');
  }
  if (errors.length) {
    msgParts.push('Catatan: ' + errors.join('; '));
  }

  return jsonResponse({
    success: errors.length === 0 || emailSentCount > 0 || waSentCount > 0,
    emailSentCount: emailSentCount,
    waSentCount: waSentCount,
    errors: errors,
    message: msgParts.join(' | ')
  });
}

function handleTestNotification(payload) {
  const recips = [{
    name: 'Admin Uji Coba',
    email: payload.email || '',
    phone: payload.phone || ''
  }];

  return handleSendNotification({
    recipients: recips,
    config: payload.config || {},
    subject: '[Uji Coba] Koneksi Notifikasi E-Office UNIVSM v7 Berhasil',
    htmlBody: '<div style="font-family:Arial,sans-serif;padding:16px;border:1px solid #d1fae5;background:#ecfdf5;border-radius:8px;">' +
              '<h3 style="color:#065f46;margin-top:0;">Notifikasi E-Office UNIVSM Aktif!</h3>' +
              '<p>Pengiriman email otomatis dari Google Apps Script v7 telah berjalan dengan baik.</p>' +
              '</div>',
    waText: '*UJI COBA E-OFFICE UNIVSM*\nKoneksi notifikasi WhatsApp Gateway berhasil terhubung!'
  });
}

// ============================================================================
// INTEGRASI API TTE BSrE (BSSN E-Sign)
// ============================================================================

function handleSignBsre(payload) {
  const cfg = payload.config || {};
  if (!cfg.bsreApiUrl) {
    return jsonResponse({ success: false, error: 'URL Endpoint API BSrE belum dikonfigurasi di Pengaturan Admin.' });
  }
  if (!payload.pdfBase64 || !payload.nik || !payload.passphrase) {
    return jsonResponse({ success: false, error: 'PDF, NIK, dan Passphrase BSrE wajib diisi.' });
  }

  try {
    const fileName = payload.fileName || ('BSrE_' + (payload.docId || Date.now()) + '.pdf');
    const pdfBlob = Utilities.newBlob(Utilities.base64Decode(payload.pdfBase64), 'application/pdf', fileName);

    const headers = {};
    if (cfg.bsreUsername && cfg.bsrePassword) {
      headers.Authorization = 'Basic ' + Utilities.base64Encode(cfg.bsreUsername + ':' + cfg.bsrePassword);
    }

    const res = UrlFetchApp.fetch(cfg.bsreApiUrl, {
      method: 'post',
      headers: headers,
      payload: {
        file: pdfBlob,
        nik: String(payload.nik),
        passphrase: String(payload.passphrase),
        tampilan: 'invisible'
      },
      muteHttpExceptions: true
    });

    const code = res.getResponseCode();
    if (code < 200 || code >= 300) {
      return jsonResponse({
        success: false,
        error: 'Server BSrE menolak permintaan (HTTP ' + code + '): ' + res.getContentText()
      });
    }

    // Simpan hasil PDF yang sudah ditandatangani BSrE ke Google Drive Archive
    const signedBlob = res.getBlob().setName(fileName);
    const folder = getOrCreateArchiveFolder();
    const savedFile = folder.createFile(signedBlob);

    return jsonResponse({
      success: true,
      driveFileId: savedFile.getId(),
      driveViewUrl: 'https://drive.google.com/file/d/' + savedFile.getId() + '/preview',
      driveDownloadUrl: savedFile.getDownloadUrl()
    });
  } catch (e) {
    return jsonResponse({ success: false, error: 'Gagal menghubungi server BSrE: ' + e.message });
  }
}

// ============================================================================
// GOOGLE DRIVE ARCHIVE LOGIC
// ============================================================================

function getOrCreateArchiveFolder() {
  const folderName = "Arsip E-Office UNIVSM";
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    const folder = DriveApp.createFolder(folderName);
    folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return folder;
  }
}

function processDriveFiles(record) {
  if (!record || !record.fileBase64) return record;

  const folder = getOrCreateArchiveFolder();
  const b64Data = record.fileBase64;
  const mimeType = record.fileMime || 'application/pdf';
  const fileName = record.fileName || (record.nomorSurat ? ('Surat_' + record.nomorSurat.replace(/\//g, '_') + '.pdf') : ('Document_' + record.id + '.pdf'));

  const blob = Utilities.newBlob(Utilities.base64Decode(b64Data), mimeType, fileName);

  let file;
  if (record.driveFileId) {
    try {
      file = DriveApp.getFileById(record.driveFileId);
      file.setTrashed(true);
    } catch (e) {}
    file = folder.createFile(blob);
  } else {
    file = folder.createFile(blob);
  }

  record.driveFileId = file.getId();
  record.driveViewUrl = 'https://drive.google.com/file/d/' + file.getId() + '/preview';
  record.driveDownloadUrl = file.getDownloadUrl();
  delete record.fileBase64;
  return record;
}

function handleGetFileB64(fileId) {
  if (!fileId) throw new Error("fileId wajib diisi");
  const file = DriveApp.getFileById(fileId);
  const base64 = Utilities.base64Encode(file.getBlob().getBytes());
  return jsonResponse({ success: true, base64: base64, mime: file.getMimeType() });
}

// ============================================================================
// UNIVERSAL JSON STORAGE LOGIC
// ============================================================================

const CHUNK_SIZE = 45000;

function chunkString(str) {
  const chunks = [];
  for (let i = 0; i < str.length; i += CHUNK_SIZE) {
    chunks.push(str.substring(i, i + CHUNK_SIZE));
  }
  return chunks;
}

function handleGetGeneric(tableName) {
  if (!tableName) throw new Error("Nama tabel wajib diisi.");
  const sheet = ensureSheet(tableName);
  const rows = sheet.getDataRange().getValues();
  const records = [];

  for (let i = 1; i < rows.length; i++) {
    try {
      const fullJsonStr = (rows[i][2] || '') + (rows[i][3] || '') + (rows[i][4] || '') +
                          (rows[i][5] || '') + (rows[i][6] || '') + (rows[i][7] || '');
      if (fullJsonStr) {
        records.push(JSON.parse(fullJsonStr));
      }
    } catch (e) {}
  }

  if (tableName === 'Documents') {
    return jsonResponse({ success: true, documents: records });
  }
  return jsonResponse({ success: true, data: records });
}

function handleSaveGeneric(tableName, recordData) {
  if (!tableName || !recordData || !recordData.id) throw new Error("Data tidak valid.");
  const sheet = ensureSheet(tableName);

  const docType = recordData.type || 'Generic';
  const jsonStr = JSON.stringify(recordData);
  const chunks = chunkString(jsonStr);

  const rowData = [
    recordData.id, docType,
    chunks[0] || '', chunks[1] || '', chunks[2] || '',
    chunks[3] || '', chunks[4] || '', chunks[5] || ''
  ];
  sheet.appendRow(rowData);
  return jsonResponse({ success: true, id: recordData.id, document: recordData });
}

function handleUpdateGeneric(tableName, recordData) {
  if (!tableName || !recordData || !recordData.id) throw new Error("Data tidak valid.");
  const sheet = ensureSheet(tableName);
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == recordData.id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex !== -1) {
    const docType = recordData.type || 'Generic';
    const jsonStr = JSON.stringify(recordData);
    const chunks = chunkString(jsonStr);
    sheet.getRange(rowIndex, 1, 1, 8).setValues([[
      recordData.id, docType,
      chunks[0] || '', chunks[1] || '', chunks[2] || '',
      chunks[3] || '', chunks[4] || '', chunks[5] || ''
    ]]);
    return jsonResponse({ success: true, id: recordData.id, document: recordData });
  } else {
    return handleSaveGeneric(tableName, recordData);
  }
}

function handleDeleteGeneric(tableName, payload) {
  if (!tableName || !payload.id) throw new Error("ID tidak valid.");
  const sheet = ensureSheet(tableName);
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == payload.id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex !== -1) {
    sheet.deleteRow(rowIndex);
    return jsonResponse({ success: true, id: payload.id });
  }
  return jsonResponse({ success: false, error: 'Data tidak ditemukan' }, 404);
}

function handleLogin(data) {
  const sheet = ensureSheet('Users');
  const rows = sheet.getDataRange().getValues();
  let isLegacyFormat = false;
  if (rows.length > 1 && rows[0][2] === 'email' && rows[0][3] === 'password') {
    isLegacyFormat = true;
  }

  for (let i = 1; i < rows.length; i++) {
    if (isLegacyFormat) {
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
    } else {
      try {
        const fullJsonStr = (rows[i][2] || '') + (rows[i][3] || '') + (rows[i][4] || '');
        if (fullJsonStr) {
          const user = JSON.parse(fullJsonStr);
          if (user.email === data.email && user.password === data.password) {
            return jsonResponse({ success: true, user });
          }
        }
      } catch (e) {}
    }
  }
  return jsonResponse({ success: false, message: 'Email atau Password salah' });
}

/**
 * Jalankan fungsi ini 1x dari editor Google Apps Script (pilih 'otorisasiEmail' lalu klik Run)
 * untuk memicu dialog izin pengiriman email (MailApp.sendEmail).
 */
function otorisasiEmail() {
  const sisa = MailApp.getRemainingDailyQuota();
  Logger.log('Izin MailApp AKTIF! Sisa kuota email hari ini: ' + sisa);
  const myEmail = Session.getActiveUser().getEmail();
  if (myEmail) {
    MailApp.sendEmail(myEmail, 'Tes Otorisasi E-Office UNIVSM', 'Izin pengiriman email E-Office UNIVSM berhasil aktif!');
  }
}
