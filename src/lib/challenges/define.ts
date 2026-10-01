import type { FunctionChallenge } from "./challenges";

const fnStarter = (name: string, params: string, comment: { en: string }) =>
  `-- ${comment.en}\nlocal function ${name}(${params})\n\t\nend\n`;

/** A function challenge; the starter is an empty function with the right name. */
export const F = (
  c: Omit<FunctionChallenge, "kind" | "starter"> & { params: string },
): FunctionChallenge => {
  const { params, ...rest } = c;
  return {
    kind: "function",
    starter: fnStarter(c.fn, params, { en: "Write your function here" }),
    ...rest,
  };
};

/** Test cases: the first list is shown before running, the second stays hidden. */
export const T = (shown: string[], hidden: string[] = []) => [
  ...shown.map((args) => ({ args })),
  ...hidden.map((args) => ({ args, hidden: true })),
];
