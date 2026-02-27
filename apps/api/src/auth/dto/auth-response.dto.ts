import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: '6b87db70-1d7b-4576-9348-b1f76059b1e0' })
  id!: string;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ example: 'user', enum: ['demo', 'user'] })
  role!: 'demo' | 'user';
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto })
  data!: AuthUserDto;
}

class LogoutDataDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

export class LogoutResponseDto {
  @ApiProperty({ type: LogoutDataDto })
  data!: LogoutDataDto;
}
