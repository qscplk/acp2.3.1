export interface ParallelEntity {
  id: string;
  name: string;
  nameEdited: boolean;
}

export interface StageEntity {
  id: string;
  name: string;
  parent: string;
  task: string;
  edited?: boolean;
}
