// rm.js - Remove files or directories

return {
  description: 'Remove files or directories',
  execute: (context) => {
    const { fs, cwd, stdout, stderr } = context;
    const { args, options } = context;
    
    let exitCode = 0;
    
    // If no arguments provided or --help is specified, show usage
    if (args.length === 0 || options.help) {
      stdout.write("Usage: rm &lt;file_or_directory&gt;\n\nRemove files or directories.\n");
      stdout.write("Options:\n");
      stdout.write("  -r, -R    Remove directories and their contents recursively\n");
      stdout.write("  -f        Force removal without prompting\n");
      stdout.write("  --help    Show this help message\n");
      return 0;
    }
    
    // Check for conflicting options
    const recursive = options.r || options.R;
    const force = options.f || options.force;
    
    // Process each argument
    for (const path of args) {
      // Skip special cases
      if (path === '/' || path === '.') {
        stderr.write(`rm: cannot remove '${path}': Is a special file\n`);
        exitCode = 1;
        continue;
      }
      
      try {
        // Try to delete the file or directory
        fs.delete(path, recursive, cwd);
        
        // In verbose mode (if we had -v option), we could print what was deleted
        // if (options.v) {
        //   stdout.write(`removed '${path}'\n`);
        // }
        
      } catch (e) {
        if (force) {
          // In force mode, we don't display errors but still track exit code
          exitCode = 1;
        } else {
          stderr.write(`${e.message}\n`);
          exitCode = 1;
        }
      }
    }
    
    return exitCode;
  }
};