export interface Project {
  name: string;
  displayName: string;
  description: string;
  projectManagers?: string[];
  creationTimestamp?: string;
  serviceMesh?: string;
  clusters: { name: string }[];
  __orignal?: ProjectData;
}

export interface ProjectMetaData {
  name: string;
  annotations: {
    [name: string]: string;
  };
  creationTimestamp?: string;
  resourceVersion?: string;
  selfLink?: string;
  uid?: string;
}

export interface ProjectData {
  apiVersion?: string;
  kind?: string;
  metadata?: ProjectMetaData;
  spec?: {
    namespaces: [
      {
        name: string;
        type: string;
      }
    ];
    clusters: { name: string }[];
  };
  status?: {
    namespaces: Array<{
      name: string;
      status: string;
    }>;
  };
}

export interface ProjectResponse extends ProjectData {
  typeMeta: {
    kind: 'Project';
    groupVersion?: string;
  };
  objectMeta?: ProjectMetaData;
  data?: ProjectData;
  project_managers?: string[];
}

export interface ProjectsResponse {
  listMeta: {
    totalItems: number;
  };
  errors: any[];
  items: ProjectResponse[];
}
