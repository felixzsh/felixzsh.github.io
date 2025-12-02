return {
  description: 'Change directory',
  execute: (context) => {
    const { args, fs, cwd, shell, env, stderr } = context;
    console.log('cd: context', { args, cwd, env });

    const target = args[0] || '~';
    console.log('cd: target', target);

    let targetPathParts;

    if (target === '~') {
      targetPathParts = ['home', env.USER || 'felixzsh'];
      console.log("achinga");
    } else {
      targetPathParts = fs.resolvePath(target, cwd);
      console.log("acabrawn");
    }

    console.log('cd: targetPathParts', targetPathParts);

    const node = fs.getNode(targetPathParts);
    console.log('cd: node', node);

    if (!node || node.type !== 'directory') {
      console.log('cd: error - not a directory');
      stderr.write(`cd: ${target}: No such file or directory\n`);
      return 1;
    }

    const newPath = '/' + targetPathParts.join('/');
    const homeDir = env.HOME || '/home/felixzsh';

    console.log('cd: newPath', newPath, 'homeDir', homeDir);

    if (!newPath.startsWith(homeDir)) {
      console.log('cd: permission denied');
      stderr.write(`cd: permission denied: ${target} (Restricted to home directory)\n`);
      return 1;
    }

    console.log('cd: setting currentPath to', newPath);
    shell.currentPath = newPath;
    console.log('cd: success, new currentPath:', shell.currentPath);
    return 0;
  }
};
