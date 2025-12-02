const fs = require('fs');
const path = require('path');

// 1. Definiciones de ruta
// Asumimos que el directorio 'home' es la base de nuestro contenido.
const baseContentDir = path.join(__dirname, '../home');
const outputFile = path.join(__dirname, '../filesystem.json');

// --- Helper para crear nodos con metadatos simplificados ---
function createFSNode(name, type, childrenOrContent, stats) {
  const now = stats ? stats.mtimeMs : Date.now(); // Usar el tiempo de modificación real si está disponible
  return {
    type: type,
    name: name,
    content: type === 'file' ? childrenOrContent : undefined,
    children: type === 'directory' ? childrenOrContent : undefined,
    metadata: {
      createdAt: stats ? stats.birthtimeMs : now,
      modifiedAt: now,
      // Aquí puedes añadir permisos si los necesitas en el futuro
      permissions: type === 'directory' ? 'drwxr-xr-x' : '-rw-r--r--'
    }
  };
}

// --- Función Recursiva de Lectura ---
function readDirRecursive(dir, name) {
  if (!fs.existsSync(dir)) {
    console.warn(`Path not found: ${dir}`);
    return null;
  }

  const stats = fs.statSync(dir);

  if (stats.isDirectory()) {
    const children = {};
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      // La recursión genera el nodo completo para el hijo.
      const childNode = readDirRecursive(filePath, file);
      if (childNode) {
        children[file] = childNode;
      }
    });

    // Crear el nodo de directorio
    return createFSNode(name, 'directory', children, stats);

  } else {
    // Crear el nodo de archivo
    return createFSNode(name, 'file', fs.readFileSync(dir, 'utf-8'), stats);
  }
}

// ----------------------------------------------------
// Lógica de Generación
// ----------------------------------------------------

console.log('Generating filesystem JSON...');

// 1. Leer el directorio 'home'
// baseContentDir es la ruta completa (ej: .../proyecto/home)
const homeNode = readDirRecursive(baseContentDir, 'home');

if (!homeNode) {
  console.error('Failed to generate home node.');
  process.exit(1);
}

// 2. Crear el objeto raíz '/' que envuelve todo
const rootChildren = {};
// El nodo 'home' se coloca como hijo de la raíz.
rootChildren[homeNode.name] = homeNode;

// Creamos el nodo raíz final con la estructura correcta (type, name, children)
const fsData = createFSNode('/', 'directory', rootChildren, fs.statSync(baseContentDir));

// 3. Escribir el archivo
fs.writeFileSync(outputFile, JSON.stringify(fsData, null, 4));
console.log('✅ Filesystem JSON written to:', outputFile);
