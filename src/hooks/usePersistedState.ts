import { useCallback, useState } from "react";

/**
 * State backed by an external store. `read` runs once on first render;
 * every `set` persists synchronously so no effect is needed to sync back.
 */
export function usePersistedState<T>(
  read: () => T,
  write: (value: T) => void,
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(read);
  const set = useCallback(
    (next: T) => {
      setValue(next);
      write(next);
    },
    [write],
  );
  return [value, set];
}
