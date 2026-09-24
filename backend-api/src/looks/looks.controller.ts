import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LooksService } from './looks.service';

@ApiTags('Catálogo de Looks')
@Controller('looks')
export class LooksController {
  constructor(private readonly looksService: LooksService) {}

  @Get('featured')
  @ApiOperation({ summary: 'Retorna o catálogo de looks em destaque do Titi\'s' })
  getFeatured() {
    return this.looksService.getFeaturedLooks();
  }
}
