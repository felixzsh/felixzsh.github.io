return {
    description: 'Print working directory',
    execute: (args, context) => {
        return context.cwd;
    }
};
