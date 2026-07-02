import { NextResponse } from 'next/server';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

export async function GET() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const fileExists = fs.existsSync(envPath);
  
  dotenv.config({ path: envPath });
  
  const key = process.env.OPENAI_API_KEY;
  return NextResponse.json({ 
    hasKey: !!key, 
    cwd: process.cwd(),
    envPath,
    fileExists,
    envKeys: Object.keys(process.env).filter(k => k.startsWith('OPENAI'))
  });
}
