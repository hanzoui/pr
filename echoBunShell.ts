import { $ as bunShell, ShellPromise, type ShellExpression } from "bun";

export function $(
  strings: TemplateStringsArray,
  ...expressions: ShellExpression[]
): ShellPromise {
  console.log(
    strings
      .map((s, i) => s + (expressions[i] ?? ""))
      .join("")
      .trim()
      .split("\n")
      .map((e, i) => (i === 0 ? "$ " : "> ") + e)
      .join("\n")
  );
  return bunShell(strings, ...expressions);
}
