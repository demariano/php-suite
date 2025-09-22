import { ResponseDto, UsersDto } from '@dto';
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserDatabaseServiceAbstract } from '@user-database-service';
import { GetEmailByApiKeyQuery } from './get.email.by.api.key.query';

@QueryHandler(GetEmailByApiKeyQuery)
export class GetEmailByApiKeyHandler implements IQueryHandler<GetEmailByApiKeyQuery> {

  private readonly logger = new Logger(GetEmailByApiKeyHandler.name);

  constructor(
    @Inject('UserDatabaseService')
    private readonly userDatabaseService: UserDatabaseServiceAbstract,
  ) {

  }

  async execute(query: GetEmailByApiKeyQuery): Promise<ResponseDto<UsersDto>> {


    this.logger.log(`Executing GetEmailByApiKeyHandler with email: ${query.email}`);

    try {
      const userRecord = await this.userDatabaseService.findUserRecordByEmail(query.email);
      const dto: UsersDto = await this.userDatabaseService.convertToDto(userRecord);
      return new ResponseDto<UsersDto>(dto, 200);
    } catch (error) {
      this.logger.error(`Error fetching user by email: ${error.message}`);
      throw new Error(`Failed to fetch user record for email: ${query.email}`);
    }

  }
}