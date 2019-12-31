import { TimeService } from '@alauda/common-snippet';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnInit,
} from '@angular/core';
import {
  ContainerLogApiService,
  ContainerLogParams,
  LOG_NEWEST_PARAMS,
  LOG_OLDEST_PARAMS,
  LOG_PER_VIEW,
  LogSelection,
  AppK8sResource,
  Application,
  ApplicationLogParams,
  Container,
  K8sResourceKind,
  K8sResourceMap,
  ResourceLogParams,
} from '@app/api';

import { saveAs } from 'file-saver';
import { get, head } from 'lodash-es';
import { map } from 'rxjs/operators';

@Component({
  selector: 'alo-application-log',
  templateUrl: 'application-log.component.html',
  styleUrls: ['application-log.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationLogComponent implements OnInit {
  @Input()
  appLogParams: ApplicationLogParams = null;

  @Input()
  resourceLogParams: ResourceLogParams = null;

  app: Application;
  resourceNames: Array<{
    kind: string;
    name: string;
    value: string;
  }> = [];

  selectedResourceName: string;
  pods: Array<{ name: string; status: string }> = [];
  selectedPod: string;
  containers: Container[] = [];
  selectedContainer: string;
  kindList: string[];

  params: ContainerLogParams;

  pullEnabled = true;

  constructor(
    private readonly containerLogApi: ContainerLogApiService,
    private readonly cdr: ChangeDetectorRef,
    private readonly time: TimeService,
  ) {}

  ngOnInit() {
    this.kindList = K8sResourceMap;
    if (this.appLogParams) {
      this.app = this.appLogParams.application;
      this.handleLogParams(this.appLogParams);
    }
    if (this.resourceLogParams) {
      this.params = {
        namespace: this.resourceLogParams.namespace,
        cluster: this.resourceLogParams.cluster,
        container: this.resourceLogParams.containers[0].name,
        pod: this.resourceLogParams.pods[0].name,
        ...LOG_NEWEST_PARAMS,
      };
      this.containers = this.resourceLogParams.containers;
      if (this.resourceLogParams.selectedContainerName) {
        this.selectedContainer = this.resourceLogParams.selectedContainerName;
      } else {
        this.selectedContainer = this.resourceLogParams.containers[0].name;
      }
      this.pods = this.resourceLogParams.pods;
      this.selectedPod = this.resourceLogParams.pods[0].name;
    }
    this.cdr.markForCheck();
  }

  handleLogParams(logParams: ApplicationLogParams) {
    K8sResourceMap.forEach((kind: K8sResourceKind) => {
      if (this.app[kind] && this.app[kind].length !== 0) {
        this.app[kind].forEach((resource: AppK8sResource) => {
          this.resourceNames.push({
            name: resource.name,
            kind: kind,
            value: `${kind}:${resource.name}`,
          });
        });
      }
    });
    this.params = {
      cluster: this.appLogParams.cluster,
      namespace: this.app.namespace,
      container: '',
      pod: '',
      ...LOG_NEWEST_PARAMS,
    };
    if (logParams.resourceName) {
      this.selectedResourceNameChange(
        `${logParams.kind.toLocaleLowerCase()}s:${logParams.resourceName}`,
        logParams.containerName,
      );
    } else {
      this.selectedResourceNameChange(head(this.resourceNames).value);
    }
  }

  fetchLog = (params: ContainerLogParams) =>
    this.containerLogApi.get(params).pipe(
      map(result => {
        if (!result) {
          return null;
        }

        return {
          selection: result.selection,
          logs: result.logs.map(log => log.content).join('\n'),
          range:
            !result.info.fromDate ||
            !result.info.toDate ||
            result.info.fromDate === '0' ||
            result.info.toDate === '0'
              ? ''
              : `${this.time.format(result.info.fromDate)} ~ ${this.time.format(
                  result.info.toDate,
                )}`,
        };
      }),
    );

  download() {
    const { namespace, pod, container, cluster } = this.params;
    this.containerLogApi
      .getFile({ namespace, pod, container, cluster })
      .subscribe(result => {
        saveAs(result, `logs-from-${namespace}-${container}-${pod}.txt`);
      });
  }

  selectedResourceNameChange(name: string, container = '') {
    this.selectedResourceName = name;
    let kind: K8sResourceKind;
    K8sResourceMap.forEach((appKind: K8sResourceKind) => {
      if (
        appKind === this.selectedResourceName.split(':')[0].toLocaleLowerCase()
      ) {
        kind = appKind;
      }
    });
    const resourceName = this.selectedResourceName.split(':')[1];
    this.app[kind].forEach((resource: AppK8sResource) => {
      if (resource.name === resourceName) {
        this.pods = resource.podInfo.pods;
        this.containers = resource.containers;
      }
    });
    this.selectedPod = this.pods && get(this.pods, '[0].name');
    if (container) {
      this.selectedContainer = container;
    } else {
      this.selectedContainer =
        this.containers && get(this.containers, '[0].name');
    }
    this.params = {
      ...this.params,
      pod: this.selectedPod,
      container: this.selectedContainer,
    };
  }

  selectedPodChange(pod: string) {
    this.params = {
      ...this.params,
      pod,
    };
  }

  selectedContainerChange(container: string) {
    this.params = {
      ...this.params,
      container,
    };
  }

  updatePage(
    page: 'oldest' | 'older' | 'newest' | 'newer',
    prevSelection: LogSelection,
  ) {
    if (this.pullEnabled) {
      return;
    }

    const { namespace, pod, container, cluster } = this.params;
    switch (page) {
      case 'oldest':
        this.params = {
          cluster,
          namespace,
          pod,
          container,
          ...LOG_OLDEST_PARAMS,
        };
        break;
      case 'newest':
        this.params = {
          cluster,
          namespace,
          pod,
          container,
          ...LOG_NEWEST_PARAMS,
        };
        break;
      case 'newer':
        this.params = {
          cluster,
          namespace,
          pod,
          container,
          logFilePosition: prevSelection.logFilePosition,
          referenceTimestamp: prevSelection.referencePoint.timestamp,
          referenceLineNum: prevSelection.referencePoint.lineNum,
          offsetFrom: prevSelection.offsetTo,
          offsetTo: prevSelection.offsetTo + LOG_PER_VIEW,
        };
        break;
      case 'older':
        this.params = {
          cluster,
          namespace,
          pod,
          container,
          logFilePosition: prevSelection.logFilePosition,
          referenceTimestamp: prevSelection.referencePoint.timestamp,
          referenceLineNum: prevSelection.referencePoint.lineNum,
          offsetFrom: prevSelection.offsetFrom - LOG_PER_VIEW,
          offsetTo: prevSelection.offsetFrom,
        };
        break;
    }
  }

  onPullEnabledChange(enabled: boolean) {
    this.pullEnabled = enabled;
    this.params = {
      cluster: this.params.cluster,
      namespace: this.params.namespace,
      pod: this.params.pod,
      container: this.params.container,
      ...LOG_NEWEST_PARAMS,
    };
  }
}
