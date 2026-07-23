import { Controller, Post, Body, Get, Patch, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login as a learner user' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Login as admin — only users with role=Admin are allowed' })
  adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.adminLogin(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile including entry test status and character' })
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('character')
  @ApiOperation({ summary: 'Update the logged-in user\'s selected character' })
  updateCharacter(
    @Request() req,
    @Body() body: { character: string },
  ) {
    return this.authService.updateCharacter(req.user.id, body.character);
  }
}