export function errorObject(error, context = {}) {
  return { error: error.message || String(error), ...(error.status ? { status: error.status } : {}), ...(error.body !== undefined ? { detail: error.body } : {}), ...context };
}

export function printError(error, { json = false, printer = console, context = {} } = {}) {
  const value = errorObject(error, context);
  printer.error(json ? JSON.stringify(value, null, 2) : value.error);
}
