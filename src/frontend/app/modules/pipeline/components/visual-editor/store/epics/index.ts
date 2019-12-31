import { isDevMode } from '@angular/core';
import { combineEpics } from 'redux-observable-es6-compat';

import { loadOptionsEpic } from './load-options';
import { loggerEpic } from './logger';
import { tryChangeStageValuesEpic } from './try-change-stage-values';

export const rootEpic = isDevMode()
  ? combineEpics(loggerEpic, tryChangeStageValuesEpic, loadOptionsEpic)
  : combineEpics(tryChangeStageValuesEpic, loadOptionsEpic);
