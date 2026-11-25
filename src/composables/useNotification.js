import { gasPost } from '../api/gasClient.js'
import { useSettingsStore } from '../stores/settings.js'

export const SIFAT_SURAT_OPTIONS = [
  { key: 'sangat_segera', label: 'Sangat Segera' },
  { key: 'segera', label: 'Segera' },
  { key: 'rahasia', label: 'Rahasia' },
]

export const DISPOSISI_HARAP_DEFAULTS = [
  'Tanggapan dan Saran',
  'Proses Lebih Lanjut',
  'Koordinasi / Konfirmasikan',
]

export function formatIndonesianDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatShortSlashDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date()
  if (isNaN(d.getTime())) return dateStr || ''
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export function normalizeWaPhone(phone) {
  if (!phone) return ''
  let clean = String(phone).replace(/[^0-9]/g, '')
  if (!clean) return ''
  if (clean.startsWith('0')) clean = '62' + clean.slice(1)
  else if (clean.startsWith('8')) clean = '62' + clean
  return clean
}

export function buildWaLink(phone, text) {
  const normalized = normalizeWaPhone(phone)
  if (!normalized) return `https://wa.me/?text=${encodeURIComponent(text)}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`
}

export function getAppBaseUrl() {
  const settingsStore = useSettingsStore()
  const base = settingsStore.settings?.appBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '')
  return base.replace(/\/+$/, '')
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br/>')
}

export function getSifatLabel(key) {
  return SIFAT_SURAT_OPTIONS.find(s => s.key === key)?.label || 'Segera'
}

/**
 * Bangun HTML Email berbentuk Lembar Disposisi resmi (tanpa perlu cetak/download PDF)
 */
