import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function createUsageStore(path, limits, clock = () => new Date()) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA busy_timeout=3000; PRAGMA journal_mode=WAL;');
  db.exec('CREATE TABLE IF NOT EXISTS daily (day TEXT PRIMARY KEY, requests INTEGER NOT NULL, characters INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS rate (credential TEXT PRIMARY KEY, minute INTEGER NOT NULL, requests INTEGER NOT NULL);');
  const dayQuery = db.prepare('SELECT requests, characters FROM daily WHERE day = ?');
  const rateQuery = db.prepare('SELECT minute, requests FROM rate WHERE credential = ?');
  return {
    reserve(credential, characters) {
      const now = clock();
      const day = now.toISOString().slice(0, 10);
      const minute = Math.floor(now.getTime() / 60000);
      db.exec('BEGIN IMMEDIATE');
      try {
        const daily = dayQuery.get(day) || { requests: 0, characters: 0 };
        const rate = rateQuery.get(credential);
        const count = rate?.minute === minute ? rate.requests : 0;
        if (daily.requests >= limits.dailyRequests || daily.characters + characters > limits.dailyCharacters || count >= limits.perMinute) {
          db.exec('ROLLBACK');
          return false;
        }
        db.prepare('INSERT INTO daily VALUES (?, 1, ?) ON CONFLICT(day) DO UPDATE SET requests=requests+1, characters=characters+excluded.characters').run(day, characters);
        db.prepare('INSERT INTO rate VALUES (?, ?, 1) ON CONFLICT(credential) DO UPDATE SET minute=excluded.minute, requests=?').run(credential, minute, count + 1);
        // Retain counters only; no text/audio. Old days are no longer needed.
        db.prepare('DELETE FROM daily WHERE day < ?').run(day);
        db.prepare('DELETE FROM rate WHERE minute < ?').run(minute - 2);
        db.exec('COMMIT');
        return true;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
    close() { db.close(); }
  };
}
