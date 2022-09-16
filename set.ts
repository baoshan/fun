import type { $, Kind } from "./kind.ts";
import type { Predicate } from "./predicate.ts";
import type * as T from "./types.ts";

import { flow, pipe, todo } from "./fns.ts";
import { fromEquals } from "./setoid.ts";

export interface URI extends Kind {
  readonly type: ReadonlySet<this[0]>;
}

export function zero(): ReadonlySet<never> {
  return new Set();
}

export function empty<A = never>(): ReadonlySet<A> {
  return new Set();
}

export function set<A>(...as: [A, ...A[]]): ReadonlySet<A> {
  return new Set(as);
}

export function copy<A>(ta: ReadonlySet<A>): ReadonlySet<A> {
  return new Set(ta);
}

export const unsafeAdd = <A>(ta: ReadonlySet<A>) => (a: A): ReadonlySet<A> => {
  (ta as Set<A>).add(a);
  return ta;
};

export function some<A>(
  predicate: Predicate<A>,
): (ta: ReadonlySet<A>) => boolean {
  return (ta) => {
    for (const a of ta) {
      if (predicate(a)) {
        return true;
      }
    }
    return false;
  };
}

export function every<A>(
  predicate: Predicate<A>,
): (ta: ReadonlySet<A>) => boolean {
  return (ta) => {
    for (const a of ta) {
      if (!predicate(a)) {
        return false;
      }
    }
    return true;
  };
}

export function elem<A>(
  S: T.Setoid<A>,
): (a: A) => (ta: ReadonlySet<A>) => boolean {
  return (a) => some(S.equals(a));
}

export function elemOf<A>(
  S: T.Setoid<A>,
): (ta: ReadonlySet<A>) => (a: A) => boolean {
  return (ta) => (a) => elem(S)(a)(ta);
}

export function isSubset<A>(
  S: T.Setoid<A>,
): (tb: ReadonlySet<A>) => (ta: ReadonlySet<A>) => boolean {
  return flow(elemOf(S), every);
}

export function union<A>(
  S: T.Setoid<A>,
): (tb: ReadonlySet<A>) => (ta: ReadonlySet<A>) => ReadonlySet<A> {
  return (tb) => (ta) => {
    const out = copy(ta);
    const isIn = elemOf(S)(out);
    for (const b of tb) {
      if (!isIn(b)) {
        (out as Set<A>).add(b);
      }
    }
    return out;
  };
}

export function intersection<A>(
  S: T.Setoid<A>,
): (ta: ReadonlySet<A>) => (tb: ReadonlySet<A>) => ReadonlySet<A> {
  return (ta) => {
    const isIn = elemOf(S)(ta);
    return (tb) => {
      const out = new Set<A>();
      for (const b of tb) {
        if (isIn(b)) {
          out.add(b);
        }
      }
      return out;
    };
  };
}

export function compact<A>(
  S: T.Setoid<A>,
): (ta: ReadonlySet<A>) => ReadonlySet<A> {
  return (ta) => {
    const out = new Set<A>();
    const isIn = elemOf(S)(out);
    for (const a of ta) {
      if (!isIn(a)) {
        out.add(a);
      }
    }
    return out;
  };
}

export function join<A>(tta: ReadonlySet<ReadonlySet<A>>): ReadonlySet<A> {
  const out = new Set<A>();
  for (const ta of tta) {
    for (const a of ta) {
      out.add(a);
    }
  }
  return out;
}

export function map<A, I>(
  fai: (a: A) => I,
): (ta: ReadonlySet<A>) => ReadonlySet<I> {
  return (ta) => {
    const ti = new Set<I>();
    for (const a of ta) {
      ti.add(fai(a));
    }
    return ti;
  };
}

export function ap<A, I>(
  tfai: ReadonlySet<(a: A) => I>,
): (ta: ReadonlySet<A>) => ReadonlySet<I> {
  return (ta) => {
    const ti = new Set<I>();
    for (const fai of tfai) {
      for (const a of ta) {
        ti.add(fai(a));
      }
    }
    return ti;
  };
}

export function chain<A, I>(
  fati: (a: A) => ReadonlySet<I>,
): (ta: ReadonlySet<A>) => ReadonlySet<I> {
  return (ta) => {
    const ti = new Set<I>();
    for (const a of ta) {
      const _ti = fati(a);
      for (const i of _ti) {
        ti.add(i);
      }
    }
    return ti;
  };
}

export function filter<A>(
  predicate: Predicate<A>,
): (ta: ReadonlySet<A>) => ReadonlySet<A> {
  return (ta) => {
    const _ta = new Set<A>();
    for (const a of ta) {
      if (predicate(a)) {
        _ta.add(a);
      }
    }
    return _ta;
  };
}

export function reduce<A, O>(
  foao: (o: O, a: A) => O,
  o: O,
): (ta: ReadonlySet<A>) => O {
  return (ta) => {
    let out = o;
    for (const a of ta) {
      out = foao(out, a);
    }
    return out;
  };
}

// TODO: Flatten this out a bit.
export function traverse<V extends Kind>(
  A: T.Applicative<V>,
) {
  return <A, I, J, K, L>(
    favi: (a: A) => $<V, [I, J, K, L]>,
  ): (ta: ReadonlySet<A>) => $<V, [ReadonlySet<I>, J, K, L]> =>
    reduce(
      (fis, a) =>
        pipe(
          favi(a),
          A.ap(pipe(
            fis,
            A.map((is: ReadonlySet<I>) => (i: I) => {
              const _is = is as unknown as Set<I>;
              _is.add(i);
              return _is;
            }),
          )),
        ),
      A.of(empty()),
    );
}

export function getShow<A>(S: T.Show<A>): T.Show<ReadonlySet<A>> {
  return ({
    show: (s) => `Set([${Array.from(s.values()).map(S.show).join(", ")}])`,
  });
}

export function getSetoid<A>(S: T.Setoid<A>): T.Setoid<ReadonlySet<A>> {
  const subset = isSubset(S);
  return fromEquals((x) => (y) => subset(x)(y) && subset(y)(x));
}

export function getUnionMonoid<A>(S: T.Setoid<A>): T.Monoid<ReadonlySet<A>> {
  return ({ concat: union(S), empty });
}

export const Functor: T.Functor<URI> = { map };

export const Apply: T.Apply<URI> = { ap, map };

export const Filterable: T.Filterable<URI> = { filter };

export const Foldable: T.Foldable<URI> = { reduce };

export const Traversable: T.Traversable<URI> = { map, reduce, traverse };
