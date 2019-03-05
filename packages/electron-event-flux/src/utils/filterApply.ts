/*
  Apply the origin state with updated filter and deleted filter
  
  origin states are link { a: 1, b: 2, c: { c1: 'he', c2: 'dd' }}
  updated filter is like this: { '*': false, '*@exclude': ['b'], b: 2 }
  deleted filter is like this: { a: true }

  ex: 
  1. filterApply(
    { a: 1, b: 2, c: { c1: 'he', c2: 'dd' } },
    { '*': false, '*@exclude': ['c'], c: { '*': true } },
    {}
  ) would return
    { c: { c1: 'he', c2: 'dd' } }

  2. filterApply(
    { a: 1, b: { m: 'd' } },
    { b: { *: true } },
    {}
  ) would return
    { b: { m: 'd' } }
*/

const isObject = require('lodash/isObject');

export default function filterApply(origin, updated, deleted) {
  let merged = {};
  if (updated['*']) {
    if (Array.isArray(origin)) {
      return origin;
    }
    let excludes = updated['*@exclude'];
    for(let key in origin) {
      if (!excludes || excludes.indexOf(key) === -1) {
        merged[key] = origin[key];
      }
    }
  }
  // if (isShallow(origin) || (isShallow(updated) && !isObject(deleted))) {
  //   return updated;
  // }

  if (isObject(updated)) {
    Object.keys(updated).forEach(key => {
      if (key === '*' || key === '*@exclude') return;
      if (origin[key] != null) {
        merged[key] = filterApply(origin[key], updated[key], deleted && deleted[key]);
      }
    });
  }
  if (isObject(deleted)) {
    Object.keys(deleted).forEach(key => {
      merged[key] = undefined;
    });
  }
  return merged;
};