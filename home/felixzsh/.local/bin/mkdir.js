return {
  description: "Makes an empty directory",
  execute: (context) => {
    const { fs, cwd, stdout, stderr } = context;
    const { args, options } = context;
    
    if (args.length === 0 || options.help) {
      stdout.write("Usage: mkdir &lt;directory_name&gt;\n\nCreate new directory.\n");
      return 0;
    }

    const newDirPath = args[0];
    try {
      fs.createDirectory(newDirPath, cwd);
      return 0;
    } catch (e) {
      stderr.write(`mkdir: ${e.message}\n`);
      return 1;
    }
  }
}

