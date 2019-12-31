export type Reducer<T, TAction> = (state: T, action: TAction) => T;

export type ReducerMap<T, TAction> = { [p in keyof T]: Reducer<T[p], TAction> };

/**
 * @deprecated
 * 此方法最初目的，是希望组合针对同一collection的多次reduce迭代，可以分离多个分
 * 支，避免无关问题干扰，例如：
 * ```
 * const reducer = combineReducers({
 *   names: (accum, item) => [...accum, item.name],
 *   count: (accum, item) => accum + item.quantity,
 * })
 *
 * const { names, count } = R.reduce(reducer, { names: [], count: 0 }), items);
 * ```
 *
 * 针对此方法的原生场景，在redux中的使用，因为init action的存在，各个子reducer
 * 的默认值逻辑是比较自然的，但在一般场景下，需要补充相应的逻辑，比如提供默认值，或
 * 着在子reducer函数中自行处理，都增加了额外的问题，而且可组合的函数必须按照
 * reducer函数形式编写，不够灵活，建议类似场景，可考虑自行处理同时迭代问题。比如：
 *
 * ```
 * const reducer = function(accum, item){
 *   const names = accum && accum.names || [];
 *   count count = accum && accum.count || 0;
 *
 *   return {
 *     names: [...names, item.name],
 *     count: count + item.quality,
 *   }
 * }
 * ```
 */
export function combineReducers<T, TAction>(
  reducers: ReducerMap<T, TAction>,
): Reducer<T, TAction> {
  return (orignalState: T, action: TAction) => {
    const keys = <(keyof T)[]>Object.keys(reducers);

    return keys.reduce((accum, key) => {
      const prevState = accum && accum[key];
      const nextState = reducers[key](prevState, action);

      if (prevState === nextState) {
        return accum;
      }

      return {
        ...accum,
        [key]: nextState,
      };
    }, orignalState);
  };
}
