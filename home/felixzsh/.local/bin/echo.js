// echo.js - Display a line of text

return {
  description: 'Display a line of text',
  execute: (context) => {
    const { stdout, stderr } = context;
    const { args, options } = context;
    
    // Echo typically doesn't fail, so exitCode = 0
    let exitCode = 0;
    
    if (args.length === 0) {
      // If no arguments, just print empty line (like bash echo)
      stdout.write('\n');
      return exitCode;
    }
    
    let text = args.join(' ');
    
    // Handle -n option (no newline at end)
    if (options.n) {
      // Just don't add the newline
    } else {
      text += '\n';
    }
    
    // Handle -e option (enable interpretation of backslash escapes)
    if (options.e) {
      text = text
        .replace(/\\n/g, '\n')    // newline
        .replace(/\\t/g, '\t')    // tab
        .replace(/\\r/g, '\r')    // carriage return
        .replace(/\\\\/g, '\\')   // backslash
        .replace(/\\"/g, '"')     // double quote
        .replace(/\\'/g, "'");    // single quote
    }
    
    try {
      stdout.write(text);
    } catch (e) {
      stderr.write(`echo: ${e.message}\n`);
      exitCode = 1;
    }
    
    return exitCode;
  }
};