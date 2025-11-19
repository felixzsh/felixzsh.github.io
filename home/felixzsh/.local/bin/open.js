return {
    description: 'Open a URL',
    execute: (args, term) => {
        if (!args[0]) return 'open: missing URL';
        let url = args[0];
        if (!url.startsWith('http')) url = 'https://' + url;
        window.open(url, '_blank');
        return `Opening ${url}...`;
    }
};
