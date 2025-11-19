return {
  description: 'Print user identity',
  execute: (args, term) => {
    const aboutNode = getNode(['home', 'felixzsh', 'about.md']);
    if (aboutNode) {
      return term.renderMarkdown(aboutNode.content);
    }
    return 'felixzsh';
  }
};
