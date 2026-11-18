import { IsBoolean, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString({ message: 'Название должно быть строкой' })
  @Length(1, 120, { message: 'Название должно содержать от 1 до 120 символов' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Описание должно быть строкой' })
  @MaxLength(1000, { message: 'Описание не должно превышать 1000 символов' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'isCompleted должен быть boolean' })
  isCompleted?: boolean;
}
