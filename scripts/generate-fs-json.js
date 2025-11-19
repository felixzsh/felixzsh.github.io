const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../home');
const outputFile = path.join(__dirname, '../filesystem.json');

function readDirRecursive(dir) {
    if (!fs.existsSync(dir)) {
        return {};
    }
    const stats = fs.statSync(dir);

    if (stats.isDirectory()) {
        const children = {};
        const files = fs.readdirSync(dir);

        files.forEach(file => {
            const filePath = path.join(dir, file);
            children[file] = readDirRecursive(filePath);
        });

        return {
            type: 'directory',
            children: children
        };
    } else {
        return {
            type: 'file',
            content: fs.readFileSync(dir, 'utf-8')
        };
    }
}

console.log('Generating filesystem JSON...');
const fsData = {
    "home": readDirRecursive(rootDir)
};

fs.writeFileSync(outputFile, JSON.stringify(fsData, null, 4));
console.log('Filesystem JSON written to:', outputFile);
