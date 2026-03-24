import { AlertTriangle, Clock3, Wrench } from 'lucide-react';

type MaintenanceScreenProps = {
  message: string;
};

export function MaintenanceScreen({ message }: MaintenanceScreenProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(226,0,26,0.12),_transparent_45%),linear-gradient(180deg,_#faf7f5_0%,_#ffffff_100%)] px-4 py-10 text-neutral-950 dark:bg-[radial-gradient(circle_at_top,_rgba(226,0,26,0.18),_transparent_40%),linear-gradient(180deg,_#111111_0%,_#050505_100%)] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-black/10 bg-white/90 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.12)] backdrop-blur dark:border-white/10 dark:bg-neutral-950/80 sm:p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            <Wrench className="h-4 w-4" />
            Intambwe Media Maintenance
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
            <div>
              <h1 className="max-w-2xl text-4xl font-serif font-bold leading-tight sm:text-5xl">
                Turimo gukora ivugurura ku rubuga.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-700 dark:text-neutral-300 sm:text-lg">
                {message}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
                  <Clock3 className="h-4 w-4" />
                  Turagaruka vuba
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold">Itangazo kuri serivisi zacu</h2>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                Amapaji rusange yavuyeho by'agateganyo mu gihe hari gukorwa amavugurura. Itsinda rya tekeniki riri kubikoraho byihuse.
              </p>
              <div className="mt-5 rounded-2xl bg-white p-4 text-sm text-neutral-700 shadow-sm dark:bg-neutral-950 dark:text-neutral-300">
                Murakoze kwihangana. Nimutegereze ko urubuga rugaruka mu buryo busesuye nyuma y'iri vugurura.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}