const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src');

const searchRegExp1 = /background(-color)?:\s*(#fff(fff)?|white)\s*;/gi;
// Note: In CSS we format without quotes!
const replaceWith1 = "background: rgba(255, 255, 255, 0.75);\n    backdrop-filter: blur(16px);\n    -webkit-backdrop-filter: blur(16px);";

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else {
            if (filePath.endsWith('.css') && !filePath.endsWith('globals.css')) {
                results.push(filePath);
            }
        }
    });
    return results;
}

const files = walkDir(targetDir);
let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(searchRegExp1, replaceWith1);

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', file);
        changedFiles++;
    }
});

console.log(`Finished updating ${changedFiles} CSS files with glassmorphism.`);
