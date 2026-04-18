import { translateArticle } from '@/lib/mymemory-translate';

async function main() {
  const article = {
    title: 'Muraho',
    excerpt: 'Iki nicyo kinyarwanda',
    content: 'Iyi ni inkuru y ubugeni.',
  };
  const res = await translateArticle(article, 'ky', 'en');
  console.log(JSON.stringify(res, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
