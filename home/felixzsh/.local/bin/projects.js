// Helper function to recursively list projects
function listProjects(node, path, indent = '') {
    let output = '';
    if (node.children) {
        for (const childName in node.children) {
            const childNode = node.children[childName];
            const currentPath = `${path}/${childName}`;
            if (childNode.type === 'directory') {
                output += `${indent}- <span class="md-strong">${childName}/</span>\n`;
                output += listProjects(childNode, currentPath, indent + '  ');
            } else if (childNode.type === 'file' && childName.endsWith('.md')) {
                output += `${indent}- ${childName.replace('.md', '')}\n`;
            }
        }
    }
    return output;
}

return {
    description: 'View my projects',
    execute: (context) => {
        const { fs, env, stdout } = context;
        const projectNode = fs.getNode(['home', env.USER || 'felixzsh', 'projects']);
        if (projectNode) {
            let output = 'My Projects:\n\n';
            output += listProjects(projectNode, `${env.HOME}/projects`);
            output += '\nUse <span class="md-code">cat projects/&lt;category&gt;/&lt;project&gt;.md</span> to read details.\n';
            stdout.write(output);
            return 0;
        }
        stdout.write('No projects found.\n');
        return 1;
    }
};
