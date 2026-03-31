const fs = require('fs');
const file = 'src/app/projecten/[id]/page.js';
let content = fs.readFileSync(file, 'utf8');
content = content.replace("borderBottom: i < 6 ? '1px solid #f8fafc' : 'none'", "borderBottom: i !== 12 ? '1px solid #f8fafc' : 'none'");
fs.writeFileSync(file, content);
