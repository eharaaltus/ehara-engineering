import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";
import { PageHero } from "@/components/layout/page-hero";
import { BookOpen, PlayCircle } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * User Manual — walkthrough videos and reference photos for the WMS.
 *
 * Media files live in /public/user-manual/. Add each file's path here as it's
 * added to the folder (kept as an explicit list so it renders reliably on
 * Vercel, where the public folder isn't listable at runtime).
 */
const VIDEOS: { src: string; title: string }[] = [];
const PHOTOS: { src: string; title: string }[] = [];

export default async function UserManualPage() {
  const hasContent = VIDEOS.length > 0 || PHOTOS.length > 0;

  return (
    <>
      <DashboardHeader generatedAt={new Date()} />
      <main className="relative mx-auto max-w-[1200px] px-8 pb-20 pt-8 max-md:px-4">
        <PageHero
          eyebrow="Help"
          title="User Manual"
          subtitle="Guides, walkthroughs, photos & videos for the Ehara Engineering WMS."
          Icon={BookOpen}
        />

        {!hasContent ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-6 py-20 text-center backdrop-blur">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl text-white shadow-lg" style={{ background: "linear-gradient(135deg, #0ea5c4, #14245c)" }}>
              <PlayCircle size={26} strokeWidth={2.1} />
            </span>
            <p className="mt-4 text-[16px] font-bold text-slate-700">No manual content yet</p>
            <p className="mt-1 max-w-md text-[13.5px] text-slate-500">Videos and photos added to this manual will appear here.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-10">
            {VIDEOS.length > 0 && (
              <section>
                <h2 className="mb-4 text-[12px] font-black uppercase tracking-[0.1em] text-slate-400">Videos</h2>
                <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
                  {VIDEOS.map((v) => (
                    <figure key={v.src} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <video controls preload="metadata" className="w-full bg-black" style={{ aspectRatio: "16 / 9" }}>
                        <source src={v.src} />
                        Your browser does not support the video tag.
                      </video>
                      <figcaption className="px-4 py-3 text-[13.5px] font-bold text-slate-700">{v.title}</figcaption>
                    </figure>
                  ))}
                </div>
              </section>
            )}

            {PHOTOS.length > 0 && (
              <section>
                <h2 className="mb-4 text-[12px] font-black uppercase tracking-[0.1em] text-slate-400">Photos</h2>
                <div className="grid grid-cols-3 gap-4 max-md:grid-cols-2 max-sm:grid-cols-1">
                  {PHOTOS.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a key={p.src} href={p.src} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                      <img src={p.src} alt={p.title} className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="px-3 py-2 text-[12.5px] font-semibold text-slate-600">{p.title}</div>
                    </a>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
      <DashboardFooter />
    </>
  );
}
