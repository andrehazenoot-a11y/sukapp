const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'src', 'components');

const searchRegExp1 = /background:\s*'#fff'/g;
const replaceWith1 = "background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)'";

const searchRegExp2 = /background:\s*"#fff"/g;
const replaceWith2 = 'background: "rgba(255, 255, 255, 0.75)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)"';

const searchRegExp3 = /background:\s*'white'/g;
const replaceWith3 = "background: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)'";

function walkDir(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walkDir(filePath));
        } else {
            if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
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
    content = content.replace(searchRegExp2, replaceWith2);
    content = content.replace(searchRegExp3, replaceWith3);

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated:', file);
        changedFiles++;
    }
});

console.log(`Finished updating ${changedFiles} files with glassmorphism.`);
