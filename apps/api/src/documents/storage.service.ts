import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { isAbsolute, join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';

/**
 * Penyimpanan objek privat di disk lokal. Nama file dibuat sistem (UUID), tidak pernah dari input pengguna,
 * sehingga tidak ada path traversal. Antarmuka ini bisa diganti adaptor S3/R2 tanpa mengubah pemanggil.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly root: string;

  constructor(config: ConfigService<Env, true>) {
    const dir = config.get('STORAGE_DIR', { infer: true });
    this.root = isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
  }

  private pathOf(key: string): string {
    if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error('Kunci penyimpanan tidak valid.');
    return join(this.root, key.slice(0, 2), key);
  }

  async put(content: Buffer): Promise<string> {
    const key = randomUUID();
    const path = this.pathOf(key);
    await mkdir(join(this.root, key.slice(0, 2)), { recursive: true });
    await writeFile(path, content, { flag: 'wx', mode: 0o600 });
    return key;
  }

  async open(key: string): Promise<{ stream: Readable; size: number }> {
    const path = this.pathOf(key);
    const info = await stat(path);
    return { stream: createReadStream(path), size: info.size };
  }

  async remove(key: string): Promise<void> {
    try {
      await rm(this.pathOf(key), { force: true });
    } catch (err) {
      // Catatan sudah dihapus lunak; file yatim dibersihkan manual, tidak menggagalkan permintaan.
      this.logger.warn({ msg: 'Gagal menghapus file penyimpanan', key, err });
    }
  }
}
