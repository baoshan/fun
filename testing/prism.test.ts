import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as P from "../prism.ts";
import * as I from "../iso.ts";
import * as L from "../lens.ts";
import * as OP from "../optional.ts";
import * as O from "../option.ts";
import * as E from "../either.ts";
import { pipe } from "../fn.ts";

type T1 = { one: number };

type T2 = { one: number; two: number; three: number };

function positiveGuard(n: number): n is number {
  return n > 0;
}

Deno.test("Prism make", () => {
  const { getOption, reverseGet } = P.prism(
    (n: number) => n === 0 ? O.none : O.some(n),
    (n: number) => n,
  );
  assertEquals(getOption(0), O.none);
  assertEquals(getOption(1), O.some(1));
  assertEquals(reverseGet(0), 0);
});

Deno.test("Prism fromPredicate", () => {
  const { getOption, reverseGet } = P.fromPredicate(positiveGuard);
  assertEquals(getOption(0), O.none);
  assertEquals(getOption(1), O.some(1));
  assertEquals(reverseGet(0), 0);
});

Deno.test("Prism asOptional", () => {
  const { getOption, set } = P.asOptional(
    P.fromPredicate(positiveGuard),
  );
  assertEquals(getOption(0), O.none);
  assertEquals(getOption(1), O.some(1));
  assertEquals(set(0)(0), 0);
  assertEquals(set(0)(1), 0);
});

Deno.test("Prism asTraversal", () => {
  const { traverse } = P.asTraversal(P.id<number>());
  const t1 = traverse(O.MonadOption);
  const t2 = t1((n: number) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(0), O.none);
  assertEquals(t2(1), O.some(1));
});

Deno.test("Prism fromNullable", () => {
  const prism = P.prism(
    (n: number) => n === 0 ? O.some(undefined) : O.some(n),
    (n: number | undefined) => n === undefined ? 0 : n,
  );
  const { getOption, reverseGet } = P.fromNullable(prism);
  assertEquals(getOption(0), O.none);
  assertEquals(getOption(1), O.some(1));
  assertEquals(reverseGet(0), 0);
  assertEquals(reverseGet(1), 1);
});

Deno.test("Prism id", () => {
  const { getOption, reverseGet } = P.id<number>();
  assertEquals(getOption(0), O.some(0));
  assertEquals(reverseGet(0), 0);
});

Deno.test("Prism compose", () => {
  const prism = P.prism(
    (n: number) => O.some(n.toString()),
    (s) => parseFloat(s),
  );
  const { getOption, reverseGet } = pipe(P.id<number>(), P.compose(prism));
  assertEquals(getOption(0), O.some("0"));
  assertEquals(reverseGet("0"), 0);
});

Deno.test("Prism composeIso", () => {
  const iso = I.iso((n: number) => n + 1, (n: number) => n - 1);
  const { getOption, reverseGet } = P.composeIso(P.id<number>(), iso);
  assertEquals(getOption(0), O.some(1));
  assertEquals(reverseGet(0), -1);
});

Deno.test("Prism composeLens", () => {
  const lens = L.lens(
    (n: number) => n.toString(),
    (s: string) => (_: number) => parseFloat(s),
  );
  const { getOption, set } = P.composeLens(P.id<number>(), lens);
  assertEquals(getOption(0), O.some("0"));
  assertEquals(set("0")(0), 0);
  assertEquals(set("0")(1), 0);

  const p2 = P.fromPredicate(positiveGuard);
  const p3 = P.composeLens(p2, L.id());
  assertEquals(p3.set(0)(0), 0);
  assertEquals(p3.set(0)(1), 0);
  assertEquals(p3.set(1)(0), 0);
  assertEquals(p3.set(1)(1), 1);
});

Deno.test("Prism composeOptional", () => {
  const { getOption, set } = P.composeOptional(
    P.id<number>(),
    P.asOptional(P.fromPredicate(positiveGuard)),
  );
  assertEquals(getOption(0), O.none);
  assertEquals(getOption(1), O.some(1));
  assertEquals(set(0)(0), 0);
  assertEquals(set(0)(1), 0);

  const p2 = P.fromPredicate(positiveGuard);
  const p3 = P.composeOptional(p2, OP.id());
  assertEquals(p3.set(0)(0), 0);
  assertEquals(p3.set(0)(1), 0);
  assertEquals(p3.set(1)(0), 0);
  assertEquals(p3.set(1)(1), 1);
});

