import { InjectionToken } from '@angular/core';

export type ModuleEnv = 'admin' | 'workspace';

export const MODULE_ENV = new InjectionToken<ModuleEnv>('module.env');

export const FOR_WORKSPACE = 'workspace';
export const FOR_ADMIN = 'admin';
