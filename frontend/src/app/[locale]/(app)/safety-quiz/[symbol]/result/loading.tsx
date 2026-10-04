import { Container } from "@/components/ui/Container";

export default function Loading() {
  return (
    <Container className="py-6 md:py-8">
      <div aria-hidden>
        <div className="animate-pulse rounded-3xl border border-white/10 bg-neutral-900/90 p-6 text-center">
          <div className="mx-auto size-14 rounded-2xl bg-white/10" />
          <div className="mx-auto mt-5 size-36 rounded-full bg-white/5" />
          <div className="mx-auto mt-4 h-3 w-1/3 rounded bg-white/5" />
          <div className="mx-auto mt-2 h-6 w-2/3 rounded bg-white/5" />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {[0, 1].map((col) => (
            <div key={col} className="space-y-5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-3xl border border-white/10 bg-neutral-900/90"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
