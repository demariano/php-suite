import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyHeaderGuard implements CanActivate {
    private apiKey: string;
    constructor(private configService: ConfigService) {
        this.apiKey = this.configService.get<string>('WEB_APP_API_KEY') || '';
    }

    canActivate(context: ExecutionContext) {
        const request = context.switchToHttp().getRequest();
        const shouldBypass = process.env['BYPASS_AUTH'] === 'ENABLED';

        if (shouldBypass) {
            return true;
        }

        return request.get('X-API-KEY') == this.apiKey;
    }
}
