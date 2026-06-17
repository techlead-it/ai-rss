// テスト専用: node:sqlite を D1Database 互換 API でラップする。
// 実 SQLite（FTS5 trigram を含む）で repository をテストするために使う。
// `.test.ts` からのみ import すること（Worker バンドルには含めない）。
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { D1Database, D1Result } from "@cloudflare/workers-types";

type Param = string | number | null;

class FakeD1PreparedStatement {
  private readonly db: DatabaseSync;
  private readonly sql: string;
  private readonly params: Param[];

  constructor(db: DatabaseSync, sql: string, params: Param[] = []) {
    this.db = db;
    this.sql = sql;
    this.params = params;
  }

  bind(...params: Param[]): FakeD1PreparedStatement {
    return new FakeD1PreparedStatement(this.db, this.sql, params);
  }

  all<T = Record<string, unknown>>(): D1Result<T> {
    const stmt = this.db.prepare(this.sql);
    const results = stmt.all(...this.params) as T[];
    return { results, success: true, meta: {} } as unknown as D1Result<T>;
  }

  first<T = unknown>(colName?: string): T | null {
    const stmt = this.db.prepare(this.sql);
    const row = stmt.get(...this.params) as Record<string, unknown> | undefined;
    if (row == null) return null;
    if (colName != null) return (row[colName] ?? null) as T;
    return row as T;
  }

  run<T = Record<string, unknown>>(): D1Result<T> {
    const stmt = this.db.prepare(this.sql);
    const info = stmt.run(...this.params);
    return {
      results: [],
      success: true,
      meta: {
        last_row_id: Number(info.lastInsertRowid),
        changes: info.changes,
      },
    } as unknown as D1Result<T>;
  }
}

class FakeD1Database {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  prepare(sql: string): FakeD1PreparedStatement {
    return new FakeD1PreparedStatement(this.db, sql);
  }

  async batch<T = unknown>(
    statements: FakeD1PreparedStatement[],
  ): Promise<D1Result<T>[]> {
    return statements.map((s) => s.run<T>());
  }

  async exec(sql: string): Promise<{ count: number; duration: number }> {
    this.db.exec(sql);
    return { count: 0, duration: 0 };
  }
}

const MIGRATIONS_DIR = join(process.cwd(), "migrations");

/** migrations/ 配下の .sql を順に適用した、テスト用 D1 を作る。 */
export function createTestD1(): D1Database {
  const db = new DatabaseSync(":memory:");
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f: string) => f.endsWith(".sql"))
    .sort();
  for (const file of files) {
    db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  }
  return new FakeD1Database(db) as unknown as D1Database;
}
