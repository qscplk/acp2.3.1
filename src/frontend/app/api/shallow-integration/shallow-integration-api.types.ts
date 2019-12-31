import { ResourceService } from '@app/api/api.types';

export interface ShallowService extends ResourceService {
  type: string;
  shallow: boolean;
}
