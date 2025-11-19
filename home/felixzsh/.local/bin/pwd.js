return {
    description: 'Print working directory',
    execute: (args, term) => {
        return term.currentPath;
    }
};
