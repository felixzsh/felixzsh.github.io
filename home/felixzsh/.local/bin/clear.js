return {
    description: 'Clear terminal output',
    execute: (context) => {
        const { shell } = context;
        shell.tty.clear();
        return 0;
    }
};
