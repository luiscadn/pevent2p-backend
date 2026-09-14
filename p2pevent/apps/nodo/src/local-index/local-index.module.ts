import { Module } from '@nestjs/common';
import { LocalIndexService } from './local-index.service';

@Module({
  providers: [LocalIndexService]
})
export class LocalIndexModule {}
