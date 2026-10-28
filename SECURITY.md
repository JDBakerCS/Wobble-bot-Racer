# Security

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Contact the repository owner privately with a description, reproduction steps, and the potential impact.

## Security boundaries

- The browser renders the race and sends player inputs.
- The server validates sessions, schedules race events, calculates scores, and writes room state.
- D1 is available only through the Cloudflare `DB` binding.
- Local secrets belong in `.dev.vars` or `.env.local`; both are ignored by Git.
- Production secrets must use Cloudflare secrets or encrypted environment configuration.
- Values prefixed with `NEXT_PUBLIC_` are public and must never contain secrets.

Player session tokens are stored temporarily in browser session storage because the browser must authenticate room actions. They are never included in public room views or URLs.
