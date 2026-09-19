import Script from "next/script";

/**
 * Google Analytics 4. Enabled only when NEXT_PUBLIC_GA_ID holds a valid
 * measurement ID (G-XXXX…), so previews and local builds stay analytics-free.
 * The proxy's CSP is extended with the Google domains in the same condition.
 */
export function Analytics() {
  const raw = process.env.NEXT_PUBLIC_GA_ID?.trim() ?? "";
  const id = /^(G|UA)-[A-Za-z0-9-]+$/.test(raw) ? raw : "";
  if (!id) return null;

  const measurementId = JSON.stringify(id);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${measurementId});`}
      </Script>
    </>
  );
}
