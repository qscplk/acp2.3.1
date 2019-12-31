export function swap<T>(
  source: Array<T>,
  currentIndex: number,
  destinationIndex: number,
): Array<T> {
  const target = [...source];
  target[currentIndex] = target.splice(
    destinationIndex,
    1,
    target[currentIndex],
  )[0];
  return target;
}
