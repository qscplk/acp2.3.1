import { DialogService, DialogSize } from '@alauda/ui';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LogsComponent } from '@app/modules/pipeline/components/logs/logs.component';
import { map, publishReplay, refCount } from 'rxjs/operators';

@Component({
  templateUrl: 'dashboard.component.html',
  styleUrls: ['dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  project$ = this.route.paramMap.pipe(
    map(paramMap => paramMap.get('project')),
    publishReplay(1),
    refCount(),
  );

  constructor(private route: ActivatedRoute, private dialog: DialogService) {}

  onAction(action: { type: string; payload: any }) {
    if (action.type === 'pipeline/open-log') {
      this.dialog.open(LogsComponent, {
        size: DialogSize.Large,
        data: action.payload,
      });
    }
  }
}
