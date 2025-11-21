return {
  description: "Makes an empty directory",
  execute: (args, context, options) => {
    if (args.length === 0 || options.help) {
      return "Usage: mkdir &lt;directory_name&gt;\n\nCreate new directory.";
    }

    const newDirPath = args[0];
    const success = context.fs.createDirectory(
      '/' + context.fs.resolvePath(context.cwd, newDirPath).join('/')
    );

    if (!success) {
      return `<span style="color: var(--red)">mkdir: cannot create directory '${newDirPath}': File exists or parent directory does not exist</span>`;
    }

    return "";
  }
}
