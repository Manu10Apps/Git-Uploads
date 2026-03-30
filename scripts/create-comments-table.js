const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      "articleId" INTEGER NOT NULL,
      name VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_comments_article FOREIGN KEY ("articleId")
        REFERENCES articles(id) ON DELETE CASCADE
    )
  `);
  await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS "parentId" INTEGER`);
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_comments_parent'
      ) THEN
        ALTER TABLE comments
          ADD CONSTRAINT fk_comments_parent
          FOREIGN KEY ("parentId") REFERENCES comments(id) ON DELETE CASCADE;
      END IF;
    END $$;
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS comments_article_id_idx ON comments("articleId")`
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments("parentId")`
  );
  console.log('OK: comments table ready');
  await client.end();
}

run().catch((e) => {
  console.error('ERR:', e.message);
  process.exit(1);
});
