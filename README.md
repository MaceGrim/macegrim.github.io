# macegrim.github.io

Personal site for Mason Grimshaw. Built with Astro, Tailwind CSS, and deployed via GitHub Actions to GitHub Pages.

## Development

```bash
npm install
npm run dev      # Local dev server
npm run build    # Build to dist/
npm run preview  # Preview the build
```

## Structure

- `src/pages/` -- Page templates (index, experience, talks, etc.)
- `src/layouts/` -- Shared layout (nav, footer)
- `src/content/` -- Content collections (talks, portfolio, blog, publications)
- `src/styles/` -- Global CSS and Tailwind theme
- `public/` -- Static assets (images, favicons)

## Deploy

Push to `master`. GitHub Actions builds the site and deploys to GitHub Pages automatically.
