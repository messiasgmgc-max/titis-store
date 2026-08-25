import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('Autenticação & Perfil VIP')
@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retorna o perfil autenticado do cliente VIP' })
  getProfile(@Req() req: any) {
    return {
      message: 'Autenticado com sucesso via Supabase JWT',
      user: req.user,
    };
  }
}
