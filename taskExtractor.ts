const TASK_REGEX = /^(\s*[-*])\s+\[ \]\s*.*$/;

export function extractUncheckedTasks(content: string): string {
  const lines = content.split(/\r?\n/);
  const tasks: string[] = [];

  for (const line of lines) {
    if (TASK_REGEX.test(line)) {
      tasks.push(line);
    }
  }

  return tasks.join("\n");
}
