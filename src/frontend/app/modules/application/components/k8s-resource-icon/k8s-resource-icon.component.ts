import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
} from '@angular/core';

@Component({
  selector: 'alo-k8s-resource-icon',
  templateUrl: 'k8s-resource-icon.component.html',
  styleUrls: ['k8s-resource-icon.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class K8sResourceIconComponent implements OnChanges {
  @Input() resourceKind: string;
  constructor() {}

  ngOnChanges() {
    this.resourceKind = this.resourceKind.toLocaleLowerCase();
  }

  resoureKindMap(resourceKind: string) {
    switch (resourceKind) {
      case 'deployment':
        return 'D';
      case 'deployments':
        return 'D';
      case 'statefulset':
        return 'SS';
      case 'statefulsets':
        return 'SS';
      case 'daemonset':
        return 'DS';
      case 'daemonsets':
        return 'DS';
    }
  }
}
