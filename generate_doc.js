const fs = require('fs');
const { marked } = require('marked');

const mdPath = 'C:\\Users\\user\\.gemini\\antigravity\\brain\\0f11ee3b-68d2-4055-8607-4ea165e6a483\\buku_panduan_eoffice.md';
const mdContent = fs.readFileSync(mdPath, 'utf8');

const htmlBody = marked.parse(mdContent);

const wordHtml = \
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
    <meta charset="utf-8">
    <title>PANDUAN PENGGUNAAN E-OFFICE UNIVSM</title>
    <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; padding: 20px; }
        h1 { font-size: 18pt; text-align: center; }
        h2 { font-size: 14pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 20px; }
        h3 { font-size: 12pt; font-weight: bold; }
        p, li { text-align: justify; }
        hr { border: 0; border-top: 1px solid #000; }
    </style>
</head>
<body>
    \
</body>
</html>
\;

fs.writeFileSync('Panduan_EOffice_UNIVSM.doc', wordHtml);
console.log('Conversion successful!');
