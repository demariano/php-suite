import { UsersDto } from "@dto";

export class UpdateUserCommand {

  userDto: UsersDto
  userId: string

  constructor(
    userId: string,
    userDto: UsersDto
  ) {
    this.userDto = userDto;
    this.userId = userId;
  }
}