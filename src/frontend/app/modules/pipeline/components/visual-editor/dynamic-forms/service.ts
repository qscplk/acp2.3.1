import { Injectable, Injector } from '@angular/core';

import { getControlConfigs } from './resolvers';

@Injectable()
export class DynamicFormBuilderService {
  constructor(private readonly injector: Injector) {}

  getCustomControlConfigs(project: string) {
    return getControlConfigs(this.injector, project);
  }
}
