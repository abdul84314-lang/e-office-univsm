import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'
import { useKopSurat } from './useKopSurat.js'

/**
 * Helper: pecah teks panjang menjadi baris-baris yang muat pada lebar maxWidth
 */
function wrapText(text, font, fontSize, maxWidth) {
  const paragraphs = String(text || '').split(/\r?\n/)
  const lines = []

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push('')
      continue
    }
    const words = para.split(/\s+/)
    let current = ''
    for (const word of words) {
      const test = current ? `${current} ${word}` : word
      const width = font.widthOfTextAtSize(test, fontSize)
      if (width > maxWidth && current) {
        lines.push(current)
        current = word
      } else {
        current = test
      }
    }
    if (current) lines.push(current)
  }
  return lines
}

function uint8ToBase64(bytes) {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk)
  }
  return btoa(binary)
}

export function downloadBase64Pdf(base64, fileName = 'surat.pdf') {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Menghasilkan PDF resmi A4 dari surat yang dibuat langsung di sistem (template)
 * agar bisa diunduh dan ditandatangani lewat aplikasi BSrE Digital / API BSrE.
 */
export async function generateSystemLetterPdfBase64(doc, form, signer, { includeQr = false, verifyUrl = '' } = {}) {
  const pdfDoc = await PDFDocument.create()
  const times = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const pageWidth = 595.28 // A4 width pt
  const pageHeight = 841.89 // A4 height pt
  const marginX = 56
  const contentWidth = pageWidth - marginX * 2

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - 48

  const kop = useKopSurat(form.unitId || doc?.unitId || 'rektor')

  // Embed Logo UNIVSM di KOP PDF
  try {
    const logoPath = form.sifatTujuan === 'internal' ? '/logo-bw.png' : '/logo.png'
    const resp = await fetch(logoPath)
    if (resp.ok) {
      const logoBytes = await resp.arrayBuffer()
      const logoImg = await pdfDoc.embedPng(logoBytes)
      page.drawImage(logoImg, {
        x: marginX,
        y: pageHeight - 118,
        width: 74,
        height: 74,
      })
    }
  } catch (e) {
    console.warn('Logo KOP PDF dilewati:', e)
  }

  // Helper centered text (sedikit geser kanan agar seimbang dengan logo)
  const textCenterX = pageWidth / 2 + 24
  const drawCentered = (txt, size, font, color = rgb(0, 0, 0)) => {
    if (!txt) return
    const safeTxt = String(txt).replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    const w = font.widthOfTextAtSize(safeTxt, size)
    page.drawText(safeTxt, { x: textCenterX - w / 2, y, size, font, color })
    y -= size + 4
  }

  // KOP Surat
  drawCentered(kop.yayasan || 'YAYASAN SAPTA BAKTI PENDIDIKAN', 10, times)
  drawCentered(kop.univName || 'UNIVERSITAS SAPTA MANDIRI', 16, timesBold)
  if (kop.lembagaLine) drawCentered(kop.lembagaLine, 11, timesBold)
  if (kop.fakultasLine) drawCentered(kop.fakultasLine, 11, timesBold)
  if (kop.prodiLine) drawCentered(kop.prodiLine, 11, timesBold)
  if (kop.sk) drawCentered(kop.sk, 10, timesBold)

  if (Array.isArray(kop.address)) {
    for (const line of kop.address) {
      drawCentered(line, 8.5, times)
    }
  }

  // Garis ganda KOP
  y -= 2
  page.drawLine({ start: { x: marginX, y }, end: { x: pageWidth - marginX, y }, thickness: 2.2, color: rgb(0, 0, 0) })
  y -= 3.5
  page.drawLine({ start: { x: marginX, y }, end: { x: pageWidth - marginX, y }, thickness: 0.8, color: rgb(0, 0, 0) })
  y -= 20

  const ensureSpace = (needed = 40) => {
    if (y < needed + 50) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - 56
    }
  }

  const drawSafe = (txt, x, yPos, size, font, color = rgb(0, 0, 0)) => {
    const safeTxt = String(txt ?? '').replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    page.drawText(safeTxt, { x, y: yPos, size, font, color })
  }

  // Metadata Surat
  const metaRows = [
    ['Nomor', doc?.nomorSurat || '[Menunggu Penomoran]'],
    ['Lampiran', form.lampiran || '-'],
    ['Perihal', form.perihal || form.judul || '-'],
  ]
  for (const [label, val] of metaRows) {
    drawSafe(label, marginX, y, 11, times)
    drawSafe(':', marginX + 68, y, 11, times)
    const valLines = wrapText(val, label === 'Perihal' ? timesBold : times, 11, contentWidth - 80)
    for (let i = 0; i < valLines.length; i++) {
      drawSafe(valLines[i], marginX + 78, y, 11, label === 'Perihal' ? timesBold : times)
      y -= 15
    }
  }
  y -= 10

  // Kepada Yth.
  drawSafe('Kepada Yth.', marginX, y, 11, times)
  y -= 15
  const kepadaLines = wrapText(form.kepada || '-', timesBold, 11, contentWidth - 15)
  for (const l of kepadaLines) {
    drawSafe(l, marginX + 10, y, 11, timesBold)
    y -= 15
  }
  drawSafe('di Tempat', marginX + 10, y, 11, times)
  y -= 24

  // Isi Surat
  drawSafe('Dengan hormat,', marginX, y, 11, times)
  y -= 18

  const bodyLines = wrapText(form.isiSurat || '', times, 11, contentWidth)
  for (const line of bodyLines) {
    ensureSpace(30)
    if (line) {
      drawSafe(line, marginX, y, 11, times)
    }
    y -= 15.5
  }

  y -= 10
  ensureSpace(140)
  const closing = 'Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya kami ucapkan terima kasih.'
  for (const l of wrapText(closing, times, 11, contentWidth)) {
    drawSafe(l, marginX, y, 11, times)
    y -= 15.5
  }

  // Blok Tanda Tangan / Ruang BSrE
  y -= 26
  ensureSpace(130)
  const sigX = pageWidth - marginX - 210
  const tanggal = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  drawSafe(`Balangan, ${tanggal}`, sigX, y, 11, times)
  y -= 15
  drawSafe(signer?.jabatan || 'Rektor Universitas Sapta Mandiri', sigX, y, 11, timesBold)
  y -= 12

  if (includeQr && verifyUrl) {
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 })
      const qrBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0))
      const qrImg = await pdfDoc.embedPng(qrBytes)
      const qrSize = 54
      page.drawImage(qrImg, { x: sigX, y: y - qrSize, width: qrSize, height: qrSize })
      drawSafe('Ditandatangani secara elektronik', sigX + qrSize + 8, y - 16, 7.5, helvetica, rgb(0.25, 0.25, 0.25))
      drawSafe('menggunakan sertifikat elektronik', sigX + qrSize + 8, y - 26, 7.5, helvetica, rgb(0.25, 0.25, 0.25))
      drawSafe('E-Office UNIVSM / BSrE', sigX + qrSize + 8, y - 36, 7.5, helvetica, rgb(0.25, 0.25, 0.25))
      y -= qrSize + 14
    } catch {
      y -= 56
    }
  } else {
    // Ruang kosong khusus untuk penempelan visualisasi TTE BSrE Digital
    y -= 58
  }

  drawSafe(signer?.name || signer?.nama || 'Abdul Hamid, S.Kom., M.M., M.Kom.', sigX, y, 11, timesBold)
  y -= 14
  if (signer?.nik) {
    drawSafe(`NIK. ${signer.nik}`, sigX, y, 10, times)
  } else if (signer?.nidn) {
    drawSafe(`NIDN. ${signer.nidn}`, sigX, y, 10, times)
  }

  const pdfBytes = await pdfDoc.save()
  return uint8ToBase64(pdfBytes)
}
