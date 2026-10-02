import { clientEntry, css, type Handle } from "@remix-run/component";
import * as toggle from "@remix-run/ui/toggle";

import { theme } from "./_lib/tokens.ts";
import { DemoCard, Field, Readout, Segmented } from "./_lib/controls.tsx";

const sizes = [
  { value: "md", label: "md" },
  { value: "lg", label: "lg" },
];

const rowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  fontSize: theme.fontSize.sm,
  color: theme.colors.text.primary,
});

// App-owned switch look on a native checkbox; state comes from data-state.
function switchStyle(width: number, height: number) {
  const pad = 2;
  const knob = height - pad * 2;
  return css({
    appearance: "none",
    position: "relative",
    flex: "none",
    margin: 0,
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: theme.radius.full,
    background: theme.colors.border.strong,
    cursor: "pointer",
    transition: "background 120ms ease",
    "&::before": {
      content: '""',
      position: "absolute",
      top: `${pad}px`,
      left: `${pad}px`,
      width: `${knob}px`,
      height: `${knob}px`,
      borderRadius: theme.radius.full,
      background: "#ffffff",
      boxShadow: theme.shadow.sm,
      transition: "transform 120ms ease",
    },
    "&[data-state='checked']": {
      background: theme.colors.action.primary.background,
    },
    "&[data-state='checked']::before": {
      transform: `translateX(${width - height}px)`,
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.colors.focus.ring}`,
      outlineOffset: "2px",
    },
    "&:disabled": { opacity: 0.5, cursor: "not-allowed" },
  });
}

const switchStyles = {
  md: switchStyle(36, 20),
  lg: switchStyle(48, 28),
};

export const ToggleDemo = clientEntry(
  import.meta.url,
  function ToggleDemo(handle: Handle) {
    let size: "md" | "lg" = "md";

    return () => (
      <DemoCard
        id="toggle"
        title="Toggle"
        badge="@remix-run/ui/toggle"
        tagline="A headless mixin that turns a native checkbox into an accessible switch."
        stage={
          <div mix={css({ display: "grid", gap: "14px" })}>
            <label mix={rowStyle}>
              <input
                type="checkbox"
                mix={[
                  switchStyles[size],
                  toggle.control({ defaultChecked: true }),
                ]}
              />
              Email notifications
            </label>
            <label mix={rowStyle}>
              <input
                type="checkbox"
                // Always pass an options object: the server renderer appends the host props
                // positionally, so an empty call would hand them to `options` instead.
                mix={[switchStyles[size], toggle.control({})]}
              />
              Weekly digest
            </label>
            <label mix={rowStyle}>
              <input
                type="checkbox"
                mix={[switchStyles[size], toggle.control({ disabled: true })]}
              />
              SMS alerts (disabled)
            </label>
          </div>
        }
        controls={
          <>
            <Field label="size">
              <Segmented
                options={sizes}
                value={size}
                onChange={(value) => {
                  size = value as "md" | "lg";
                  void handle.update();
                }}
              />
            </Field>
            <Readout>
              {`<input type="checkbox" mix={toggle.control({ defaultChecked: true })} /> // size="${size}" is app css`}
            </Readout>
          </>
        }
        note="State is native — the switch uses the checkbox's own checked value."
      />
    );
  },
);
