return {
    description: 'Open a URL',
    execute: (context) => {
        const { args, stdout, stderr } = context;
        if (!args[0]) {
            stderr.write('open: missing URL\n');
            return 1;
        }
        let url = args[0];
        if (!url.startsWith('http')) url = 'https://' + url;
        window.open(url, '_blank');
        stdout.write(`Opening ${url}...\n`);
        return 0;
    }
};
