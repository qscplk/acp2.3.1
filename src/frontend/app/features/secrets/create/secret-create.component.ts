import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EditorStatus, MODULE_ENV, ModuleEnv } from '@app/modules/secret';

@Component({
  templateUrl: 'secret-create.component.html',
  styleUrls: ['secret-create.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecretCreateComponent {
  get project() {
    if (this.env === 'admin') {
      return null;
    }

    return this.route.snapshot.parent.parent.paramMap.get('project');
  }

  status: EditorStatus = 'normal';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(MODULE_ENV) public env: ModuleEnv,
  ) {}

  redirect({ namespace, name }: { namespace: string; name: string }) {
    this.router.navigate(
      this.env === 'admin' ? ['../', namespace, name] : ['../', name],
      {
        relativeTo: this.route,
      },
    );
  }

  onStatusChange(status: EditorStatus) {
    this.status = status;
  }
}
