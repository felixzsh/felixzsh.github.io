return {
    description: 'Change directory',
    execute: (args, term) => {
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

        const newPath = '/' + targetPathParts.join('/');
        if (!newPath.startsWith('/home/felixzsh')) {
            return `cd: permission denied: ${target} (Restricted to home directory)`;
        }

        term.currentPath = newPath;
        term.updatePrompt();
        return '';
    }
};
