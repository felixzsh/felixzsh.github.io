export class SimpleSyncStream {
  constructor(destination = null) {
    this.buffer = '';
    this.destination = destination;
  }

  write(data) {
    if (typeof data !== 'string') data = String(data);

    if (typeof this.destination === 'function') {
      // Caso TTY: Envía a la función de impresión
      this.destination(data);
    } else if (this.destination instanceof SimpleSyncStream) {
      // ✅ SOLUCIÓN: Llama al método write() del destino B
      this.destination.write(strData);
    } else {
      // Caso Captura/Archivo: Acumula
      this.buffer += data;
    }
  }

  // Usado por el comando para leer (ej: context.stdin.read())
  read() {
    const data = this.buffer;
    this.buffer = ''; // Limpia después de leer
    return data;
  }

  // Conecta este stream a otro (para el orquestador de pipes)
  pipe(destStream) {
    this.destination = destStream;
    return destStream;
  }
}
