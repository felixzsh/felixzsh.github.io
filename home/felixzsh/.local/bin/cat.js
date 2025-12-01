// Content for /bin/cat.js
return {
  description: 'Concatenate files and print on the standard output.',
  execute: (context) => {
    const { fs, cwd, stdin, stdout, stderr } = context;
    const { args } = context;
    let exitCode = 0;

    if (args.length > 0) {
      for (const path of args) {
        try {
          const content = fs.readFile(path, cwd);
          stdout.write(content);
        } catch (e) {
          stderr.write(`cat: ${path}: ${e.message}\n`);
          exitCode = 1;
        }
      }
    } else {
      const input = stdin.read();
      if (input) {
        stdout.write(input);
      }
    }
    return exitCode;
  }
};
