// rm.js - Remove files or directories

return {
  description: 'Remove files or directories',
  execute: (context) => {
    const { fs, cwd, stdout, stderr } = context;
    const { args, options } = context;
    
    let exitCode = 0;
    
    // If no arguments provided, show usage
    if (args.length === 0) {
      stderr.write('rm: missing operand\n');
      stderr.write('Try \'rm --help\' for more information.\n');
      return 1;
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