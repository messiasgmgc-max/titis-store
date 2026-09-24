import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateConsultationDto {
  @ApiProperty({
    description: 'Tom de pele do cliente (clara, morena, parda, negra, neutra)',
    example: 'morena',
  })
  @IsString()
  @IsNotEmpty()
  skinTone: string;

  @ApiProperty({
    description: 'Tipo de ocasião ou evento (trabalho, casual, barzinho, jantar, festa, esporte)',
    example: 'jantar',
  })
  @IsString()
  @IsNotEmpty()
  occasion: string;

  @ApiProperty({
    description: 'Horário do evento (manha, tarde, noite)',
    example: 'noite',
  })
  @IsString()
  @IsNotEmpty()
  timeOfDay: string;

  @ApiProperty({
    description: 'Clima estimado (frio, ameno, quente)',
    example: 'ameno',
  })
  @IsString()
  @IsNotEmpty()
  climate: string;

  @ApiPropertyOptional({
    description: 'Estilo preferencial (classico, moderno, ousado, minimalista)',
    example: 'moderno',
  })
  @IsString()
  @IsOptional()
  preferredStyle?: string;
}
