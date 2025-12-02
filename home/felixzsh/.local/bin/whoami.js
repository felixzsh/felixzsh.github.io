return {
  description: 'Print user identity',
  execute: (context) => {
    const { fs, env, stdout } = context;
    const aboutNode = fs.getNode(['home', env.USER || 'felixzsh', 'about.md']);
    if (aboutNode && aboutNode.content) {
      stdout.write(aboutNode.content);
      return 0;
    }
    stdout.write(env.USER || 'felixzsh');
    return 0;
  }
};
