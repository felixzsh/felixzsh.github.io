return {
    description: 'Print working directory',
    execute: (context) => {
        const { cwd, stdout } = context;
        stdout.write(cwd + '\n');
        return 0;
    }
};
