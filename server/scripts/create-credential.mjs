import { createHash, randomBytes } from 'node:crypto';

const token = randomBytes(32).toString('hex');
console.info('Private installation credential (enter in the app; do not commit or share publicly):');
console.info(token);
console.info('Server INSTALLATION_TOKEN_HASHES entry:');
console.info(createHash('sha256').update(token).digest('hex'));
