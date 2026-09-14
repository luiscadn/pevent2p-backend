import { Module } from '@nestjs/common';
import { DirectoryService } from './directory/directory.service';
import { DirectoryController } from './directory/directory.controller';

@Module({
  providers: [DirectoryService],
  controllers: [DirectoryController]
})
export class DirectoryModule {}
