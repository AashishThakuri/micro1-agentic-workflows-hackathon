export function GET() {
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#171717"/><circle cx="32" cy="32" r="18" fill="none" stroke="#f2efe9" stroke-width="8"/><path d="M32 14v18h18" fill="none" stroke="#f2efe9" stroke-width="8" stroke-linecap="round"/></svg>`;
  return new Response(icon, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
