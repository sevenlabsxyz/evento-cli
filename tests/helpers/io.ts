import { PassThrough } from 'node:stream';

export function createTestIo() {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const stdin = new PassThrough();

  let out = '';
  let err = '';
  stdout.on('data', (chunk) => {
    out += chunk.toString();
  });
  stderr.on('data', (chunk) => {
    err += chunk.toString();
  });

  return {
    io: {
      stdout: Object.assign(stdout, { isTTY: false }) as unknown as NodeJS.WriteStream,
      stderr: Object.assign(stderr, { isTTY: false }) as unknown as NodeJS.WriteStream,
      stdin: Object.assign(stdin, { isTTY: false }) as unknown as NodeJS.ReadStream
    },
    read: () => ({ stdout: out, stderr: err }),
    writeStdin: (value: string) => {
      stdin.write(value);
    }
  };
}
