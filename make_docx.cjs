const fs = require('fs');
const { marked } = require('marked');
const HTMLtoDOCX = require('html-to-docx');

(async () => {
    const mdPath = 'C:/Users/user/.gemini/antigravity/brain/0f11ee3b-68d2-4055-8607-4ea165e6a483/buku_panduan_eoffice.md';
    const mdContent = fs.readFileSync(mdPath, 'utf8');
    
    const htmlBody = marked.parse(mdContent);
    
    const htmlString = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: 'Times New Roman', serif; font-size: 12pt; }
            h1 { text-align: center; font-size: 18pt; }
            h2 { font-size: 14pt; border-bottom: 1px solid #000; }
            p { text-align: justify; }
        </style>
    </head>
    <body>
        ${htmlBody}
    </body>
    </html>`;

    const fileBuffer = await HTMLtoDOCX(htmlString, null, {
        table: { row: { cantSplit: true } },
        footer: true,
        pageNumber: true,
    });

    fs.writeFileSync('C:/Users/user/.gemini/antigravity/scratch/e-office-univsm/Panduan_EOffice_UNIVSM.docx', fileBuffer);
    console.log('DOCX generated successfully!');
})();
