import {
    CognitoCompleteNewPasswordDto,
    CognitoConfirmCodeDto,
    CognitoConfirmUserDto,
    CognitoDto,
    CognitoEmailDto,
    CognitoRefreshTokenDto,
    CognitoVerifyMfaDto,
} from '@dto';
import { Body, Controller, Delete, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AdminCreateUserCommand } from './commands/admin.create.user/admin.create.user.command';
import { ChangePasswordCommand } from './commands/change.password/change.password.command';
import { CompleteNewPasswordCommand } from './commands/complete.new.password/complete.new.password.command';
import { ConfirmPasswordCodeCommand } from './commands/confirm.password.code/confirm.password.code.command';
import { ConfirmUserCommand } from './commands/confirm.user/confirm.user.command';
import { DeleteUserCommand } from './commands/delete.user/delete.user.command';
import { ForgotPasswordCommand } from './commands/forgot.password/forgot.password.command';
import { LoginCommand } from './commands/login/login.command';
import { RefreshTokenCommand } from './commands/refresh.token/refresh.token.command';
import { ResendConfirmationCodeCommand } from './commands/resend.confirmation.code/resend.confirmation.code.command';
import { ResendInvitationCommand } from './commands/resend.invitation/resend.invitation.command';
import { SignUpUserCommand } from './commands/sign.up.user/sign.up.user.command';
import { VerifyMFACodeCommand } from './commands/verify.mfa/verify.mfa.confirmation.code.command';

@Controller('authentication')
@ApiTags('authentication')
export class AuthenticationController {
    constructor(private readonly commandBus: CommandBus) {}

