export function DIE(reason?: string | Error): never {
  throw reason;
}
