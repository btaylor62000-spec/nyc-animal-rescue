/**
 * Zip container reader shared by the .xlsx and .docx readers.
 *
 * Walks the central directory and inflates each entry. Deliberately not
 * streaming: the files this project reads are all well under a megabyte.
 */
import { inflateRawSync } from 'node:zlib';

export function readZipEntries(buf: Buffer): Map<string, Buffer> {
  const EOCD_SIG = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0 && i >= buf.length - 22 - 0xffff; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip file: no end-of-central-directory record');

  const entryCount = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);

  const out = new Map<string, Buffer>();
  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Corrupt central directory entry');
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);

    // The local header's own name/extra lengths are authoritative for locating
    // the data; the central directory's copies can differ.
    if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Corrupt local header for ${name}`);
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) out.set(name, Buffer.from(raw));
    else if (method === 8) out.set(name, inflateRawSync(raw));
    else throw new Error(`Unsupported zip compression method ${method} for ${name}`);

    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}
