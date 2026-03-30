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
  await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes INTEGER NOT NULL DEFAULT 0`);
  await client.query(`ALTER TABLE comments ADD COLUMN IF NOT EXISTS dislikes INTEGER NOT NULL DEFAULT 0`);
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
  await client.query(`
    CREATE TABLE IF NOT EXISTS comment_votes (
      id SERIAL PRIMARY KEY,
      "commentId" INTEGER NOT NULL,
      "visitorId" VARCHAR(255) NOT NULL,
      reaction VARCHAR(16) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_comment_votes_comment FOREIGN KEY ("commentId")
        REFERENCES comments(id) ON DELETE CASCADE,
      CONSTRAINT comment_votes_reaction_check CHECK (reaction IN ('like', 'dislike'))
    )
  `);
  await client.query(
    `CREATE UNIQUE INDEX IF NOT EXISTS comment_votes_comment_visitor_uidx ON comment_votes("commentId", "visitorId")`
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS comment_votes_visitor_id_idx ON comment_votes("visitorId")`
  );
  console.log('OK: comments table ready');
  await client.end();
}

run().catch((e) => {
  console.error('ERR:', e.message);
  process.exit(1);
});
