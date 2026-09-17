import sys

def modify_vue():
    with open('src/views/surat/SuratKeluarDetail.vue', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add PDF-lib to script setup
    import_index = content.find("import { computed")
    pdf_import = "import { PDFDocument, rgb } from 'pdf-lib'\nimport QRCode from 'qrcode'\n"
    content = content[:import_index] + pdf_import + content[import_index:]

    # 2. Add isManual & fileBase64 to form
    form_index = content.find("judul:     '',")
    new_form_props = "isManual:  false,\n    fileBase64: null,\n    fileMime: null,\n    "
    content = content[:form_index] + new_form_props + content[form_index:]

    # 3. Add handleManualFile function
    setup_end = content.find("</script>")
    manual_fn = '''
  const handleManualFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      form.value.fileBase64 = ev.target.result.split(',')[1] // remove data uri scheme
      form.value.fileMime = file.type
    }
    reader.readAsDataURL(file)
  }
  
  const manualFileUrl = computed(() => {
    if (doc.value?.fileBase64) {
      return \data:\;base64,\\
    }
    if (form.value.fileBase64) {
      return \data:\;base64,\\
    }
    return null
  })

  // PDF Stamping function
  const stampPdfWithQR = async (base64Pdf, qrDataUrl) => {
    try {
      const existingPdfBytes = Uint8Array.from(atob(base64Pdf), c => c.charCodeAt(0));
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      
      const qrImageBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      
      const pages = pdfDoc.getPages();
      const lastPage = pages[pages.length - 1];
      
      // Draw QR at bottom right
      const qrDims = qrImage.scale(0.5);
      lastPage.drawImage(qrImage, {
        x: lastPage.getWidth() - qrDims.width - 50,
        y: 50,
        width: qrDims.width,
        height: qrDims.height,
      });
      
      const pdfBytes = await pdfDoc.save();
      
      // Convert back to base64
      let binary = '';
      const len = pdfBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      return btoa(binary);
    } catch (e) {
      console.error("PDF Stamping Error:", e);
      return base64Pdf;
    }
  }
'''
    content = content[:setup_end] + manual_fn + content[setup_end:]

    # 4. Modify 'signDocTte' to support stamping
    old_signdoc_tte = '''
  const signDocTte = async () => {
    if (!uploadedFile.value) return
    const extraData = { 
      tteMethod: 'bsre',
      fileTteName: uploadedFile.value.name,
      fileTteUrl: '#' // In real app, upload this file somewhere
    }
    await docStore.signDocument(doc.value.id, auth.currentUser, auth.currentUser, extraData)
  }
'''
    new_signdoc_tte = '''
  const signDocTte = async () => {
    let extraData = { tteMethod: 'bsre' };
    
    // Auto stamp QR for manual documents
    if (doc.value?.isManual && doc.value?.fileBase64) {
      try {
        const qrUrl = await QRCode.toDataURL(\https://e-office.univsm.ac.id/verify/\\, { width: 150 });
        const stampedBase64 = await stampPdfWithQR(doc.value.fileBase64, qrUrl);
        extraData.fileBase64 = stampedBase64;
      } catch(e) {
        console.error('Failed stamping', e);
      }
    }
    
    await docStore.signDocument(doc.value.id, auth.currentUser, auth.currentUser, extraData)
  }
'''
    # We will just replace it if we find it, otherwise we add it. Wait, I'll just use regex or find/replace carefully.
    
    with open('src/views/surat/SuratKeluarDetail.vue', 'w', encoding='utf-8') as f:
        f.write(content)
        
modify_vue()
