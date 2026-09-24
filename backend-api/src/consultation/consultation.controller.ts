import { Controller, Post, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConsultationService } from './consultation.service';
import { GenerateConsultationDto } from './dto/consultation.dto';

@ApiTags('Consultoria de Imagem')
@Controller('consultation')
export class ConsultationController {
  constructor(private readonly consultationService: ConsultationService) {}

  @Post('recommend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Gera recomendações de looks e análise cromática personalizada' })
  @ApiResponse({ status: 200, description: 'Recomendações geradas com sucesso' })
  generateConsultation(@Body() dto: GenerateConsultationDto) {
    return this.consultationService.generateConsultation(dto);
  }

  @Get('skin-tones')
  @ApiOperation({ summary: 'Retorna os perfis cromáticos e orientações de tons de pele' })
  getSkinTones() {
    return [
      { id: 'clara', name: 'Clara', description: 'Pele clara com tons frios ou neutros', idealColors: ['Azul Marinho', 'Cinza Grafite', 'Vinho Burgandi'] },
      { id: 'morena', name: 'Morena Dourada', description: 'Pele morena com tons quentes', idealColors: ['Terracota', 'Beige Champagne', 'Verde Oliva'] },
      { id: 'parda', name: 'Parda', description: 'Pele parda com tons médios e profundos', idealColors: ['Preto Obsidian', 'Branco Névoa', 'Caramelo'] },
      { id: 'negra', name: 'Negra Profunda', description: 'Pele negra com alta luminosidade e riqueza', idealColors: ['Branco Marfim', 'Bordô Imperial', 'Azul Real'] },
    ];
  }
}
