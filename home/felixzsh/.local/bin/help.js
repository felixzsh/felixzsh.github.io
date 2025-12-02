return {
    description: 'List available commands',
    execute: (context) => {
        const { fs, env, stdout } = context;
        const binPath = ['home', env.USER || 'felixzsh', '.local', 'bin'];
        const binNode = fs.getNode(binPath);

        if (!binNode || !binNode.children) {
            stdout.write('Error: .local/bin not found.\n');
            return 1;
        }

        let output = 'Available commands:\n\n';
        const files = Object.keys(binNode.children);

        for (const file of files) {
            if (!file.endsWith('.js')) continue;

            const cmdName = file.replace('.js', '');
            const content = binNode.children[file].content;

            try {
                const cmdFactory = new Function('context', content);
                const cmdDef = cmdFactory(context);

                if (cmdDef && cmdDef.description) {
                    output += `  <span class="md-strong">${cmdName.padEnd(15)}</span> ${cmdDef.description}\n`;
                }
            } catch (e) {
                // Ignore errors
            }
        }

        output += '\nType <span class="md-code">help</span> to see this list again.\n';
        stdout.write(output);
        return 0;
    }
};
