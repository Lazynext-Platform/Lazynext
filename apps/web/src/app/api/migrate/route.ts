import { NextResponse } from 'next/server';
import { db } from '@/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.BETTER_AUTH_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log("Running migrations via API endpoint...");
    
    // In production, the Next.js standalone server runs from /app/apps/web/server.js
    // The drizzle migrations folder is copied to /app/apps/web/drizzle
    const migrationsFolder = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'drizzle') // actually process.cwd() is /app/apps/web in standalone
      : path.join(process.cwd(), 'drizzle');
      
    // Wait, let's just use absolute path to be safe in standalone mode
    const absolutePath = process.env.NODE_ENV === 'production' 
      ? '/app/apps/web/drizzle' 
      : path.join(process.cwd(), 'drizzle');

    await migrate(db, { migrationsFolder: absolutePath });
    
    console.log("Migrations completed successfully!");
    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
