return {
    description: 'Change directory',
    execute: (args, context) => {
        const target = args[0] || '~';
        let targetPathParts;

        if (target === '~') {
            targetPathParts = ['home', context.env.USER || 'felixzsh'];
        } else {
            targetPathParts = context.fs.resolvePath(context.cwd, target);
        }

        const node = context.fs.getNode(targetPathParts);

        if (!node || node.type !== 'directory') {
            return `cd: ${target}: No such file or directory`;
        }

        const newPath = '/' + targetPathParts.join('/');
        const homeDir = context.env.HOME || '/home/felixzsh';

        if (!newPath.startsWith(homeDir)) {
            return `cd: permission denied: ${target} (Restricted to home directory)`;
        }

        context.shell.currentPath = newPath;
        return '';
    }
};
