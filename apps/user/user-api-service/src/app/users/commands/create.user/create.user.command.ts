import { CreateUserDto } from "@dto";

export class CreateUserCommand {

  userDto: CreateUserDto

  constructor(
    userDto: CreateUserDto
  ) {
    this.userDto = userDto;
  }
}