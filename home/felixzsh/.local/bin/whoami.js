return {
  description: 'Print user identity',
  execute: (args, context) => {
    const aboutNode = context.fs.getNode(['home', context.env.USER || 'felixzsh', 'about.md']);
    if (aboutNode && aboutNode.content) {
      return context.stdout(aboutNode.content);
    }
    return context.env.USER || 'felixzsh';
  }
};
