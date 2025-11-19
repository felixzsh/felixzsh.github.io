const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '../home');

function readDirRecursive(dir) {
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

const fileSystem = {
    "home": readDirRecursive(rootDir)
};

// Helper function to resolve path
function resolvePath(currentPath, targetPath) {
    if (targetPath.startsWith('/')) {
        return targetPath.split('/').filter(p => p !== '');
    }

    const parts = currentPath.split('/').filter(p => p !== '');
    const targetParts = targetPath.split('/').filter(p => p !== '');

    for (const part of targetParts) {
        if (part === '..') {
            parts.pop();
        } else if (part !== '.') {
            parts.push(part);
        }
    }

    return parts;
}

// Helper to get node at path
function getNode(pathParts) {
    let current = fileSystem;
    for (const part of pathParts) {
        if (current.children && current.children[part]) {
            current = current.children[part];
        } else if (current[part]) {
            current = current[part];
        } else {
            return null;
        }
    }
    return current;
}
