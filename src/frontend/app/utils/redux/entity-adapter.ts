import { omit, omitBy } from 'lodash-es';

export interface EntityState<T> {
  ids: string[];
  entities: Dictionary<T>;
}

export interface EntityAdapter<T> {
  reset(items: T[]): EntityState<T>;
  insertAfter(state: EntityState<T>, after: string, item: T): EntityState<T>;
  remove(state: EntityState<T>, id: string): EntityState<T>;
  removeBy(
    state: EntityState<T>,
    condition: (item: T) => boolean,
  ): EntityState<T>;
  append(state: EntityState<T>, item: T): EntityState<T>;
  appendMany(state: EntityState<T>, items: T[]): EntityState<T>;
  update(state: EntityState<T>, id: string, item: Partial<T>): EntityState<T>;
  replace(state: EntityState<T>, item: T): EntityState<T>;
  replaceMany(state: EntityState<T>, items: T[]): EntityState<T>;
  get(state: EntityState<T>, id: string): T;
}

export function createEntityAdapter<T>(
  selectId: (item: T) => string,
): EntityAdapter<T> {
  const reset = (items: T[]) => {
    const ids = items.map(selectId);
    const entities = items.reduce(
      (accum, item) => ({
        ...accum,
        [selectId(item)]: item,
      }),
      {},
    );

    return {
      ids,
      entities,
    };
  };

  const insertAfter = (state: EntityState<T>, after: string, item: T) => {
    const ids = [...state.ids];
    ids.splice(ids.indexOf(after) + 1, 0, selectId(item));

    return {
      ids,
      entities: {
        ...state.entities,
        [selectId(item)]: item,
      },
    };
  };

  const append = (state: EntityState<T>, item: T) => {
    const ids = [...state.ids, selectId(item)];

    return {
      ids,
      entities: {
        ...state.entities,
        [selectId(item)]: item,
      },
    };
  };

  const remove = (state: EntityState<T>, id: string) => {
    return {
      ids: state.ids.filter(item => item !== id),
      entities: omit(state.entities, id),
    };
  };

  const removeBy = (state: EntityState<T>, condition: (item: T) => boolean) => {
    const entities = omitBy(state.entities, condition);

    return {
      ids: Object.keys(entities),
      entities,
    };
  };

  const update = (state: EntityState<T>, id: string, item: Partial<T>) => {
    return {
      ...state,
      entities: {
        ...state.entities,
        [id]: { ...state.entities[id], ...item, id },
      },
    };
  };

  const replace = (state: EntityState<T>, item: T) => {
    return {
      ...state,
      entities: {
        ...state.entities,
        [selectId(item)]: item,
      },
    };
  };

  const appendMany = (state: EntityState<T>, items: T[]) => {
    const ids = [...state.ids, ...items.map(selectId)];

    return {
      ids,
      entities: items.reduce(
        (accum, item) => ({
          ...accum,
          [selectId(item)]: item,
        }),
        state.entities,
      ),
    };
  };

  const replaceMany = (state: EntityState<T>, items: T[]) => {
    return {
      ...state,
      entities: items.reduce(
        (accum, item) => ({
          ...accum,
          [selectId(item)]: item,
        }),
        state.entities,
      ),
    };
  };

  const get = (state: EntityState<T>, id: string) => {
    return state.entities[id] || null;
  };

  return {
    reset,
    insertAfter,
    remove,
    removeBy,
    append,
    appendMany,
    update,
    replace,
    replaceMany,
    get,
  };
}

export const createEntitySelector = <T>(id: string) => (
  state: EntityState<T>,
) => state.entities[id];
