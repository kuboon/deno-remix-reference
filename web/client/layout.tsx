/**
 * The document shell.
 *
 * A component like any other, which is why it lives here rather than beside the server: everything
 * it names is in `client/`. The one thing it cannot work out — where the client runtime was
 * compiled to — is handed to it as a prop.
 *
 * What turns this tree into a response is `context.render`, from the `render({ assets })`
 * middleware in `server/router.tsx`: the doctype, the content type, and `renderToStream` rather
 * than `renderToString`. The runtime turns every internal `<a>` click into a navigation that swaps
 * the document only when it finds `<!-- rmx:flush document -->` at the end of the stream, which
 * `renderToString` strips — so a plain `<a href>` is a soft navigation, with no frame to name.
 *
 * The shell's own CSS is right here as `css(...)` mixins. The renderer collects the mixins the
 * page rendered and writes them into `<head>`. The one stylesheet it links is `static/app.css`:
 * the tokens, the document defaults and the `@layer base, rmx, app` statement the cascade hangs
 * off. Its position in the head matters — it has to come before the styles Remix appends.
 */

import { css, type Handle, type RemixNode } from "@remix-run/ui";

import { base, BASE_META_NAME } from "./base.ts";
import { NavAuth } from "./islands/nav_auth.tsx";
import { routes } from "./routes.ts";
import { color, contentWidth } from "./tokens.ts";

/** What every page hands the shell. */
export interface LayoutProps {
  title: string;
  description?: string;
  /**
   * The page's social card — the URL of the PNG `server/og/` draws for it, or `null` where there
   * is nothing to show. Required for the same reason `script` is: a missing card looks exactly
   * like a card nobody wanted.
   */
  image: string | null;
  /**
   * The client runtime — resolved by `server/runtime.ts`, because a URL under the deploy prefix
   * and the bundler's naming is a thing only the server knows.
   *
   * Required, and `null` for a page that places no island. The shell itself places one (the
   * sign-in control in the nav), so today every page passes the runtime; the type keeps the
   * decision visible.
   */
  script: ClientRuntime | null;
  children: RemixNode;
}

/** Where the client runtime lives, and what it pulls in behind it. */
export interface ClientRuntime {
  src: string;
  /** The chunks it imports, for `<link rel="modulepreload">`. */
  preloads: readonly string[];
}

/**
 * What every page module exports: a component, plus what the shell needs to frame it.
 *
 * `hydrate` is required rather than optional on purpose: an omitted flag is indistinguishable
 * from a page that genuinely ships nothing, and the page still renders — just with islands that
 * never come alive.
 */
export interface PageModule {
  default: (handle: Handle) => () => RemixNode;
  title: string;
  description?: string;
  /** Whether the page places a client entry, so the shell boots the runtime for it. */
  hydrate: boolean;
}

/**
 * Renders a page inside the document shell.
 *
 * @param handle The page's title, body, and the runtime it loads
 * @returns The document
 */
export function Layout(handle: Handle<LayoutProps>) {
  return () => {
    const props = handle.props;

    return (
      <html lang="ja">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{props.title}</title>
          {props.description
            ? <meta name="description" content={props.description} />
            : null}
          <meta property="og:type" content="website" />
          <meta property="og:title" content={props.title} />
          {props.description
            ? <meta property="og:description" content={props.description} />
            : null}
          {props.image
            ? (
              <>
                <meta property="og:image" content={props.image} />
                <meta name="twitter:card" content="summary_large_image" />
              </>
            )
            : null}
          {
            /* The deploy prefix, for the browser — see `client/base.ts`. */
          }
          <meta name={BASE_META_NAME} content={base} />
          <link rel="stylesheet" href={`${base}/static/app.css`} />
          <link
            rel="icon"
            type="image/svg+xml"
            href={`${base}/static/favicon.svg`}
          />
          {(props.script?.preloads ?? []).map((href) => (
            <link key={href} rel="modulepreload" href={href} />
          ))}
        </head>
        <body>
          <Shell>{props.children}</Shell>
          {props.script
            ? <script type="module" src={props.script.src}></script>
            : null}
        </body>
      </html>
    );
  };
}

/** Everything inside `<body>`: the header, the page, and the footer. */
export function Shell(handle: Handle<{ children: RemixNode }>) {
  return () => (
    <>
      <header mix={[bandStyle, headerStyle]}>
        <a mix={brandStyle} href={routes.home.href()}>Remix3 on Deno</a>
        <nav mix={navStyle}>
          <a href={routes.home.href()}>Home</a>
          <a href={routes.hydration.href()}>Hydration</a>
          <NavAuth myHref={routes.my.href()} />
        </nav>
      </header>
      <main mix={[bandStyle, mainStyle]}>{handle.props.children}</main>
      <footer mix={[bandStyle, footerStyle]}>
        <p>
          Built with <a href="https://remix.run">Remix v3</a> on{" "}
          <a href="https://deno.com">Deno</a>.
        </p>
      </footer>
    </>
  );
}

// --- styles -----------------------------------------------------------------

/** The measure the header, the main column and the footer all share. */
const bandStyle = css({
  width: "100%",
  maxWidth: contentWidth,
  marginInline: "auto",
  paddingInline: "1.25rem",
});

const headerStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
  flexWrap: "wrap",
  paddingBlock: "1.25rem",
  borderBottom: `1px solid ${color.border}`,
});

const brandStyle = css({
  fontWeight: 700,
  fontSize: "1.1rem",
  textDecoration: "none",
  color: color.fg,
});

const navStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "1rem",
});

const mainStyle = css({ paddingBlock: "2.5rem" });

const footerStyle = css({
  paddingBlock: "2rem",
  borderTop: `1px solid ${color.border}`,
  color: color.muted,
  fontSize: "0.9rem",
});
