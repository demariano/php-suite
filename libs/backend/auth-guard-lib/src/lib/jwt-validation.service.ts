import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';

interface ValidatedUser {
    sub: string;
    email: string;
    groups: string[];
}

@Injectable()
export class JwtValidationService {
    private readonly logger = new Logger(JwtValidationService.name);
    private jwksClient: JwksClient;
    private awsCognitoAuthority: string;

    constructor(private configService: ConfigService) {
        this.awsCognitoAuthority = process.env['LOCALSTACK_STATUS'] === 'ENABLED'
            ? process.env['AWS_COGNITO_AUTHORITY_LOCAL_DEV'] || ''
            : configService.get<string>('AWS_COGNITO_AUTHORITY') || '';


        //check if the authority has the https:// protocol
        if (!this.awsCognitoAuthority.startsWith('https://')) {
            this.awsCognitoAuthority = `https://${this.awsCognitoAuthority}`;
        }

        this.jwksClient = new JwksClient({
            jwksUri: `${this.awsCognitoAuthority}/.well-known/jwks.json`,
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 10,
        });
    }

    async validateToken(token: string): Promise<ValidatedUser> {
        try {
            // Decode the token header to get the key ID
            const decoded = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
            const kid = decoded.kid;

            if (!kid) {
                throw new Error('Token missing kid in header');
            }

            // Get the signing key
            const key = await this.jwksClient.getSigningKey(kid);
            const signingKey = key.getPublicKey();

            // Verify the token
            const payload = verify(token, signingKey, {
                issuer: this.awsCognitoAuthority,
                algorithms: ['RS256'],
            }) as any;

            return {
                sub: payload.sub,
                email: payload.email,
                groups: payload['cognito:groups'] || [],
            };
        } catch (error) {
            this.logger.error('Token validation failed', error);
            throw new Error('Invalid token');
        }
    }

    extractTokenFromEvent(event: any): string | null {
        // Try Authorization header first
        const authHeader = event.headers?.Authorization || event.headers?.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }

        // Fallback to query parameter
        return event.queryStringParameters?.token || null;
    }
} 