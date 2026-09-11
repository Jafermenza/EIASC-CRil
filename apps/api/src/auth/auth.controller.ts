import { BadRequestException, Body, Controller, Get, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { AuthService } from './auth.service';

interface CredentialsBody { identifier?: string; password?: string }
interface TokenBody { refreshToken?: string }
interface ResetBody { token?: string; newPassword?: string }

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: CredentialsBody, @Headers('x-request-id') requestId?: string) {
    if (!body.identifier?.trim() || !body.password) throw new BadRequestException('Identifier and password are required');
    return this.authService.login(body.identifier, body.password, requestId);
  }

  @Post('logout')
  logout(@Body() body: TokenBody, @Headers('x-request-id') requestId?: string) {
    if (!body.refreshToken) throw new BadRequestException('Refresh token is required');
    return this.authService.logout(body.refreshToken, requestId);
  }

  @Post('refresh')
  refresh(@Body() body: TokenBody, @Headers('x-request-id') requestId?: string) {
    if (!body.refreshToken) throw new BadRequestException('Refresh token is required');
    return this.authService.refresh(body.refreshToken, requestId);
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: CredentialsBody, @Headers('x-request-id') requestId?: string) {
    if (!body.identifier?.trim()) throw new BadRequestException('Identifier is required');
    return this.authService.forgotPassword(body.identifier, requestId);
  }

  @Post('reset-password')
  resetPassword(@Body() body: ResetBody, @Headers('x-request-id') requestId?: string) {
    if (!body.token || !body.newPassword) throw new BadRequestException('Token and new password are required');
    return this.authService.resetPassword(body.token, body.newPassword, requestId);
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@Req() request: AuthenticatedRequest) {
    return { success: true, data: request.user };
  }
}
