import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
export const digest = (s: string) => createHash('sha256').update(s).digest('hex');
mkdirSync('data/local', { recursive: true, mode: 0o700 });
export const db = new DatabaseSync(process.env.EXITDRILL_DB ?? 'data/local/exitdrill.sqlite');
try {
  chmodSync(process.env.EXITDRILL_DB ?? 'data/local/exitdrill.sqlite', 0o600);
} catch {}
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, credential TEXT UNIQUE, expires INTEGER);
 CREATE TABLE IF NOT EXISTS inspections(id TEXT PRIMARY KEY,session TEXT REFERENCES sessions(id) ON DELETE CASCADE,data TEXT,created INTEGER);
 CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,session TEXT REFERENCES sessions(id) ON DELETE CASCADE,inspection TEXT,shares TEXT,idem TEXT,request TEXT,status TEXT,events TEXT,receipt TEXT,created INTEGER,UNIQUE(session,idem));`);
export function expire() {
  db.prepare('DELETE FROM sessions WHERE expires < ?').run(Date.now());
}
export function session() {
  expire();
  const token = randomBytes(32).toString('hex');
  const id = randomUUID();
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(id, digest(token), Date.now() + 86400000);
  return { id, token };
}
export function findSession(token?: string) {
  expire();
  return token
    ? (db
        .prepare('SELECT id FROM sessions WHERE credential=? AND expires>?')
        .get(digest(token), Date.now()) as { id: string } | undefined)
    : undefined;
}
