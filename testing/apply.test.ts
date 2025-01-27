import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import * as A from "../apply.ts";
import * as O from "../option.ts";

Deno.test("Sequence createSequenceTuple", () => {
  const f1 = A.createSequenceTuple(O.MonadOption);
  assertEquals(typeof f1, "function");
  assertEquals(f1(O.some(1)), O.some([1]));
  assertEquals(f1(O.none), O.none);
  assertEquals(f1(O.some(1), O.some("foo")), O.some([1, "foo"]));
  assertEquals(f1(O.some(1), O.some("foo"), O.none), O.none);
});

Deno.test("Sequence createSequenceStruct", () => {
  const f1 = A.createSequenceStruct(O.MonadOption);
  assertEquals(typeof f1, "function");
  assertEquals(f1({ one: O.some(1) }), O.some({ one: 1 }));
  assertEquals(
    f1({ one: O.some(1), foo: O.some("foo") }),
    O.some({ one: 1, foo: "foo" }),
  );
  assertEquals(f1({ one: O.some(1), foo: O.none }), O.none);
});
