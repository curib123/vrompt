import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

function getComponentFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getComponentFiles(entryPath);
    return entry.name.endsWith('.tsx') ? [entryPath] : [];
  });
}

describe('theme text colors', () => {
  const files = [
    ...getComponentFiles(path.join(process.cwd(), 'app')),
    ...getComponentFiles(path.join(process.cwd(), 'components')),
  ];

  it('pairs muted foregrounds with a readable dark-mode foreground', () => {
    const offenders = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ file, line, lineNumber: index + 1 }))
        .filter(
          ({ line }) =>
            /\btext-zinc-(500|600)\b/.test(line) &&
            !/dark:text-zinc-(300|400)\b/.test(line),
        ),
    );

    expect(offenders).toEqual([]);
  });

  it('pairs light error text and form placeholders with dark-mode colors', () => {
    const offenders = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ file, line, lineNumber: index + 1 }))
        .filter(
          ({ line }) =>
            (/\btext-red-600\b/.test(line) &&
              !/dark:text-red-(300|400)\b/.test(line)) ||
            (/placeholder:text-/.test(line) &&
              !/placeholder:text-(brand-mid|foreground|muted)\b/.test(line) &&
              !/dark:placeholder:text-/.test(line)),
        ),
    );

    expect(offenders).toEqual([]);
  });

  it('does not hardcode hexadecimal foreground utilities in components', () => {
    const offenders = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, index) => ({ file, line, lineNumber: index + 1 }))
        .filter(({ line }) => /!?text-\[#[0-9a-f]+\]/i.test(line)),
    );

    expect(offenders).toEqual([]);
  });
});
