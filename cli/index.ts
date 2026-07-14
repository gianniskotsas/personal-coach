type Command = (args: string[]) => Promise<void>;

const commands: Record<string, Command> = {};

export function registerCommand(name: string, fn: Command) {
  commands[name] = fn;
}

function printUsage() {
  console.log("Usage: personal-coach <command> [args]");
  console.log("Commands: login, ingest, search, notes, context, person, status");
}

async function main() {
  // Later tasks add their `import "./commands/xyz";` side-effect imports here,
  // each calling registerCommand() at module load time.
  await import("./commands/login");
  await import("./commands/ingest");
  await import("./commands/search");
  await import("./commands/notes");
  await import("./commands/context");
  await import("./commands/person");
  await import("./commands/status");

  const [name, ...args] = process.argv.slice(2);
  if (!name || !commands[name]) {
    printUsage();
    process.exit(name ? 1 : 0);
  }
  try {
    await commands[name](args);
  } catch (e) {
    console.error(String(e instanceof Error ? e.message : e));
    process.exit(1);
  }
}

main();
