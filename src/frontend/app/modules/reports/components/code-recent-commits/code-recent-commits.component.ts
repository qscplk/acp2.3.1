import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CodeApiService, CodeRepository } from '@app/api';
import { getQuery, pageBy, sortBy } from '@app/utils/query-builder';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alo-code-recent-commits',
  templateUrl: 'code-recent-commits.component.html',
  styleUrls: [
    '../../../../shared/dashboard.scss',
    'code-recent-commits.component.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeRecentCommitsComponent {
  @Input()
  project: string;

  constructor(private codeApi: CodeApiService) {}

  fetchCodeRecentCommits = (project: string) =>
    this.codeApi
      .findCodeRepositories(
        project,
        getQuery(sortBy('latestCommitAt', true), pageBy(0, 4)),
      )
      .pipe(map(res => res.items));

  getIcon(item: CodeRepository) {
    return `icons/tool-chain/list/${item.type.toLowerCase()}.svg`;
  }
}
