import { Header, Footer } from './components';

export default async function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-neutral-900 dark:text-white mb-4">Amakuru</h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400">News Portal Loading...</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-4">Dev server is running on port 3000</p>
        </div>
      </main>
      <Footer />
    </>
  );
}