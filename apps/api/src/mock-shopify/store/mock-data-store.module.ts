import { Module } from '@nestjs/common';
import { MockDataStore } from './mock-data.store';

@Module({
  providers: [MockDataStore],
  exports: [MockDataStore],
})
export class MockDataStoreModule {}
