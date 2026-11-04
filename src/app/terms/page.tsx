import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using DriveDesk with your Google Drive account.",
};

const updated = "November 4, 2026";

export default function TermsPage() {
  return (
    <main dir="ltr" className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">DriveDesk</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Terms of Service</h1>
          <p className="mt-1 text-sm text-muted">Last updated: {updated}</p>
        </div>
        <Link href="/" className="btn-secondary">
          Back to app
        </Link>
      </div>

      <div className="card space-y-6 p-6 text-sm leading-7 text-muted sm:p-8">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">1. Acceptance</h2>
          <p>
            By accessing or using DriveDesk, you agree to these Terms of Service. If you do not agree, do not use the
            app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">2. The service</h2>
          <p>
            DriveDesk lets you browse, organize, preview, print, and upload files stored in your own Google Drive
            account. You must connect a Google account and grant the permissions the app requests before those features
            can work.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">3. Your account and responsibilities</h2>
          <ul className="list-disc space-y-1 ps-5">
            <li>You are responsible for the Google account you connect and for keeping it secure.</li>
            <li>You must have the right to access and modify the files you manage through the app.</li>
            <li>You agree not to use the app for unlawful, harmful, or abusive activity.</li>
            <li>You are responsible for the content you upload, print, or share.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">4. Google permissions</h2>
          <p>
            The app requests access to Google Drive so it can perform the actions you choose. You can revoke access at
            any time from the app&apos;s settings or your Google Account permissions page. Revoking access may stop the
            app from working until you reconnect.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">5. Availability and changes</h2>
          <p>
            The app is provided on an as-is and as-available basis. Features may change, be suspended, or be
            discontinued. We may update these terms from time to time; continued use after an update means you accept
            the revised terms.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">6. Disclaimer</h2>
          <p>
            To the maximum extent permitted by law, the app is provided without warranties of any kind, whether express
            or implied, including fitness for a particular purpose, accuracy, or uninterrupted availability.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">7. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, we are not liable for indirect, incidental, special, consequential,
            or punitive damages, or for any loss of data, files, or profits arising from your use of the app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-foreground">8. Contact</h2>
          <p>
            Questions about these terms? Contact{" "}
            <a className="font-semibold text-accent hover:underline" href="mailto:momenellaban210@gmail.com">
              momenellaban210@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        <Link className="font-semibold text-accent hover:underline" href="/privacy">
          Privacy Policy
        </Link>
      </p>
    </main>
  );
}
