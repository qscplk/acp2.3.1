import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RegistryApiService } from '@app/api/registry/registry-api.service';
import { ImageRepository } from '@app/api/registry/registry-api.types';
import {
  getImagePathPrefix,
  getImagePathSuffix,
} from '@app/modules/registry/utils';
import { getQuery, pageBy, sortBy } from '@app/utils/query-builder';
import { head } from 'lodash-es';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alo-registry-recent-pushs',
  templateUrl: 'registry-recent-pushs.component.html',
  styleUrls: [
    '../../../../shared/dashboard.scss',
    'registry-recent-pushs.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistryRecentPushsComponent {
  @Input()
  project: string;

  getImagePathPrefix = getImagePathPrefix;
  getImagePathSuffix = getImagePathSuffix;

  constructor(private readonly codeApi: RegistryApiService) {}

  fetchRegistryRecentPushs = (project: string) =>
    this.codeApi
      .findRepositoriesByProject(
        project,
        getQuery(sortBy('latestCommitAt', true), pageBy(0, 4)),
      )
      .pipe(map(res => res.items));

  getLatestTag(item: ImageRepository) {
    return head(item.tags) || { name: '' }; // TODO: latestTag
  }

  getLatestTagPath(item: ImageRepository) {
    return `${item.endpoint}/${item.image}:${this.getLatestTag(item).name}`;
  }
}
