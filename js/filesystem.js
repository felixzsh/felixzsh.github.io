let fileSystem = {
    "home": {
        "type": "directory",
        "children": {
            "felixzsh": {
                "type": "directory",
                "children": {
                    "loading.md": {
                        "type": "file",
                        "content": "# Loading...\n\nFetching latest data from GitHub..."
                    }
                }
            }
        }
    }
};

// Fetch the filesystem from the live GitHub repo
// Note: This requires filesystem.json to be pushed to the repository root!
fetch('/filesystem.json')
    .then(response => {
        if (!response.ok) throw new Error(`Failed to load filesystem: ${response.status} `);
        return response.json();
    })
    .then(data => {
        fileSystem = data;
        // If the terminal is already running, this will dynamically update the content
        // the next time a command is run.
    })
    .catch(error => {
        console.error("Error loading filesystem from GitHub:", error);
        // Fallback or error handling could go here
    });

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
