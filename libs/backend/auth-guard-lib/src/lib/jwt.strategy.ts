import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserCognito } from './UserCognito';

@Injectable()
export class JWTStrategy extends PassportStrategy(Strategy) {



    constructor(private configService: ConfigService) {
        const awsCognitoAuthority = process.env['LOCALSTACK_STATUS'] === 'ENABLED'
            ? process.env['AWS_COGNITO_AUTHORITY_LOCAL_DEV'] || ''
            : configService.get<string>('AWS_COGNITO_AUTHORITY') || '';

        super({
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 10,
                jwksUri: `${awsCognitoAuthority}/.well-known/jwks.json`,
            }),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            issuer: awsCognitoAuthority,
            algorithms: ['RS256'],
        });


    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async validate(payload: any) {
        const user: UserCognito = new UserCognito(
            payload.email,
            payload['cognito:groups']
        );

        return user;
    }
}
