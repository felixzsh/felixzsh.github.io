return {
    description: 'Print file content',
    execute: (args, context) => {
        if (!args[0]) return 'cat: missing operand';

        const resolvedParts = context.fs.resolvePath(context.cwd, args[0]);
        const node = context.fs.getNode(resolvedParts);

        if (!node) {
            return `cat: ${args[0]}: No such file or directory`;
        }
        if (node.type === 'directory') {
            return `cat: ${args[0]}: Is a directory`;
        }

        return context.stdout(node.content || '');
    }
};
