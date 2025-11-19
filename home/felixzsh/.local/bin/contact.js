return {
    description: 'Get contact information',
    execute: (args, term) => {
        const contactNode = getNode(['home', 'felixzsh', 'contact.md']);
        if (contactNode) {
            return term.renderMarkdown(contactNode.content);
        }
        return 'Contact info missing.';
    }
};
