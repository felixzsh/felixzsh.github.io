return {
  description: 'Execute a command as super user',
  execute: (context) => {
    const { stdout } = context;
    stdout.write('<span style="color: var(--red);">You are not supposed to do this. This incident will be reported.</span>\n');
    return 1;
  }
};