export function buildDisposisiEmailHtml(doc, disposisi, appLink) {
  const sifat = disposisi.sifatSurat || doc.sifatSurat || 'segera'
  const checkBox = (active) => active ? '&#9745;' : '&#9744;'

  const penerimaRows = (disposisi.penerimaList || [{ nama: disposisi.kepadaNama || '-' }])
    .map((p, idx) => `<div style="margin-bottom:4px;">${idx + 1}. ${escapeHtml(p.jabatan ? `${p.jabatan} (${p.nama})` : p.nama)}</div>`)
    .join('')

  const harapSelected = disposisi.harapList || []
  const harapRows = DISPOSISI_HARAP_DEFAULTS
    .map(item => `<div style="margin-bottom:4px;">${checkBox(harapSelected.includes(item))} ${escapeHtml(item)}</div>`)
    .join('')

  const custom1 = disposisi.harapCustom1 ? `<div style="margin-bottom:4px;">&#9745; ${escapeHtml(disposisi.harapCustom1)}</div>` : ''
  const custom2 = disposisi.harapCustom2 ? `<div style="margin-bottom:4px;">&#9745; ${escapeHtml(disposisi.harapCustom2)}</div>` : ''

  const driveBtn = doc.driveViewUrl
    ? `<a href="${doc.driveViewUrl}" style="display:inline-block;padding:10px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;margin-left:8px;">Lihat Lampiran Surat (Drive)</a>`
    : ''

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;color:#111827;background:#f9fafb;padding:20px;">
    <div style="background:#ffffff;border:2px solid #111827;padding:20px;">
      <div style="text-align:center;border-bottom:3px double #111827;padding-bottom:10px;margin-bottom:12px;">
        <div style="font-size:11px;letter-spacing:0.5px;">YAYASAN SAPTA BAKTI PENDIDIKAN</div>
        <div style="font-size:18px;font-weight:bold;">UNIVERSITAS SAPTA MANDIRI</div>
        <div style="font-size:12px;font-weight:bold;">SK Pendirian No. 661 / E/O/2024</div>
      </div>

      <table style="width:100%;border-collapse:collapse;border:2px solid #111827;font-size:13px;">
        <tr>
          <td colspan="2" style="text-align:center;font-weight:bold;font-size:15px;padding:8px;border-bottom:3px double #111827;background:#f8fafc;">
            LEMBAR DISPOSISI
          </td>
        </tr>
        <tr>
          <td style="width:50%;vertical-align:top;padding:10px;border-right:1px solid #111827;border-bottom:1px solid #111827;">
            <div style="margin-bottom:6px;"><strong>Surat Dari :</strong> ${escapeHtml(doc.asalSurat)}</div>
            <div style="margin-bottom:6px;"><strong>Nomor Surat :</strong><br/>${escapeHtml(doc.nomorSuratAsal)}</div>
            <div><strong>Tanggal Surat :</strong> ${escapeHtml(formatIndonesianDate(doc.tanggalSurat))}</div>
          </td>
          <td style="width:50%;vertical-align:top;padding:10px;border-bottom:1px solid #111827;">
            <div style="margin-bottom:6px;"><strong>Diterima Tanggal :</strong> ${escapeHtml(formatIndonesianDate(doc.tanggalDiterima || doc.createdAt))}</div>
            <div style="margin-bottom:6px;"><strong>Nomor Agenda :</strong> ${escapeHtml(doc.nomorAgenda || doc.id)}</div>
            <div style="margin-bottom:6px;"><strong>Sifat Surat :</strong></div>
            <div style="font-size:12px;">
              ${checkBox(sifat === 'sangat_segera')} Sangat Segera &nbsp;
              ${checkBox(sifat === 'segera')} Segera &nbsp;
              ${checkBox(sifat === 'rahasia')} Rahasia
            </div>
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:10px;border-bottom:1px solid #111827;">
            <strong>Perihal :</strong> <em>${escapeHtml(doc.perihal)}</em>
          </td>
        </tr>
        <tr>
          <td style="width:50%;vertical-align:top;padding:10px;border-right:1px solid #111827;border-bottom:1px solid #111827;">
            <div style="font-weight:bold;margin-bottom:8px;">Diteruskan Kepada :</div>
            ${penerimaRows}
          </td>
          <td style="width:50%;vertical-align:top;padding:10px;border-bottom:1px solid #111827;">
            <div style="font-weight:bold;margin-bottom:8px;">Dengan Hormat Harap :</div>
            ${harapRows}
            ${custom1}
            ${custom2}
          </td>
        </tr>
        <tr>
          <td colspan="2" style="padding:10px;">
            <div style="font-weight:bold;margin-bottom:6px;">Catatan :</div>
            <div style="line-height:1.6;margin-bottom:16px;">${escapeHtml(disposisi.catatan || disposisi.instruksi || '-')}</div>
            <div style="text-align:right;font-size:12px;color:#374151;">
              <div><strong>${escapeHtml(disposisi.olehNama)}</strong> (${escapeHtml(disposisi.olehJabatan || 'Pimpinan')})</div>
              <div>Paraf Elektronik &bull; ${escapeHtml(disposisi.parafTanggal || formatShortSlashDate(disposisi.tanggal))}</div>
            </div>
          </td>
        </tr>
      </table>

      <div style="margin-top:18px;text-align:center;">
        <a href="${appLink}" style="display:inline-block;padding:10px 18px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">
          Buka Disposisi di E-Office
        </a>
        ${driveBtn}
      </div>
      <p style="font-size:11px;color:#6b7280;text-align:center;margin-top:14px;">
        Notifikasi otomatis E-Office Universitas Sapta Mandiri. Tidak perlu mencetak/mengunduh PDF untuk menindaklanjuti disposisi ini.
      </p>
    </div>
  </div>`
}

export function buildDisposisiWaText(doc, disposisi, appLink) {
  const sifat = getSifatLabel(disposisi.sifatSurat || doc.sifatSurat)
  const penerimaText = (disposisi.penerimaList || [{ nama: disposisi.kepadaNama || '-' }])
    .map((p, i) => `${i + 1}. ${p.jabatan ? `${p.jabatan} (${p.nama})` : p.nama}`)
    .join('\n')

  const harapItems = [
    ...(disposisi.harapList || []),
    ...(disposisi.harapCustom1 ? [disposisi.harapCustom1] : []),
    ...(disposisi.harapCustom2 ? [disposisi.harapCustom2] : []),
  ]
  const harapText = harapItems.length ? harapItems.map(h => `☑ ${h}`).join('\n') : '-'

  let msg = `*LEMBAR DISPOSISI - E-OFFICE UNIVSM*\n`
  msg += `━━━━━━━━━━━━━━━━━━━\n`
  msg += `*Sifat:* ${sifat}\n`
  msg += `*Surat Dari:* ${doc.asalSurat}\n`
  msg += `*No. Surat:* ${doc.nomorSuratAsal}\n`
  msg += `*No. Agenda:* ${doc.nomorAgenda || doc.id}\n`
  msg += `*Perihal:* ${doc.perihal}\n\n`
  msg += `*Diteruskan Kepada:*\n${penerimaText}\n\n`
  msg += `*Dengan Hormat Harap:*\n${harapText}\n\n`
  msg += `*Catatan (${disposisi.olehNama}):*\n${disposisi.catatan || disposisi.instruksi || '-'}\n\n`
  msg += `🔗 *Buka Disposisi:* ${appLink}`
  if (doc.driveViewUrl) {
    msg += `\n📄 *Lampiran Surat:* ${doc.driveViewUrl}`
  }
  return msg
}

export function buildSuratMasukEmailHtml(doc, penerima, appLink) {
  const driveBtn = doc.driveViewUrl
    ? `<a href="${doc.driveViewUrl}" style="display:inline-block;padding:10px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;margin-left:8px;">Lihat File Surat</a>`
    : ''
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#111827;background:#f9fafb;padding:20px;">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px;">
      <h2 style="margin:0 0 8px;color:#1e3a8a;">Surat Masuk Baru Menunggu Disposisi</h2>
      <p style="font-size:13px;color:#4b5563;margin:0 0 16px;">Yth. <strong>${escapeHtml(penerima?.name || 'Pimpinan')}</strong>, terdapat surat masuk baru yang ditujukan kepada Anda:</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:150px;">Asal Surat</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(doc.asalSurat)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Nomor Surat</td><td style="padding:6px 0;">${escapeHtml(doc.nomorSuratAsal)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Nomor Agenda</td><td style="padding:6px 0;">${escapeHtml(doc.nomorAgenda || doc.id)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Sifat Surat</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(getSifatLabel(doc.sifatSurat))}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Tanggal Surat</td><td style="padding:6px 0;">${escapeHtml(formatIndonesianDate(doc.tanggalSurat))}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Perihal</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(doc.perihal)}</td></tr>
      </table>
      <div style="margin-top:20px;">
        <a href="${appLink}" style="display:inline-block;padding:10px 18px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">
          Buka & Buat Disposisi
        </a>
        ${driveBtn}
      </div>
    </div>
  </div>`
}

