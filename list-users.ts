
import { db } from './src/db';
import { users } from './src/db/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const allUsers = await db.select().from(users);
    console.log('Total users:', allUsers.length);
    allUsers.forEach(u => {
      console.log(`ID: ${u.id}, Email: ${u.email}, Name: ${u.displayName}`);
    });
  } catch (err) {
    console.error('Error fetching users:', err);
  }
  process.exit(0);
}

main();
