export const GEMINI_TEXT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
];

function stripMarkdownFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function extractObject(value: string) {
  const start = value.indexOf('{');
  const end = value.lastIndexOf('}');
  return start >= 0 && end > start ? value.slice(start, end + 1) : value;
}

function repairInteriorQuotes(value: string) {
  let repaired = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (!inString) {
      repaired += character;
      if (character === '"') inString = true;
      continue;
    }

    if (escaped) {
      repaired += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      repaired += character;
      escaped = true;
      continue;
    }
    if (character !== '"') {
      repaired += character;
      continue;
    }

    let nextIndex = index + 1;
    while (/\s/.test(value[nextIndex] || '')) nextIndex += 1;
    const next = value[nextIndex];
    const closesString =
      !next || next === ',' || next === '}' || next === ']' || next === ':';
    if (closesString) {
      repaired += character;
      inString = false;
    } else {
      repaired += '\\"';
    }
  }

  if (inString) repaired += '"';
  return repaired.replace(/,\s*([}\]])/g, '$1');
}

function closeOpenContainers(value: string) {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const character of value) {
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{' || character === '[') stack.push(character);
    else if (character === '}' && stack.at(-1) === '{') stack.pop();
    else if (character === ']' && stack.at(-1) === '[') stack.pop();
  }

  let completed = value;
  if (inString) completed += '"';
  while (stack.length) completed += stack.pop() === '{' ? '}' : ']';
  return completed;
}

export function parseModelJson<T>(text: string): T {
  const clean = stripMarkdownFence(text);
  const objectOnly = extractObject(clean);
  const repaired = repairInteriorQuotes(objectOnly);
  const candidates = [
    clean,
    objectOnly,
    repaired,
    closeOpenContainers(repaired),
  ];
  let lastError: unknown;

  for (const candidate of new Set(candidates)) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new SyntaxError('Model provider returned invalid JSON');
}
