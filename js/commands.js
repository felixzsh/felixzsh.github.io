const commands = {};
const aliases = {
    'aboutme': 'whoami',
    'intro': 'whoami',
    'projects': 'ls projects', // Simple alias, might need more complex handling if we want it to cat a file
    'contact': 'cat contact.md',
    'cls': 'clear'
};

// Helper to register commands
function registerCommand(name, description, fn, hidden = false) {
    commands[name] = { description, fn, hidden };
}

// --- System Commands ---

registerCommand('help', 'List available commands', (args, term) => {
    let output = 'Available commands:\n\n';
    for (const [name, cmd] of Object.entries(commands)) {
        if (!cmd.hidden) {
            output += `  <span class="md-strong">${name.padEnd(15)}</span> ${cmd.description}\n`;
        }
    }
    output += '\nType <span class="md-code">help</span> to see this list again.';
    return output;
}, false);

registerCommand('clear', 'Clear terminal output', (args, term) => {
    term.clear();
    return '';
}, true); // Hidden from help, but standard

registerCommand('ls', 'List directory contents', (args, term, options = {}) => {
    const target = args[0] || '.';
    const resolvedParts = resolvePath(term.currentPath, target);
    const node = getNode(resolvedParts);

    if (!node) {
        return `ls: cannot access '${target}': No such file or directory`;
    }

    if (node.type === 'file') {
        return target;
    }

    if (node.children) {
        let items = Object.keys(node.children);

        // Filter hidden files unless -a is present
        if (!options.a) {
            items = items.filter(name => !name.startsWith('.'));
        }

        items.sort();

        if (options.l) {
            // Long listing format simulation
            // Permissions | Links | Owner | Group | Size | Date | Name
            let output = '<div style="display: grid; grid-template-columns: auto auto auto auto auto auto auto; gap: 0 10px;">';

            // Header (optional, usually ls -l doesn't show header but eza does. Let's stick to standard ls -l look or slightly enhanced)
            // output += '<div>Permissions</div><div>Size</div><div>User</div><div>Date</div><div>Name</div>';

            items.forEach(name => {
                const child = node.children[name];
                const isDir = child.type === 'directory';
                const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
                const size = isDir ? '-' : (child.content ? child.content.length : 0);
                const user = 'felixzsh';
                const date = 'Nov 18 12:00'; // Static date for now

                const nameHtml = isDir
                    ? `<span style="color: var(--blue); font-weight: bold;">${name}/</span>`
                    : name;

                output += `
                    <div style="color: var(--foreground)">${perms}</div>
                    <div style="color: var(--foreground)">1</div>
                    <div style="color: var(--foreground)">${user}</div>
                    <div style="color: var(--foreground)">${user}</div>
                    <div style="color: var(--foreground); text-align: right;">${size}</div>
                    <div style="color: var(--foreground)">${date}</div>
                    <div>${nameHtml}</div>
                `;
            });
            output += '</div>';
            return output;
        }

        // Standard listing
        const formattedItems = items.map(name => {
            const child = node.children[name];
            if (child.type === 'directory') {
                return `<span style="color: var(--blue); font-weight: bold;">${name}/</span>`;
            }
            return name;
        });
        return formattedItems.join('  ');
    }
    return '';
}, true);

registerCommand('cd', 'Change directory', (args, term) => {
    const target = args[0] || '~';
    let targetPathParts;

    if (target === '~') {
        targetPathParts = ['home', 'felixzsh'];
    } else {
        targetPathParts = resolvePath(term.currentPath, target);
    }

    const node = getNode(targetPathParts);

    if (!node || node.type !== 'directory') {
        return `cd: ${target}: No such file or directory`;
    }

    // Prevent going above root (conceptually /home/felixzsh is our root for the user, but let's allow /home/felixzsh as base)
    // Actually user said: "si intentan moverse al root /, no estara permitido, solo podrna moverse en el home"
    // So we check if path starts with home/felixzsh
    const newPath = '/' + targetPathParts.join('/');
    if (!newPath.startsWith('/home/felixzsh')) {
        return `cd: permission denied: ${target} (Restricted to home directory)`;
    }

    term.currentPath = newPath;
    term.updatePrompt();
    return '';
}, true);

registerCommand('pwd', 'Print working directory', (args, term) => {
    return term.currentPath;
}, true);

registerCommand('cat', 'Print file content', (args, term) => {
    if (!args[0]) return 'cat: missing operand';

    const resolvedParts = resolvePath(term.currentPath, args[0]);
    const node = getNode(resolvedParts);

    if (!node) {
        return `cat: ${args[0]}: No such file or directory`;
    }
    if (node.type === 'directory') {
        return `cat: ${args[0]}: Is a directory`;
    }

    // Render Markdown
    return term.renderMarkdown(node.content);
}, true);

registerCommand('sudo', 'Execute a command as another user', (args, term) => {
    return `<span style="color: var(--red);">felixzsh is not in the sudoers file. This incident will be reported.</span> 😈`;
}, true);

registerCommand('whoami', 'Print user identity', (args, term) => {
    // As requested: "whoami directamente hace el cat a la ruta absoluta del about.md"
    const aboutNode = getNode(['home', 'felixzsh', 'about.md']);
    if (aboutNode) {
        return term.renderMarkdown(aboutNode.content);
    }
    return 'felixzsh';
}, true); // Hidden, aliased by aboutme

registerCommand('open', 'Open a URL', (args, term) => {
    if (!args[0]) return 'open: missing URL';
    let url = args[0];
    if (!url.startsWith('http')) url = 'https://' + url;
    window.open(url, '_blank');
    return `Opening ${url}...`;
}, true);


// --- User Commands (Visible in Help) ---

registerCommand('aboutme', 'Learn more about me', (args, term) => {
    return commands['whoami'].fn(args, term);
}, false);

registerCommand('projects', 'View my projects', (args, term) => {
    // Custom behavior: List projects directory with some flair or just ls
    // Let's make it list the projects directory content
    const projectNode = getNode(['home', 'felixzsh', 'projects']);
    if (projectNode) {
        let output = 'My Projects:\n\n';
        Object.keys(projectNode.children).forEach(child => {
            output += `- <span class="md-strong">${child}</span>\n`;
        });
        output += '\nUse <span class="md-code">cat projects/&lt;filename&gt;</span> to read details.';
        return output;
    }
    return 'No projects found.';
}, false);

registerCommand('contact', 'Get contact information', (args, term) => {
    const contactNode = getNode(['home', 'felixzsh', 'contact.md']);
    if (contactNode) {
        return term.renderMarkdown(contactNode.content);
    }
    return 'Contact info missing.';
}, false);
