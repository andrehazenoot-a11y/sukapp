const fs = require('fs');
const file = 'src/app/projecten/[id]/page.js';
let lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

let startIndexGrid = -1;
let startDelete = -1;
let endDelete = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>")) {
        // ensure it's around 2641
        if (i > 2600 && i < 2700) {
            startIndexGrid = i;
        }
    }
    if (lines[i].includes("{/* Voortgang + Team */}")) {
        startDelete = i;
    }
    if (lines[i].includes("{/* ===== TAKEN ===== */}")) {
        endDelete = i; // this is line 2920 in my latest view_file
    }
}

if (startIndexGrid !== -1 && startDelete !== -1 && endDelete !== -1) {
    // Delete the start grid line
    lines.splice(startIndexGrid, 1);
    
    // Re-evaluate indices because we removed 1 line!
    startDelete -= 1;
    endDelete -= 1;
    
    // We want to delete from {/* Voortgang + Team */} down to but NOT including the last </div> before TAKEN.
    // Let's find that </div>
    // Near endDelete, there is:
    //   </div>
    // )}
    // {/* ===== TAKEN ===== */}
    
    // The exact lines before TAKEN were:
    // 2917:                 </div>
    // 2918:             )}
    // 2919: 
    // 2920:             {/* ===== TAKEN ===== */}
    
    // We keep line 2917 (which is `</div>` of the flex column) and 2918 `)}`.
    // We delete lines from startDelete (inclusive) up to endDelete - 4
    
    lines.splice(startDelete, endDelete - 3 - startDelete);
    
    fs.writeFileSync(file, lines.join('\n'));
    console.log("Cleanup applied successfully!");
} else {
    console.log("Could not find markers!");
    console.log("startIndexGrid:", startIndexGrid);
    console.log("startDelete:", startDelete);
    console.log("endDelete:", endDelete);
}
