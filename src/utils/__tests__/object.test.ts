import { compact, groupParamsByKey, objectHas, objectSet } from '../object';

describe('object utils', () => {
  let obj;

  beforeEach(() => {
    obj = {
      a: {
        b: {
          c: {
            d: 'd',
          },
          c1: 'c1',
        },
        b1: 'b1',
      },
      a1: 'a1',
    };
  });

  describe('objectHas function', () => {
    it('should check if the obj has path as string', () => {
      expect(objectHas(obj, 'a.b.c')).toBeTruthy();
      expect(objectHas(obj, 'a.b.c1')).toBeTruthy();
      expect(objectHas(obj, 'a.b.c.d')).toBeTruthy();
      expect(objectHas(obj, 'a.b.c1.d')).toBeFalsy();
    });

    it('should check if the obj has path as array', () => {
      expect(objectHas(obj, ['a', 'b', 'c'])).toBeTruthy();
      expect(objectHas(obj, ['a', 'b', 'c1'])).toBeTruthy();
      expect(objectHas(obj, ['a', 'b', 'c', 'd'])).toBeTruthy();
      expect(objectHas(obj, ['a', 'b', 'c1', 'd'])).toBeFalsy();
    });
  });

  describe('objectSet function', () => {
    it('should set value by path as string', () => {
      expect(objectHas(obj, 'a.b.c1.d')).toBeFalsy();
      objectSet(obj, 'a.b.c1', { d: 'd' });
      expect(objectHas(obj, 'a.b.c1.d')).toBeTruthy();
    });

    it('should set value by path as array', () => {
      expect(objectHas(obj, ['a', 'b', 'c1', 'd'])).toBeFalsy();
      objectSet(obj, ['a', 'b', 'c1'], { d: 'd' });
      expect(objectHas(obj, ['a', 'b', 'c1', 'd'])).toBeTruthy();
    });
  });

  describe('groupParamsByKey', () => {
    it('should group URLSearchParams by key', () => {
      const params = new URLSearchParams();
      params.append('a', 'b');
      params.append('a', 'd');
      params.append('c', 'e');

      expect(groupParamsByKey(params.entries())).toEqual({
        a: ['b', 'd'],
        c: 'e',
      });
    });
  });
});

describe('compact', () => {
  const obj = {
    foo: 'bar',
    bar: null,
    cool: undefined,
    test: '',
  };
  const obj2 = {
    foo: 'bar',
  };

  it('should strip away nullish values from the object', () => {
    expect(compact(obj)).toMatchObject(obj2);
  });

  it('should return the same object if there is nothing to compact', () => {
    expect(compact(obj2)).toMatchObject(obj2);
  });
});