    @Post('admin-create-user')
    @ApiOperation({
        summary: 'Admin create user',
        description: 'Creates a new user account through admin privileges. Sends invitation email to the user.',
    })
    @ApiResponse({
        status: 201,
        description: 'User successfully created',
        schema: {
            example: {
                statusCode: 201,
                body: {
                    userSub: 'c0a8a0a0-1234-5678-9abc-123456789abc',
                    email: 'newuser@example.com',
                    status: 'FORCE_CHANGE_PASSWORD',
                    invitationSent: true,
                    dateCreated: '2024-01-15T10:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid email or user already exists',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User already exists' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoEmailDto,
        description: 'User creation payload',
        examples: {
            example1: {
                summary: 'Create new user',
                value: {
                    email: 'newuser@example.com',
                },
            },
        },
    })
    adminCreateUser(@Body() adminCreateUserDto: CognitoEmailDto) {
        const { email } = adminCreateUserDto;
        const command = new AdminCreateUserCommand(email);
        return this.commandBus.execute(command);
    }

    @Post('login')
    @ApiOperation({
        summary: 'User login',
        description: 'Authenticates a user with email and password. Returns JWT tokens for authenticated requests.',
    })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    AuthenticationResult: {
                        AccessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                        RefreshToken: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ...',
                        IdToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                        TokenType: 'Bearer',
                        ExpiresIn: 3600,
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid credentials or user requires password change',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid email or password' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoDto,
        description: 'Login credentials',
        examples: {
            example1: {
                summary: 'User login',
                value: {
                    email: 'user@example.com',
                    password: 'SecurePassword123!',
                },
            },
        },
    })
    login(@Body() loginDto: CognitoDto) {
        const { email, password } = loginDto;
        const command = new LoginCommand(email, password);
        return this.commandBus.execute(command);
    }

    @Post('complete-new-password')
    @ApiOperation({
        summary: 'Complete new password setup',
        description: 'Completes the new password challenge for users who need to change their temporary password.',
    })
    @ApiResponse({
        status: 200,
        description: 'Password successfully updated',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    AuthenticationResult: {
                        AccessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                        RefreshToken: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ...',
                        IdToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                        TokenType: 'Bearer',
                        ExpiresIn: 3600,
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid session or password requirements not met',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Password does not meet requirements' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoCompleteNewPasswordDto,
        description: 'New password completion data',
        examples: {
            example1: {
                summary: 'Complete password setup',
                value: {
                    email: 'user@example.com',
                    password: 'NewSecurePassword123!',
                    session: 'AYABeGMxHkRsVJI8F4xWcIe...',
                },
            },
        },
    })
    completeNewPassword(@Body() completeNewPasswordDto: CognitoCompleteNewPasswordDto) {
        const { email, password, session } = completeNewPasswordDto;
        const command = new CompleteNewPasswordCommand(email, password, session);
        return this.commandBus.execute(command);
    }

    @Post('forgot-password')
    @ApiOperation({
        summary: 'Initiate password reset',
        description: "Initiates the password reset process by sending a verification code to the user's email.",
    })
    @ApiResponse({
        status: 200,
        description: 'Password reset code sent successfully',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    message: 'Password reset code sent to email',
                    deliveryMedium: 'EMAIL',
                    destination: 'u***@example.com',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User not found' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoEmailDto,
        description: 'Email for password reset',
        examples: {
            example1: {
                summary: 'Reset password request',
                value: {
                    email: 'user@example.com',
                },
            },
        },
    })
    forgotPassword(@Body() data: CognitoEmailDto) {
        const { email } = data;
        const command = new ForgotPasswordCommand(email);
        return this.commandBus.execute(command);
    }

    @Post('confirm-password-code')
    @ApiOperation({
        summary: 'Confirm password reset',
        description: 'Confirms the password reset using the verification code and sets the new password.',
    })
    @ApiResponse({
        status: 200,
        description: 'Password successfully reset',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    message: 'Password successfully reset',
                    email: 'user@example.com',
                    timestamp: '2024-01-15T10:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid or expired code',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid or expired verification code' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoConfirmCodeDto,
        description: 'Password reset confirmation data',
        examples: {
            example1: {
                summary: 'Confirm password reset',
                value: {
                    email: 'user@example.com',
                    code: '123456',
                    password: 'NewSecurePassword123!',
                },
            },
        },
    })
    confirmPasswordCode(@Body() data: CognitoConfirmCodeDto) {
        const { email, code, password } = data;
        const command = new ConfirmPasswordCodeCommand(email, password, code);
        return this.commandBus.execute(command);
    }

    @Post('resend-confirmation-code')
    @ApiOperation({
        summary: 'Resend confirmation code',
        description: 'Resends the email confirmation code to the user for account verification.',
    })
    @ApiResponse({
        status: 200,
        description: 'Confirmation code resent successfully',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    message: 'Confirmation code resent',
                    deliveryMedium: 'EMAIL',
                    destination: 'u***@example.com',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - User already confirmed or limit exceeded',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User already confirmed or resend limit exceeded' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoEmailDto,
        description: 'Email for confirmation code resend',
        examples: {
            example1: {
                summary: 'Resend confirmation',
                value: {
                    email: 'user@example.com',
                },
            },
        },
    })
    resendConfirmationCode(@Body() data: CognitoEmailDto) {
        const { email } = data;
        const command = new ResendConfirmationCodeCommand(email);
        return this.commandBus.execute(command);
    }

    @Post('change-password')
    @ApiOperation({
        summary: 'Change user password',
        description: 'Changes the password for an authenticated user. Requires current authentication.',
    })
    @ApiResponse({
        status: 200,
        description: 'Password successfully changed',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    message: 'Password successfully changed',
                    email: 'user@example.com',
                    timestamp: '2024-01-15T10:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid password or authentication required',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Password does not meet requirements' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoDto,
        description: 'Password change data',
        examples: {
            example1: {
                summary: 'Change password',
                value: {
                    email: 'user@example.com',
                    password: 'NewSecurePassword123!',
                },
            },
        },
    })
    changePassword(@Body() data: CognitoDto) {
        const { email, password } = data;
        const command = new ChangePasswordCommand(email, password);
        return this.commandBus.execute(command);
    }

    @Post('confirm-user')
    @ApiOperation({
        summary: 'Confirm user registration',
        description: 'Confirms user registration using the verification code sent to their email.',
    })
    @ApiResponse({
        status: 200,
        description: 'User successfully confirmed',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    message: 'User successfully confirmed',
                    email: 'user@example.com',
                    status: 'CONFIRMED',
                    timestamp: '2024-01-15T10:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid or expired code',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid or expired confirmation code' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoConfirmUserDto,
        description: 'User confirmation data',
        examples: {
            example1: {
                summary: 'Confirm user',
                value: {
                    email: 'user@example.com',
                    code: '123456',
                },
            },
        },
    })
    confirmUser(@Body() data: CognitoConfirmUserDto) {
        const { email, code } = data;
        const command = new ConfirmUserCommand(email, code);
        return this.commandBus.execute(command);
    }

    @Post('resend-invitation')
    @ApiOperation({
        summary: 'Resend user invitation',
        description: 'Resends invitation email to users created by admin who have not yet completed registration.',
    })
    @ApiResponse({
        status: 200,
        description: 'Invitation resent successfully',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    message: 'Invitation resent successfully',
                    email: 'user@example.com',
                    deliveryMedium: 'EMAIL',
                    timestamp: '2024-01-15T10:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - User not found or already confirmed',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User not found or already confirmed' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoDto,
        description: 'User email for invitation resend',
        examples: {
            example1: {
                summary: 'Resend invitation',
                value: {
                    email: 'user@example.com',
                },
            },
        },
    })
    resendInvitation(@Body() data: CognitoDto) {
        const { email } = data;
        const command = new ResendInvitationCommand(email);
        return this.commandBus.execute(command);
    }

    @Post('sign-up-user')
    @ApiOperation({
        summary: 'User self-registration',
        description: 'Allows users to register themselves with email and password. Sends confirmation code to email.',
    })
    @ApiResponse({
        status: 201,
        description: 'User registration initiated successfully',
        schema: {
            example: {
                statusCode: 201,
                body: {
                    userSub: 'a1b2c3d4-5678-90ab-cdef-123456789abc',
                    email: 'newuser@example.com',
                    status: 'UNCONFIRMED',
                    confirmationRequired: true,
                    deliveryMedium: 'EMAIL',
                    destination: 'n***@example.com',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - User already exists or password requirements not met',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: {
                            type: 'string',
                            example: 'User already exists or password does not meet requirements',
                        },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoDto,
        description: 'User registration data',
        examples: {
            example1: {
                summary: 'User signup',
                value: {
                    email: 'newuser@example.com',
                    password: 'SecurePassword123!',
                },
            },
        },
    })
    signUpUser(@Body() data: CognitoDto) {
        const { email, password } = data;
        const command = new SignUpUserCommand(email, password);
        return this.commandBus.execute(command);
    }

    @Delete('email/:email')
    @ApiOperation({
        summary: 'Delete user account',
        description: 'Permanently deletes a user account from the authentication system. This action cannot be undone.',
    })
    @ApiParam({
        name: 'email',
        description: 'Email address of the user to delete',
        example: 'user@example.com',
    })
    @ApiResponse({
        status: 200,
        description: 'User successfully deleted',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    message: 'User successfully deleted',
                    email: 'user@example.com',
                    timestamp: '2024-01-15T10:30:00Z',
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'User not found',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'User not found' },
                    },
                },
            },
        },
    })
    deleteUser(@Param('email') email: string) {
        const command = new DeleteUserCommand(email);
        return this.commandBus.execute(command);
    }

