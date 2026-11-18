import { IsEmail, IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Некорректный email' })
  @MaxLength(254, { message: 'Email слишком длинный' })
  email: string;

  @IsString({ message: 'Имя должно быть строкой' })
  @Length(2, 50, { message: 'Имя должно содержать от 2 до 50 символов' })
  name: string;

  @IsString({ message: 'Пароль должен быть строкой' })
  @MinLength(8, { message: 'Пароль должен содержать минимум 8 символов' })
  @MaxLength(72, {
    message: 'Пароль не должен превышать 72 символа (ограничение bcrypt)',
  })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: 'Пароль должен содержать хотя бы одну букву и одну цифру',
  })
  password: string;
}
