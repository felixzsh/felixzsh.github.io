export class SimpleSyncStream {
  constructor(destination = null) {
    this.buffer = '';
    this.destination = destination;
  }

  write(data) {
    if (typeof data !== 'string') data = String(data);

    if (typeof this.destination === 'function') {
      this.destination(data);
    } else if (this.destination instanceof SimpleSyncStream) {
      this.destination.write(strData);
    } else {
      this.buffer += data;
    }
  }

  read() {
    const data = this.buffer;
    this.buffer = '';
    return data;
  }

  pipe(destStream) {
    this.destination = destStream;
    return destStream;
  }
}
