return {
    description: 'Clear terminal output',
    execute: (args, context) => {
        context.shell.tty.clear();
        return '';
    }
};
