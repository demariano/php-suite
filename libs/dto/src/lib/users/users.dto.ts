import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsObject, IsString } from 'class-validator';
import { UserRole } from './user.role.enum';
import { UserStatus } from './user.status.enum';
import { UserDataDto } from './users.data.dto';

export class UsersDto {


  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  userRole!: UserRole

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty()
  @IsString()
  lastName!: string;

  @ApiProperty()
  @IsObject()
  @ApiProperty({ type: () => UserDataDto })
  data!: UserDataDto;


  @ApiProperty({ enum: UserStatus })
  userStatus?: UserStatus;

  @ApiProperty({ required: false })
  @IsString()
  dateCreated?: string;



}