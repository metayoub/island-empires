import { readFileSync } from 'node:fs';

const sensitiveNames = ['PASSWORD', 'SECRET_KEY', 'PRIVATE_KEY'];
const placeholderPattern = /^$|^<[^>]+>$/;
const failures = [];
const example = readFileSync('.env.example', 'utf8');

for (const line of example.split('\n')) {
  if (!line || line.startsWith('#') || !line.includes('=')) {
    continue;
  }

  const [key, ...valueParts] = line.split('=');
  const value = valueParts.join('=').trim();
  if (
    sensitiveNames.some((name) => key.endsWith(name)) &&
    !placeholderPattern.test(value)
  ) {
    failures.push(`.env.example contains non-placeholder value for ${key}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Security check passed.');
