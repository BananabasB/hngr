import pg from 'pg';

const client = new pg.Client({
  connectionString: "YOUR_DATABASE_URL_FROM_ENV",
});

console.log("Checking connection...");
try {
  await client.connect();
  const res = await client.query('SELECT NOW()');
  console.log("Success! Database time:", res.rows[0]);
  await client.end();
} catch (err) {
  console.error("Connection failed:", err);
  process.exit(1);
}