Deno.test("Prism composeTraversal", () => {
  const { traverse } = P.composeTraversal(
    P.id<number>(),
    P.asTraversal(P.fromPredicate(positiveGuard)),
  );
  const t1 = traverse(O.MonadOption);
  const t2 = t1((n) => n === 0 ? O.none : O.some(n));
  assertEquals(t2(0), O.some(0));
  assertEquals(t2(1), O.some(1));
});

Deno.test("Prism filter", () => {
  const { getOption, reverseGet } = pipe(
    P.id<number>(),
    P.filter(positiveGuard),
  );
  assertEquals(getOption(0), O.none);
  assertEquals(getOption(1), O.some(1));
  assertEquals(reverseGet(0), 0);
});

Deno.test("Prism traverse", () => {
  const { traverse } = pipe(
    P.id<E.Either<number, number>>(),
    P.traverse(E.TraversableEither),
  );
  const t1 = traverse(O.MonadOption);
  const t2 = t1((n) => n > 0 ? O.some(n) : O.none);
  assertEquals(t2(E.left(0)), O.some(E.left(0)));
  assertEquals(t2(E.right(0)), O.none);
  assertEquals(t2(E.right(1)), O.some(E.right(1)));
});

Deno.test("Prism modify", () => {
  const modify = pipe(P.id<number>(), P.modify((n) => n + 1));
  assertEquals(modify(0), 1);
});

Deno.test("Prism getSet", () => {
  const set = P.getSet(P.id<number>());
  assertEquals(set(0)(0), 0);
  assertEquals(set(0)(1), 0);
});

Deno.test("Prism prop", () => {
  const { getOption, set } = pipe(P.id<T1>(), P.prop("one"));
  assertEquals(getOption({ one: 1 }), O.some(1));
  assertEquals(set(0)({ one: 0 }), { one: 0 });
  assertEquals(set(0)({ one: 1 }), { one: 0 });
});

Deno.test("Prism props", () => {
  const { getOption, set } = pipe(P.id<T2>(), P.props("one", "two"));
  const t2: T2 = { one: 1, two: 2, three: 3 };
  assertEquals(getOption(t2), O.some({ one: 1, two: 2 }));
  assertEquals(set({ one: 1, two: 2 })(t2), t2);
  assertEquals(set({ one: 2, two: 1 })(t2), { one: 2, two: 1, three: 3 });
});

Deno.test("Prism index", () => {
  const { getOption, set } = pipe(P.id<ReadonlyArray<number>>(), P.index(1));
  assertEquals(getOption([]), O.none);
  assertEquals(getOption([1, 2]), O.some(2));
  assertEquals(set(3)([]), []);
  assertEquals(set(3)([1]), [1]);
  assertEquals(set(3)([1, 2]), [1, 3]);
});

Deno.test("Prism key", () => {
  const { getOption, set } = pipe(
    P.id<Readonly<Record<string, number>>>(),
    P.key("one"),
  );
  assertEquals(getOption({}), O.none);
  assertEquals(getOption({ one: 1 }), O.some(1));
  assertEquals(set(3)({}), {});
  assertEquals(set(3)({ one: 1 }), { one: 3 });
});

Deno.test("Prism atKey", () => {
  const { getOption, set } = pipe(
    P.id<Readonly<Record<string, number>>>(),
    P.atKey("one"),
  );
  assertEquals(getOption({}), O.some(O.none));
  assertEquals(getOption({ one: 1 }), O.some(O.some(1)));
  assertEquals(set(O.none)({}), {});
  assertEquals(set(O.none)({ one: 1 }), {});
  assertEquals(set(O.some(1))({ one: 1 }), { one: 1 });
  assertEquals(set(O.some(2))({ one: 1 }), { one: 2 });
});

Deno.test("Prism some", () => {
  const { getOption, reverseGet } = P.some<number>();
  assertEquals(getOption(O.none), O.none);
  assertEquals(getOption(O.some(1)), O.some(1));
  assertEquals(reverseGet(1), O.some(1));
});

Deno.test("Prism right", () => {
  const { getOption, reverseGet } = P.right<number, number>();
  assertEquals(getOption(E.left(1)), O.none);
  assertEquals(getOption(E.right(1)), O.some(1));
  assertEquals(reverseGet(1), E.right(1));
});

Deno.test("Prism left", () => {
  const { getOption, reverseGet } = P.left<number, number>();
  assertEquals(getOption(E.left(1)), O.some(1));
  assertEquals(getOption(E.right(1)), O.none);
  assertEquals(reverseGet(1), E.left(1));
});
