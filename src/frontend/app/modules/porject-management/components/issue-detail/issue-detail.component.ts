import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IssueItem } from '@app/api/project-management/project-management.types';
import { dropDuplicateUrlSlash } from '@app/utils/url-utils';

@Component({
  selector: 'alo-project-management-issue-detail',
  templateUrl: './issue-detail.component.html',
  styleUrls: ['./issue-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueDetailComponent {
  @Input()
  issueDetail: IssueItem;
  @Input()
  accessUrl: string;

  dropDuplicateUrlSlash = dropDuplicateUrlSlash;
}
