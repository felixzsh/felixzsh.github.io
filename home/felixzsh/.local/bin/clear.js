return {
    description: 'Clear terminal output',
    execute: (args, term) => {
        term.clear();
        return '';
    }
};
