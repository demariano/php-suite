import { ENV_KEYS, EnvVariables } from '@data-access/config/env';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    return NextResponse.json(
        ENV_KEYS.reduce((acc, key) => {
            acc[key] = process.env[key] ?? '';
            return acc;
        }, {} as EnvVariables)
    );
}
