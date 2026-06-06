const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../MutashabihatulQuran/mutashabiha_data.json');

function main() {
    console.log('Reading mutashabiha_data.json...');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const keys = Object.keys(data);
    console.log('Root keys (Juz numbers):', keys);
    
    // Inspect Juz 1
    const juz1 = data["1"] || [];
    console.log(`Juz 1 groups count: ${juz1.length}`);
    if (juz1.length > 0) {
        console.log('Sample group from Juz 1:', JSON.stringify(juz1[0], null, 2));
    }
}

main();
