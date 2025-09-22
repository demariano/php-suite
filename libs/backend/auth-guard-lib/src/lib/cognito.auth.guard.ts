import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CognitoAuthGuard extends AuthGuard('jwt') {
    override getRequest(context: ExecutionContext) {
        return context.switchToHttp().getRequest();
    }

    override handleRequest(err: any, user: any, info: any) {
        const shouldBypass = process.env['BYPASS_AUTH'] === 'ENABLED';

        if (shouldBypass) {
            return {
                username: 'admin@old.st',
                roles: ['USER', 'ADMIN']

            };
        }


        if (err || !user) {
            throw err || new UnauthorizedException();
        }

        return user;
    }
}
