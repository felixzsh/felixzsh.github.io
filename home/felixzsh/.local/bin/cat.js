return {
    description: 'Print file content',
    execute: (args, term) => {
        if (!args[0]) return 'cat: missing operand';

        const resolvedParts = resolvePath(term.currentPath, args[0]);
        const node = getNode(resolvedParts);

        if (!node) {
            return `cat: ${args[0]}: No such file or directory`;
        }
        if (node.type === 'directory') {
            return `cat: ${args[0]}: Is a directory`;
        }

        return term.renderMarkdown(node.content);
    }
};
