const fs = require('fs');
const { marked } = require('marked');
        const md = fs.readFileSync('C:/Users/user/.gemini/antigravity/brain/0f11ee3b-68d2-4055-8607-4ea165e6a483/buku_panduan_eoffice.md', 'utf8');
        const html = marked.parse(md);
        const out = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><style>body{font-family:'Times New Roman';font-size:12pt} h1{text-align:center}</style></head><body>${html}</body></html>`;
        fs.writeFileSync('C:/Users/user/.gemini/antigravity/brain/0f11ee3b-68d2-4055-8607-4ea165e6a483/Panduan_EOffice_UNIVSM.doc', out);