    @Post('verify-mfa')
    @ApiOperation({
        summary: 'Verify MFA code',
        description: 'Verifies the Multi-Factor Authentication code during the login process.',
    })
    @ApiResponse({
        status: 200,
        description: 'MFA verification successful',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    AuthenticationResult: {
                        AccessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                        RefreshToken: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ...',
                        IdToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                        TokenType: 'Bearer',
                        ExpiresIn: 3600,
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid MFA code or session',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid MFA code or expired session' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoVerifyMfaDto,
        description: 'MFA verification data',
        examples: {
            example1: {
                summary: 'Verify MFA code',
                value: {
                    email: 'user@example.com',
                    code: '123456',
                    session: 'AYABeGMxHkRsVJI8F4xWcIe...',
                },
            },
        },
    })
    verifyMFACode(@Body() data: CognitoVerifyMfaDto) {
        const command = new VerifyMFACodeCommand(data.email, data.code, data.session);
        return this.commandBus.execute(command);
    }

    @Post('refresh-token')
    @ApiOperation({
        summary: 'Refresh access token',
        description: 'Refreshes the access token using a valid refresh token to extend the user session.',
    })
    @ApiResponse({
        status: 200,
        description: 'Token refreshed successfully',
        schema: {
            example: {
                statusCode: 200,
                body: {
                    AuthenticationResult: {
                        AccessToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                        IdToken: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...',
                        TokenType: 'Bearer',
                        ExpiresIn: 3600,
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad request - Invalid or expired refresh token',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                body: {
                    type: 'object',
                    properties: {
                        errorMessage: { type: 'string', example: 'Invalid or expired refresh token' },
                    },
                },
            },
        },
    })
    @ApiBody({
        type: CognitoRefreshTokenDto,
        description: 'Token refresh data',
        examples: {
            example1: {
                summary: 'Refresh token',
                value: {
                    refreshToken: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ...',
                    email: 'user@example.com',
                },
            },
        },
    })
    refreshToken(@Body() data: CognitoRefreshTokenDto) {
        const command = new RefreshTokenCommand(data);
        return this.commandBus.execute(command);
    }
}
