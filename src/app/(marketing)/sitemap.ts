export const dynamic = "force-static";

export function generateSitemap() {
  return [
    {
      url: "/",
      lastModified: new Date().toISOString(),
    },
  ];
}

