import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory cache for secrets
interface SecretCache {
    secrets: Record<string, string>;
    timestamp: number;
    ttl: number; // Time to live in milliseconds
}

// Global cache variable (persists across requests in the same Node.js process)
let secretsCache: SecretCache | null = null;

// Cache TTL: 1 day (86,400,000 ms)
const CACHE_TTL = 24 * 60 * 60 * 1000;

async function getCachedSecrets(): Promise<Record<string, string>> {
    const now = Date.now();

    // Check if cache exists and is still valid
    if (secretsCache && now - secretsCache.timestamp < secretsCache.ttl) {
        console.log('Returning secrets from cache');
        return secretsCache.secrets;
    }

    console.log('Cache miss or expired, fetching from AWS Secrets Manager');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const secretsManagerParams: any = {
        region: process.env.DEFAULT_REGION,
    };

    // if (process.env.LOCALSTACK_STATUS === 'ENABLED') {
    //     secretsManagerParams.endpoint = process.env.LOCALSTACK_ENDPOINT;
    // }

    // Create a Secrets Manager client
    const client = new SecretsManagerClient(secretsManagerParams);

    // Retrieve the secrets value
    const { SecretString } = await client.send(
        new GetSecretValueCommand({
            SecretId: process.env.AWS_SECRET_ID,
            VersionStage: 'AWSCURRENT',
        })
    );

    const secrets = JSON.parse(SecretString || '{}');

    // Update cache
    secretsCache = {
        secrets,
        timestamp: now,
        ttl: CACHE_TTL,
    };

    console.log(`Cached ${Object.keys(secrets).length} secrets`);

    return secrets;
}

// Function to invalidate cache (useful for testing or forced refresh)
function invalidateSecretsCache(): void {
    secretsCache = null;
    console.log('Secrets cache invalidated');
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const secretKey = searchParams.get('key');

    // Input validation
    if (!secretKey || typeof secretKey !== 'string' || secretKey.trim().length === 0) {
        return NextResponse.json(
            {
                error: 'Secret key parameter is required.',
            },
            { status: 400 }
        );
    }

    // Sanitize input to prevent injection attacks
    const sanitizedSecretKey = secretKey.trim().replace(/[^\w\-_.]/g, '');
    if (sanitizedSecretKey !== secretKey.trim()) {
        return NextResponse.json({ error: 'Invalid characters in secret key.' }, { status: 400 });
    }

    try {
        // Get secrets from cache (or fetch from AWS if cache is empty/expired)
        const secrets = await getCachedSecrets();

        // Check if the requested secret key exists
        if (!(sanitizedSecretKey in secrets)) {
            return NextResponse.json({ error: 'Secret key not found' }, { status: 404 });
        }

        const secretValue = secrets[sanitizedSecretKey];

        const response = NextResponse.json({
            message: 'Secret fetched successfully',
            key: secretKey,
        });

        const cookieOptions = {
            httpOnly: false, // Must be false for client-side access
            secure: false,
            sameSite: 'lax',
            maxAge: 60 * 2,
            path: '/',
        } as const;

        // Set secret value as a cookie using the sanitized key
        response.cookies.set(sanitizedSecretKey, secretValue as string, cookieOptions);

        return response;
    } catch (error) {
        console.error('Error fetching secret:', error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}

// Delete the secrets cache
export async function DELETE() {
    try {
        invalidateSecretsCache();
        return NextResponse.json({
            message: 'Secrets cache invalidated successfully',
        });
    } catch (error) {
        console.error('Error invalidating cache:', error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
