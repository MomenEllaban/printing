import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How DriveDesk accesses, stores, and protects Google Drive data.",
};

const updated = "November 4, 2026";

export default function PrivacyPage() {
  return (
    <main dir="ltr" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">DriveDesk</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Privacy Policy</h1>
          <p className="mt-1 text-sm text-muted">Last updated: {updated}</p>
        </div>
        <Link href="/" className="btn-secondary">
          Back to app
        </Link>
      </div>

      <div className="card space-y-6 p-6 text-sm leading-7 text-muted sm:p-8">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">1. Who we are</h2>
          <p>
            DriveDesk is a web application that helps you browse, organize, preview, print, and upload files in your own
            Google Drive account. This policy explains what data the app accesses and how it is handled.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">2. Data we access</h2>
          <p>When you connect your Google account, the app may access:</p>
          <ul className="list-disc space-y-1 ps-5">
            <li>Your Google account email address and basic profile information.</li>
            <li>
              Google Drive files, folders, and metadata (names, types, sizes, timestamps, thumbnails, and links) that
              you choose to view or manage through the app.
            </li>
            <li>OAuth access and refresh tokens needed to call the Google Drive API on your behalf.</li>
            <li>App settings, favorites, and audit logs created while you use the app.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">3. How we use data</h2>
          <p>
            Data is used only to provide the features you request: showing your Drive contents, uploading files,
            previewing and printing documents, remembering your settings and favorites, and keeping the connection
            working. We do not use your Google data for advertising, profiling, or selling.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">4. Storage and security</h2>
          <p>
            OAuth tokens are stored encrypted with AES-256-GCM. Cached file metadata and app data are stored in a
            PostgreSQL database. The app is served over HTTPS and access is limited to the account owner. No method of
            storage or transmission is completely secure, but we take reasonable technical measures to protect your
            information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">5. Sharing</h2>
          <p>
            We do not sell or rent your data. Data is shared only with service providers needed to run the app (for
            example, Google APIs for Drive operations, and hosting/database providers) and only as required to provide
            the service or comply with the law.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">6. Retention and deletion</h2>
          <p>
            File metadata is cached to make the app faster and is removed when you delete it from the app, disconnect
            your account, or request deletion. Disconnecting your Google account revokes the stored tokens and stops
            further access. To request deletion of any remaining app data, contact us using the email below.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">7. Google API Limited Use</h2>
          <p>
            DriveDesk&apos;s use and transfer of information received from Google APIs adheres to the{" "}
            <a
              className="font-semibold text-accent hover:underline"
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. The app only accesses Drive data to provide its file-management
            features, does not transfer it to third parties except as needed to provide those features or comply with
            law, and does not use it for advertising.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">8. Your choices</h2>
          <p>
            You can disconnect Google Drive at any time from the app&apos;s settings page or from your Google Account
            permissions page. You can also contact us to ask about access, correction, or deletion of your data.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">9. Contact</h2>
          <p>
            For privacy questions or data requests, contact{" "}
            <a className="font-semibold text-accent hover:underline" href="mailto:momenellaban210@gmail.com">
              momenellaban210@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        <Link className="font-semibold text-accent hover:underline" href="/terms">
          Terms of Service
        </Link>
      </p>
    </main>
  );
}
