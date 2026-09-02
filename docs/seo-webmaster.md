# Search engine setup

Vrompt exposes the Next.js metadata routes needed for organic discovery:

- `/sitemap.xml` contains the home, Explore, active public prompts, active
  creator profiles, and non-empty public collections.
- `/robots.txt` allows public pages and excludes auth, account, dashboard,
  onboarding, admin, search filters, and other private or duplicate paths.
- Public prompt, profile, and collection pages emit route-specific metadata,
  canonical URLs, Open Graph/Twitter cards, and valid JSON-LD where the page
  has the matching content.

## Google Search Console

1. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin in the production
   environment. Keep the origin without a path, for example
   `https://prompts.example.com`.
2. Deploy the web app and confirm that the origin serves `/robots.txt` and
   `/sitemap.xml` through the reverse proxy.
3. Add a Domain property or URL-prefix property in Google Search Console.
4. Submit `https://your-domain.example/sitemap.xml` in the Sitemaps report.
5. Use URL Inspection on the home page and representative `/prompts/<id>/<slug>`,
   `/u/`, and `/collections/` URLs. Confirm the selected canonical matches the
   clean URL.

## Bing Webmaster Tools

1. Add the same production domain in Bing Webmaster Tools and complete its
   DNS, XML, or HTML verification flow using a token supplied by the site
   owner.
2. Submit `https://your-domain.example/sitemap.xml` under Sitemaps.
3. Review crawl errors and inspect a prompt URL after deployment.

No verification token belongs in this repository. Add provider-specific
verification only through the provider's documented deployment configuration
after the site owner supplies it.

## Production URL and proxy checks

The production Compose stack passes `NEXT_PUBLIC_SITE_URL` into the Next.js
build and runtime. It also uses `INTERNAL_API_BASE_URL` for server-rendered
public content, so metadata and sitemap generation do not depend on a browser
or a public API hostname. Verify the following after each domain/proxy change:

```text
GET /                  200
GET /explore           200
GET /prompts/<id>/<slug> 200
GET /p/<public-slug>     308 to the stable prompt URL
GET /robots.txt        200
GET /sitemap.xml       200
GET /login             noindex
GET /search?q=...      noindex
```

Technical SEO is not a traffic guarantee. Search Console coverage,
indexation, impressions, clicks, and signups must be monitored after launch.

Public sharing is intentionally disabled when the resolved origin is localhost,
`127.0.0.1`, or another loopback host. Set `NEXT_PUBLIC_SITE_URL` to the final
HTTPS origin before testing Copy Link, native sharing, or social destinations.
