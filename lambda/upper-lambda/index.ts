import { Logger } from '@aws-lambda-powertools/logger';

class NoNameError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, NoNameError.prototype)
  }
}

interface Event {
  name?: string
}

const logger = new Logger({ serviceName: 'upper' });

export async function handler(event: Event) {
  logger.debug(JSON.stringify(event));

  const name = event.name;
  if (!name) {
    throw new NoNameError('No name in event.')
  }
  return {name: name.toUpperCase()};
}
