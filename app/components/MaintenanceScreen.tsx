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
              <h1 className="max-w-2xl text-2xl font-serif font-bold leading-tight sm:text-3xl">
                  Turimo gukora ivugurura rusange ry'uru rubuga.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-700 dark:text-neutral-300 sm:text-lg">
                  Basomyi beza! Mutwihanganire igihe gito mwongere mugerageze
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-5 py-3 text-sm font-medium text-neutral-700 dark:border-neutral-800 dark:text-neutral-300">
                  <Clock3 className="h-4 w-4" />
                  Turagaruka mu kanya
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">Ushobora kudukurikira ugakomeza gusoma amakuru yacu kuri:</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <a href="https://x.com/intambwemedias" target="_blank" rel="noopener noreferrer" aria-label="X" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.223-6.831-5.97 6.831H2.423l7.723-8.835L1.457 2.25h6.888l4.722 6.236 5.454-6.236zM17.15 20.005h1.828L6.883 3.996H5.017l12.133 16.009z" /></svg>
                  </a>
                  <a href="https://www.facebook.com/intambwemedia" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                  </a>
                  <a href="https://www.linkedin.com/in/intambwemedia/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" /></svg>
                  </a>
                  <a href="https://www.youtube.com/@intambwemedia" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
                  </a>
                  <a href="https://www.tiktok.com/@intambwemedia" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19.498 7.094a4.994 4.994 0 0 1-3.622-1.49A4.992 4.992 0 0 1 13.364 1h-3.75v14.25a2.625 2.625 0 1 1-5.25-2.625 2.63 2.63 0 0 1 .81.125v-3.82a6.375 6.375 0 1 0 9.375 6.177V8.78a8.088 8.088 0 0 0 4.969 1.594V6.59a4.966 4.966 0 0 1-.5-.496z" /></svg>
                  </a>
                  <a href="https://www.instagram.com/intambwemedia/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163C8.756 0 8.331.012 7.052.07 2.696.278.278 2.579.07 7.052.012 8.331 0 8.756 0 12s.012 3.669.07 4.948c.208 4.474 2.626 6.875 7.052 7.083 1.28.058 1.704.07 4.948.07s3.669-.012 4.948-.07c4.469-.208 6.875-2.626 7.083-7.052.058-1.28.07-1.704.07-4.948s-.012-3.669-.07-4.948c-.208-4.474-2.626-6.875-7.052-7.083C15.669.012 15.245 0 12 0z" /><circle cx="12" cy="12" r="3.6" /><circle cx="18.406" cy="5.594" r="1.44" /></svg>
                  </a>
                  <a href="https://whatsapp.com/channel/0029VaKte5oCcW4zwZMhIf24" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 dark:border-red-700 dark:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400">
                    <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" /></svg>
                  </a>
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