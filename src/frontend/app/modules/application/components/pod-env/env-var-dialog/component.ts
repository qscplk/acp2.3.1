import { DIALOG_DATA, DialogRef } from '@alauda/ui';
import { Component, Inject, OnInit } from '@angular/core';
import { EnvVar } from '@app/api';

@Component({
  templateUrl: './template.html',
})
export class EnvDialogComponent implements OnInit {
  env: EnvVar[] = [];
  cluster = '';
  namespace = '';

  constructor(
    @Inject(DIALOG_DATA)
    public data: { env: EnvVar[]; cluster: string; namespace: string },
    private dialogRef: DialogRef,
  ) {}

  ngOnInit(): void {
    if (this.data) {
      const { env, namespace, cluster } = this.data;
      this.env = env;
      this.cluster = cluster;
      this.namespace = namespace;
    }
  }

  onConfirm() {
    this.dialogRef.close(this.env);
  }
}
