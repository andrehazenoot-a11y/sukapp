const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'app', 'medewerker', 'planning', 'page.js');

const searchRegExp1 = /background:\s*'#fff'/g;
const replaceWith1 = "background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'";

const searchRegExp2 = /background:\s*"#fff"/g;
const replaceWith2 = 'background: "rgba(255, 255, 255, 0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)"';

let content = fs.readFileSync(file, 'utf8');
let original = content;

content = content.replace(searchRegExp1, replaceWith1);
content = content.replace(searchRegExp2, replaceWith2);

if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
} else {
    console.log('No matches found.');
}
