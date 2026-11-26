import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseOptions } from './database';
import { Role, User } from './entities';

async function provision() {
  const [username, role] = process.argv.slice(2);
  if (!username || (role !== Role.Staff && role !== Role.Admin)) {
    throw new Error('Usage: npm run provision -- <registered-username> <staff|admin>');
  }
  const dataSource = await new DataSource(databaseOptions).initialize();
  try {
    const users = dataSource.getRepository(User);
    const user = await users.findOneBy({ username });
    if (!user) throw new Error('Register this account first through POST /api/v1/users');
    await users.update(user.userId, { role });
    console.log(`Role assigned userId=${user.userId} role=${role}`);
  } finally {
    await dataSource.destroy();
  }
}

provision().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});

