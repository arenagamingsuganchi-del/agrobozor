import { NextResponse } from 'next/server';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const connectionString = 'postgresql://postgres.rjpscvvhspvpfplxukhr:Designer.9407740@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres';
  const client = new Client({ connectionString });

  try {
    await client.connect();

    // 1. Get migrations directory path
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      return NextResponse.json({ error: `Migrations directory not found at: ${migrationsDir}` }, { status: 500 });
    }

    // 2. Read and sort migration files
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    const results: string[] = [];

    // 3. Execute each migration in sequence
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      console.log(`Executing migration: ${file}`);
      await client.query(sql);
      results.push(`Success: ${file}`);
    }

    await client.end();
    return NextResponse.json({ success: true, migrations: results });
  } catch (err: unknown) {
    try {
      await client.end();
    } catch {}
    console.error("Migration failed:", err);
    const errMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
