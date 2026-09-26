// src/zone/dto/create-zone.dto.ts
import {IsInt,IsNotEmpty,IsOptional,IsPositive,IsString,MaxLength,} from 'class-validator';

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre no puede estar vacío' })
  @MaxLength(120)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  // La relación llega como ID, no como objeto Zone
  @IsInt()
  @IsPositive()
  @IsOptional()
  parentZoneId?: number;
}