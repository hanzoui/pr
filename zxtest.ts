import { spawn } from "node:child_process";
import {  os, useBash, usePowerShell } from "zx";
import { $ } from "bun";
// import { $ } from "zx";
// useBash()
// $.verbose = true;
if (os.platform() === "win32") {
//   $.prefix = "";
//   $.shell = "cmd";
//   $.stdio = ["inherit", "pipe", "pipe"];
}
// $.stdio = ["inherit", "overlapped", "overlapped"];

// $.stdio = ["inherit", "overlapped", "overlapped"];

// $.spawn = (<Args extends readonly any[]>(cmd: string, ...args: Args) => {
//   const p = spawn(cmd, ...args);
//   process.stdin.pipe(p.stdin);
//   p.stdout!.pipe(process.stdout, { end: false });
//   p.stderr!.pipe(process.stderr, { end: false });
//   return p;
// }) as typeof spawn;

console.log("start");

await $`echo aaa`; //.stdio("inherit", "inherit", "inherit");
await $`cd prs && pwd`; //.stdio("inherit", "overlapped", "overlapped");
await $`ls prs`; //.stdio("inherit", "overlapped", "overlapped");
await $`cat .env`; //.stdio("inherit", "overlapped", "overlapped");
// usePowerShell()
// await $`cat | head -n 3`; //.stdio("inherit", "overlapped", "overlapped");
// await $`cat | head -n 3`; //.stdio("inherit", "overlapped", "overlapped");

await $`echo bbb`; //.stdio("inherit", "overlapped", "overlapped");

await $`echo ccc`; //.stdio("inherit", "pipe", "pipe");

await $`echo ddd`; //.stdio("inherit", "ignore", "ignore");

console.log("done");
