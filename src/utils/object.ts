export function objectHas(object: object, path: string | Array<string>): boolean {
  let _path = <Array<string>>path;

  if (typeof path === 'string') {
    _path = path.split('.');
  }

  return _path.every((key: string) => {
    if (typeof object != 'object' || object === null || !(key in object)) return false;
    object = object[key];
    return true;
  });
}

export function objectSet(object: object, path: string | Array<string>, value: any): void {
  let _path = <Array<string>>path;

  if (typeof path === 'string') {
    _path = path.split('.');
  }
  const limit = _path.length - 1;
  for (let i = 0; i < limit; ++i) {
    const key = _path[i];
    object = object[key] ?? (object[key] = {});
  }
  const key = _path[limit];
  object[key] = value;
}

export const isObjectEmpty = (obj: object): boolean =>
  !!obj && Object.keys(obj).length === 0 && obj.constructor === Object;

const emptyValues = new Set([undefined, 'undefined', null, 'null', NaN, 'NaN', '']);

/**
 * Filters out falsy / empty values from an object
 */
export const compact = (toCompact: object): object => {
  const removeEmpty = (obj: object) =>
    Object.fromEntries(
      Object.entries(obj)
        .filter(([, v]) => !emptyValues.has(v))
        .map(([k, v]) => [k, typeof v === 'object' && !Array.isArray(v) ? removeEmpty(v) : v]),
    );

  return removeEmpty(toCompact);
};

export const groupParamsByKey = (params: IterableIterator<[string, string]>) =>
  [...params].reduce((acc, tuple) => {
    // getting the key and value from each tuple
    const [key, val] = tuple;
    if (acc.hasOwnProperty(key)) {
      // if the current key is already an array, we'll add the value to it
      if (Array.isArray(acc[key])) {
        acc[key] = [...acc[key], val];
      } else {
        // if it's not an array, but contains a value, we'll convert it into an array
        // and add the current value to it
        acc[key] = [acc[key], val];
      }
    } else {
      // plain assignment if no special case is present
      acc[key] = val;
    }

    return acc;
  }, {});
