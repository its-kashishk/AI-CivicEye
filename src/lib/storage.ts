// File storage abstraction (docs/04 §7). MVP driver = local disk under UPLOAD_DIR
// (git-ignored). The interface lets an object-storage driver replace it later.
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "@/lib/config";

export interface FileStorage {
  put(key: string, data: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

class LocalDiskStorage implements FileStorage {
  private resolve(key: string): string {
    const root = path.resolve(config.uploadDir());
    const full = path.resolve(root, key);
    // Keys are generated server-side, but guard against traversal anyway.
    if (full !== root && !full.startsWith(root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }
  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }
  async get(key: string) {
    return readFile(this.resolve(key));
  }
  async remove(key: string) {
    await unlink(this.resolve(key)).catch(() => undefined);
  }
}

export const storage: FileStorage = new LocalDiskStorage();
