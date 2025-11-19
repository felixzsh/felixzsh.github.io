return {
    description: 'View my projects',
    execute: (args, term) => {
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
    }
};
