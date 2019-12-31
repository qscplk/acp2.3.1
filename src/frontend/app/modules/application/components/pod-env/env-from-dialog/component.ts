import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import { Component, Inject, OnInit } from '@angular/core';
import { EnvFromSource } from '@app/api';

@Component({
  templateUrl: './template.html',
})
export class EnvFromDialogComponent implements OnInit {
  envFrom: EnvFromSource[] = [];
  cluster = '';
  namespace = '';

  constructor(
    @Inject(DIALOG_DATA)
    public data: {
      envFrom: EnvFromSource[];
      cluster: string;
      namespace: string;
    },
    private dialogRef: DialogRef,
  ) {}

  ngOnInit(): void {
    if (this.data) {
      const { envFrom, cluster, namespace } = this.data;
      this.envFrom = envFrom;
      this.cluster = cluster;
      this.namespace = namespace;
    }
  }

  onConfirm() {
    this.dialogRef.close(this.envFrom);
  }
}
