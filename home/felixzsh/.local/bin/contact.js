return {
    description: 'Get contact information',
    execute: (args, context) => {
        const contactNode = context.fs.getNode(['home', context.env.USER || 'felixzsh', 'contact.md']);
        if (contactNode && contactNode.content) {
            return context.stdout(contactNode.content);
        }
        return 'Contact info missing.';
    }
};
