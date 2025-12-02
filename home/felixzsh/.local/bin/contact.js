return {
    description: 'Get contact information',
    execute: (context) => {
        const { fs, env, stdout } = context;
        const contactNode = fs.getNode(['home', env.USER || 'felixzsh', 'contact.md']);
        if (contactNode && contactNode.content) {
            stdout.write(contactNode.content);
            return 0;
        }
        stdout.write('Contact info missing.');
        return 1;
    }
};
