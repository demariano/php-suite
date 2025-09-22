import { AdminCreateUserCommand, AdminCreateUserCommandInput, AdminDeleteUserCommand, AdminGetUserCommand, AdminInitiateAuthCommand, AdminInitiateAuthCommandInput, AdminRespondToAuthChallengeCommand, AdminRespondToAuthChallengeCommandInput, AdminRespondToAuthChallengeCommandOutput, AdminSetUserPasswordCommand, ChallengeNameType, CognitoIdentityProviderClient, ConfirmForgotPasswordCommand, ConfirmSignUpCommand, ForgotPasswordCommand, ListUsersCommand, ResendConfirmationCodeCommand, SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import { CognitoCompleteNewPasswordDto, CognitoConfirmUserDto, CognitoDto, CognitoEmailDto, CognitoForgotPasswordDto, CognitoRefreshTokenDto, CognitoTokenDto } from '@dto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AwsCognitoLibService {
    private readonly logger = new Logger(AwsCognitoLibService.name);
    private cognitoClient: CognitoIdentityProviderClient;
    private userPoolId: string;
    private clientId: string;

    constructor(private readonly configService: ConfigService) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cognitoConfig: any = {
            region: this.configService.get<string>('DEFAULT_REGION'),
        };

        if (process.env['LOCALSTACK_STATUS'] === 'ENABLED') {
            cognitoConfig.credentials = {
                accessKeyId: process.env['AWS_ACCESS_KEY_LOCAL_DEV'],
                secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY_LOCAL_DEV'],
            };
            this.userPoolId = process.env['AWS_COGNITO_USER_POOL_ID_LOCAL_DEV'] || '';
            this.clientId = process.env['AWS_COGNITO_CLIENT_ID_LOCAL_DEV'] || '';
        } else {
            this.userPoolId = this.configService.get<string>(
                'AWS_COGNITO_USER_POOL_ID'
            ) || '';
            this.clientId = this.configService.get<string>(
                'AWS_COGNITO_CLIENT_ID'
            ) || '';
        }

        this.cognitoClient = new CognitoIdentityProviderClient(cognitoConfig);
    }

    async getCognitoUser(email: string) {

        this.logger.log(`Getting Cognito User: ${email}`);

        const input = {
            UserPoolId: this.userPoolId,
            Username: email,
        };
        const command = new AdminGetUserCommand(input);
        const response = await this.cognitoClient.send(command);

        this.logger.log(`Cognito User: ${JSON.stringify(response)}`);

        return response;
    }

    async deleteUser(data: CognitoEmailDto) {

        this.logger.log(`Deleting Cognito User: ${data.email}`);



        const input = {
            UserPoolId: this.userPoolId,
            Username: data.email,
        };
        const command = new AdminDeleteUserCommand(input);
        const response = await this.cognitoClient.send(command);

        this.logger.log(`Cognito User Deleted: ${JSON.stringify(response)}`);

        return response;
    }

    async deleteUserByEmail(email: string) {
        this.logger.log(`Deleting Cognito User by email: ${email}`);

        // First find the user by email
        const user = await this.getCognitoUserByEmail(email);

        if (!user) {
            this.logger.warn(`No user found with email: ${email}`);
            return null;
        }

        const input = {
            UserPoolId: this.userPoolId,
            Username: user.Username,
        };

        const command = new AdminDeleteUserCommand(input);
        const response = await this.cognitoClient.send(command);

        this.logger.log(`Cognito User Deleted: ${JSON.stringify(response)}`);

        return response;
    }

    async loginUser(data: CognitoDto) {


        const input = {
            UserPoolId: this.userPoolId,
            ClientId: this.clientId,
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
            AuthParameters: {
                USERNAME: data.email,
                PASSWORD: data.password,
            },
        };

        const command = new AdminInitiateAuthCommand(input as AdminInitiateAuthCommandInput);

        const response = await this.cognitoClient.send(command);


        return response;
    }

    async triggerForgotPassword(data: CognitoEmailDto) {

        this.logger.log(`Triggering Forgot Password for: ${data.email}`);

        const input = {
            UserPoolId: this.userPoolId,
            ClientId: this.clientId,
            Username: data.email,

        };
        const command = new ForgotPasswordCommand(input);
        const response = await this.cognitoClient.send(command);

        this.logger.log(`Forgot Password Triggered: ${JSON.stringify(response)}`);

        return response;

    }

    async confirmPasswordCode(data: CognitoForgotPasswordDto) {

        this.logger.log(`Confirming Password Code for: ${data.email}`);

        const input = {
            UserPoolId: this.userPoolId,
            ClientId: this.clientId,
            Username: data.email,
            ConfirmationCode: data.code,
            Password: data.password

        };
        const command = new ConfirmForgotPasswordCommand(input);
        const response = await this.cognitoClient.send(command);

        this.logger.log(`Password Code Confirmed: ${JSON.stringify(response)}`);

        return response;
    }

    async changePassword(data: CognitoDto) {
        const input = {
            UserPoolId: this.userPoolId,
            ClientId: this.clientId,
            Username: data.email,
            Password: data.password,
            Permanent: true,


        };
        const command = new AdminSetUserPasswordCommand(input);
        const response = await this.cognitoClient.send(command);

        this.logger.log(`Password Changed: ${JSON.stringify(response)}`);

        return response;
    }

    async signupUser(data: CognitoDto) {


        this.logger.log(`Signing up User: ${data.email}`);

        const input = {
            ClientId: this.clientId,
            Password: data.password,
            Username: data.email,
        };

        const command = new SignUpCommand(input);

        const response = await this.cognitoClient.send(command);

        this.logger.log(`User Signed Up: ${JSON.stringify(response)}`);

        return response;
    }

    async completeNewPassword(data: CognitoCompleteNewPasswordDto) {

        this.logger.log(`Completing New Password for: ${data.email}`);

        const input = {
            ChallengeName: 'NEW_PASSWORD_REQUIRED',
            UserPoolId: this.userPoolId,
            ClientId: this.clientId,
            ChallengeResponses: {
                USERNAME: data.email,
                NEW_PASSWORD: data.password,
            },
            Session: data.session
        };

        const command = new AdminRespondToAuthChallengeCommand(input as AdminRespondToAuthChallengeCommandInput);

        const response = await this.cognitoClient.send(command);

        console.log(response);

        this.logger.log(`New Password Completed: ${JSON.stringify(response)}`);

        return response;
    }

    async resendConfirmationCode(data: CognitoEmailDto) {

        this.logger.log(`Resending Confirmation Code for: ${data.email}`);

        const input = {
            ClientId: this.clientId,
            Username: data.email,
        };
        const command = new ResendConfirmationCodeCommand(input);

        const response = await this.cognitoClient.send(command);

        this.logger.log(`Confirmation Code Resent: ${JSON.stringify(response)}`);

        return response;
    }

    async confirmUser(data: CognitoConfirmUserDto) {

        this.logger.log(`Confirming User: ${data.email}`);

        const input = {
            ClientId: this.clientId,
            Username: data.email,
            ConfirmationCode: data.code,
            ForceAliasCreation: false,
        };
        const command = new ConfirmSignUpCommand(input);

        const response = await this.cognitoClient.send(command);

        this.logger.log(`User Confirmed: ${JSON.stringify(response)}`);

        return response;
    }

    async resendInvitation(data: CognitoEmailDto) {

        this.logger.log(`Resending Invitation for: ${data.email}`);

        const input = {
            UserPoolId: this.userPoolId,
            Username: data.email,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: data.email,
                },
                {
                    Name: 'email_verified',
                    Value: 'true',
                },
            ],
            ForceAliasCreation: false,
            MessageAction: 'RESEND',

            DesiredDeliveryMediums: ['EMAIL'],
        };
        const command = new AdminCreateUserCommand(input as AdminCreateUserCommandInput);
        const response = await this.cognitoClient.send(command);

        this.logger.log(`Invitation Resent: ${JSON.stringify(response)}`);

        return response;
    }


    async verifyMFACode(username: string, code: string, session: string) {
        const input = {
            UserPoolId: this.configService.get<string>("AWS_COGNITO_USER_POOL_ID"),
            ClientId: this.configService.get<string>("AWS_COGNITO_CLIENT_ID"),
            ChallengeName: ChallengeNameType.EMAIL_OTP,
            ChallengeResponses: {
                USERNAME: username,
                EMAIL_OTP_CODE: code,
            },
            Session: session,
        };
        const command = new AdminRespondToAuthChallengeCommand(input);
        const response: AdminRespondToAuthChallengeCommandOutput = await this.cognitoClient.send(command);
        return response;
    }

    async adminCreateUser(data: CognitoEmailDto) {

        this.logger.log(`Admin Creating User: ${data.email}`);

        const input = {
            UserPoolId: this.userPoolId,
            Username: data.email,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: data.email,
                },
                {
                    Name: 'email_verified',
                    Value: 'true',
                },
            ],
            ForceAliasCreation: false,

            DesiredDeliveryMediums: ['EMAIL'],
        };
        const command = new AdminCreateUserCommand(input as AdminCreateUserCommandInput);


        const response = await this.cognitoClient.send(command);

        this.logger.log(`User Created: ${JSON.stringify(response)}`);


        return response;
    }

    // // call cognito  /oauth2/token endpoint with grant_type=authorization_code
    // async generateToken(code: string) {

    //     this.logger.log(`Generating Token for: ${code}`);

    //     const input = {
    //         grant_type: 'authorization_code',
    //         client_id: this.clientId,
    //         code: code,
    //         redirect_uri: this.configService.get<string>(
    //             'AWS_COGNITO_REDIRECT_URL'
    //         ) || '',
    //     };
    //     const queryString = await this.generateQueryString(input);
    //     const url = `${this.configService.get<string>(
    //         'AWS_COGNITO_DOMAIN_URL'
    //     )}/oauth2/token?${queryString}`;
    //     const response = await fetch(url, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/x-www-form-urlencoded'
    //         },
    //     });

    //     return response.json();
    // }





    //build query string from CognitoTokenDto
    async generateQueryString(data: CognitoTokenDto) {
        let queryString = '';

        for (const [key, value] of Object.entries(data)) {
            queryString += `${key}=${value}&`;
        }

        return queryString;
    };

    async getCognitoUserByEmail(email: string) {
        this.logger.log(`Getting Cognito User by email: ${email}`);

        const input = {
            UserPoolId: this.userPoolId,
            Filter: `email = "${email}"`,
        };

        const command = new ListUsersCommand(input);
        const response = await this.cognitoClient.send(command);

        this.logger.log(`Cognito Users found: ${JSON.stringify(response)}`);

        // Return the first user if found, otherwise null
        return response.Users?.[0] || null;
    }

    async refreshToken(data: CognitoRefreshTokenDto) {

        const input = {
            UserPoolId: this.configService.get<string>('AWS_COGNITO_USER_POOL_ID'),
            ClientId: this.configService.get<string>('AWS_COGNITO_CLIENT_ID'),
            AuthFlow: 'REFRESH_TOKEN_AUTH',
            AuthParameters: {
                REFRESH_TOKEN: data.refreshToken,
            }
        };

        const command = new AdminInitiateAuthCommand(input as AdminInitiateAuthCommandInput);
        const response = await this.cognitoClient.send(command);

        return response.AuthenticationResult;
    }

}