export function buildSuratMasukWaText(doc, penerima, appLink) {
  let msg = `*SURAT MASUK BARU - E-OFFICE UNIVSM*\n`
  msg += `Yth. ${penerima?.name || 'Pimpinan'},\n`
  msg += `Terdapat surat masuk menunggu disposisi Anda:\n\n`
  msg += `*Sifat:* ${getSifatLabel(doc.sifatSurat)}\n`
  msg += `*Dari:* ${doc.asalSurat}\n`
  msg += `*No. Surat:* ${doc.nomorSuratAsal}\n`
  msg += `*No. Agenda:* ${doc.nomorAgenda || doc.id}\n`
  msg += `*Perihal:* ${doc.perihal}\n\n`
  msg += `🔗 *Buat Disposisi:* ${appLink}`
  if (doc.driveViewUrl) msg += `\n📄 *Lampiran:* ${doc.driveViewUrl}`
  return msg
}

export function buildSuratKeluarEmailHtml(doc, stageLabel, appLink) {
  const driveBtn = doc.driveViewUrl
    ? `<a href="${doc.driveViewUrl}" style="display:inline-block;padding:10px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;margin-left:8px;">Buka Dokumen PDF</a>`
    : ''
  const tteBadge = doc.tteMethod === 'bsre_api' || doc.tteMethod === 'bsre_external'
    ? '<span style="background:#dcfce7;color:#166534;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;">Tersertifikasi BSrE</span>'
    : doc.status === 'selesai'
      ? '<span style="background:#dbeafe;color:#1e40af;padding:3px 8px;border-radius:4px;font-size:11px;font-weight:bold;">Disahkan Resmi</span>'
      : ''

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#111827;background:#f9fafb;padding:20px;">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:24px;">
      <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">E-Office Universitas Sapta Mandiri</div>
      <h2 style="margin:6px 0 12px;color:#1e3a8a;">${escapeHtml(stageLabel)} ${tteBadge}</h2>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:150px;">Nomor Surat</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(doc.nomorSurat || '[Menunggu Penomoran]')}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Judul / Perihal</td><td style="padding:6px 0;font-weight:bold;">${escapeHtml(doc.perihal || doc.judul)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Tujuan</td><td style="padding:6px 0;">${escapeHtml(doc.kepada || '-')}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Sifat</td><td style="padding:6px 0;text-transform:capitalize;">${escapeHtml(doc.sifatTujuan || 'internal')}</td></tr>
      </table>
      <div style="margin-top:20px;">
        <a href="${appLink}" style="display:inline-block;padding:10px 18px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;">
          Buka Surat di E-Office
        </a>
        ${driveBtn}
      </div>
    </div>
  </div>`
}

export function buildSuratKeluarWaText(doc, stageLabel, appLink) {
  let msg = `*${stageLabel.toUpperCase()} - E-OFFICE UNIVSM*\n`
  msg += `━━━━━━━━━━━━━━━━━━━\n`
  msg += `*Nomor:* ${doc.nomorSurat || '[Menunggu Penomoran]'}\n`
  msg += `*Perihal:* ${doc.perihal || doc.judul}\n`
  if (doc.kepada) msg += `*Kepada:* ${doc.kepada}\n`
  msg += `\n🔗 *Buka Surat:* ${appLink}`
  if (doc.driveViewUrl) msg += `\n📄 *File PDF:* ${doc.driveViewUrl}`
  return msg
}

/**
 * Mengirim notifikasi ke backend GAS v7 (Email otomatis + WA Gateway jika token tersedia)
 * Tidak memblokir UI secara berlebihan dan mengembalikan hasil log.
 */
export async function dispatchNotification({ recipients = [], subject, htmlBody, waText, docId, category }) {
  const settingsStore = useSettingsStore()
  const cfg = settingsStore.settings || {}

  const cleanRecipients = recipients
    .filter(r => r && (r.email || r.phone))
    .map(r => ({
      name: r.name || r.nama || 'Penerima',
      email: (r.email || '').trim(),
      phone: normalizeWaPhone(r.phone || ''),
    }))

  if (!cleanRecipients.length) {
    return {
      success: false,
      skipped: true,
      message: 'Tidak ada kontak Email/WA penerima.',
      recipients: [],
    }
  }

  const sendEmail = cfg.emailEnabled !== false
  const sendWaGateway = (cfg.waMode === 'gateway' || cfg.waMode === 'hybrid') && Boolean(cfg.waApiToken)

  if (!sendEmail && !sendWaGateway) {
    return {
      success: true,
      emailSentCount: 0,
      waSentCount: 0,
      message: 'Email dimatikan & Token WA Gateway belum diisi. Gunakan tombol Kirim Cepat WA di bawah.',
      recipients: cleanRecipients,
    }
  }

  try {
    const res = await gasPost('send_notification', {
      docId,
      category,
      subject,
      htmlBody,
      waText,
      recipients: cleanRecipients,
      config: {
        emailEnabled: sendEmail,
        emailSenderName: cfg.emailSenderName || 'E-Office Universitas Sapta Mandiri',
        waEnabled: sendWaGateway,
        waProvider: cfg.waProvider || 'fonnte',
        waApiUrl: cfg.waApiUrl || 'https://api.fonnte.com/send',
        waApiToken: cfg.waApiToken || '',
      },
    })
    return {
      ...(res || { success: false }),
      recipients: cleanRecipients,
    }
  } catch (e) {
    console.error('Notification dispatch failed:', e)
    return {
      success: false,
      error: e.message,
      recipients: cleanRecipients,
    }
  }
}
