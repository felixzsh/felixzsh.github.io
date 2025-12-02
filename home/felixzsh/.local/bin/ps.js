// ps.js - Process status (limited by browser JavaScript constraints)

return {
  description: 'Report a snapshot of the current processes (not that useful in a browser)',
  execute: (context) => {
    const { args, options, stdout, stderr, cwd } = context;

    // If user provides any options or complex requests, give them the "reality check"
    if (args.length > 0 || Object.keys(options).length > 0) {
      stderr.write(`ps: ERROR: Operation not permitted\n`);
      stderr.write(`ps: Sorry, but JavaScript's event loop doesn't support real multitasking\n`);
      stderr.write(`ps: \n`);
      stderr.write(`ps: Available "processes" in this single-threaded hellscape:\n`);
      stderr.write(`ps:   PID  TTY      TIME CMD\n`);
      stderr.write(`ps:   ${String(Date.now() % 9999).padStart(4)}  pts/0    00:00:01 jsh\n`);
      stderr.write(`ps:   ${String((Date.now() + 1) % 9999).padStart(4)}  pts/0    00:00:00 ps\n`);
      return 1;
    }

    // Simple listing - show the "only" processes available
    stdout.write(`  PID TTY          TIME CMD\n`);
    stdout.write(`${String(Date.now() % 9999).padStart(5)} pts/0    00:00:01 jsh\n`);
    stdout.write(`${String((Date.now() + 1) % 9999).padStart(5)} pts/0    00:00:00 ps\n`);
    
    return 0;
  }
}