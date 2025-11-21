return {
  description: "Makes an empty file",
  execute: (args, context, options) => {
    if (args.length === 0 || options.help) {
      return "Usage: touch &lt;file_name&gt;\n\nCreate a new file or update timestamp (simple implementation).";
    }

    const filePath = args[0];
    const fullPath = '/' + context.fs.resolvePath(context.cwd, filePath).join('/');

    // Check if file already exists
    if (context.fs.exists(fullPath)) {
      return ""; // Touch just updates timestamp, we'll just return success
    }

    const success = context.fs.writeFile(fullPath, "");

    if (!success) {
      return `<span style="color: var(--red)">touch: cannot create file '${filePath}': No such file or directory</span>`;
    }

    return "";
  }
}
