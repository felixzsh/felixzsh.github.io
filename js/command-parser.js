// command-parser.js
export class CommandParser {
  static parse(input) {
    // Regex Mágica:
    // 1. "..." : Captura texto entre comillas dobles
    // 2. '...' : Captura texto entre comillas simples
    // 3. | ó >> ó > ó < : Captura operadores
    // 4. \S+ : Captura cualquier otra palabra/argumento
    const tokens = input.match(/"[^"]*"|'[^']*'|\||>>|>|<|\S+/g) || [];

    const commands = [];
    let currentCmd = { args: [], input: null, output: null, mode: 'write' };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token === '|') {
        commands.push(currentCmd);
        currentCmd = { args: [], input: null, output: null, mode: 'write' };
      }
      else if (token === '>' || token === '>>') {
        currentCmd.output = tokens[++i]; // El siguiente token es el archivo
        currentCmd.mode = token === '>>' ? 'append' : 'write';
      }
      else if (token === '<') {
        currentCmd.input = tokens[++i]; // El siguiente token es el archivo origen
      }
      else {
        // Es un comando o argumento. Quitamos comillas si las tiene.
        currentCmd.args.push(token.replace(/^['"]|['"]$/g, ''));
      }
    }

    // Agregar el último comando pendiente
    if (currentCmd.args.length > 0) commands.push(currentCmd);

    return commands;
  }
}
