export interface PaginatedListState<T> {
  pageIndex: number;
  pageSize: number;
  length: number;
  pages: {
    [index: number]: T[];
  };
}

export class PaginatedListAdapter<T> {
  getInitialState(): PaginatedListState<T>;
  getInitialState<S extends object>(additional: S): PaginatedListState<T> & S;
  getInitialState(additional: any = {}): any {
    return {
      pageIndex: 0,
      pageSize: 0,
      length: 0,
      pages: {},
      ...additional,
    };
  }

  clear(state: PaginatedListState<T>): PaginatedListState<T>;
  clear<S extends object>(
    state: PaginatedListState<T> & S,
  ): PaginatedListState<T> & S;
  clear(state: any): any {
    return {
      ...state,
      pageIndex: 0,
      pageSize: 0,
      length: 0,
      pages: {},
    };
  }

  patch(
    state: PaginatedListState<T>,
    changes: {
      pageIndex?: number;
      pageSize?: number;
      length?: number;
      list?: T[];
    },
  ): PaginatedListState<T>;
  patch<S extends object>(
    state: PaginatedListState<T> & S,
    changes: {
      pageIndex?: number;
      pageSize?: number;
      length?: number;
      list?: T[];
    },
  ): PaginatedListState<T> & S;
  patch(state: any, { list, ...rest }: any): any {
    if (list) {
      return {
        ...state,
        ...rest,
        pages: {
          ...state.pages,
          [rest.pageIndex || state.pageIndex]: list,
        },
      };
    }

    return {
      ...state,
      ...rest,
    };
  }
}

export function createPaginatedListAdapter<T>() {
  return new PaginatedListAdapter<T>();
}

function selectCurrentPage<T>(state: PaginatedListState<T>) {
  return state.pages[state.pageIndex];
}

function selectPageIndex<T>(state: PaginatedListState<T>) {
  return state.pageIndex;
}

function selectPageSize<T>(state: PaginatedListState<T>) {
  return state.pageSize;
}

function selectLength<T>(state: PaginatedListState<T>) {
  return state.length;
}

export const selectors = {
  selectCurrentPage,
  selectPageIndex,
  selectPageSize,
  selectLength,
};
