import { TaskEntity } from '../models/form';

export const SET_TASKS = <const>'set tasks';

export function setTasks(tasks: TaskEntity[]) {
  return <const>{
    type: SET_TASKS,
    tasks,
  };
}

export type TaskActions = ReturnType<typeof setTasks>;
