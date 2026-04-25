function bundle({
  entrypoints,
  minify = true,
  write = false,
}: {
  entrypoints: string[];
  minify?: boolean;
  write?: boolean;
}) {
  return Deno.bundle({
    entrypoints,
    outputDir: "../bundled",
    platform: "browser",
    sourcemap: "linked",
    minify,
    write,
  });
}

if (import.meta.main) {
  const entrypoints = ["mod.ts", "demo.ts", "counter.tsx", "signin.ts"].map((
    p,
  ) => import.meta.resolve(`../client/${p}`));
  const result = await bundle({
    entrypoints,
    minify: false,
    write: true,
  });
  console.log("Bundle complete", result);
}
