import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/**
 * Shared chrome for every public page except the homepage hero. Wrap the
 * page contents with this and the sticky header + dark footer come along.
 *
 * The homepage uses SiteHeader + Footer directly because it has a
 * full-bleed hero that needs to live above any wrapper padding.
 */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full bg-[#f8f7f2] text-zinc-950">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
