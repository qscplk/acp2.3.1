import { CodeEditorActionsConfig } from '@alauda/code-editor';

export const createActions: CodeEditorActionsConfig = {
  diffMode: false,
  recover: false,
  copy: true,
  find: true,
};

export const viewActions: CodeEditorActionsConfig = {
  diffMode: false,
  clear: false,
  recover: false,
  copy: true,
  find: true,
};

export const updateActions: CodeEditorActionsConfig = {
  diffMode: true,
  clear: true,
  recover: true,
  copy: true,
  find: true,
};
