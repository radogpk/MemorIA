---
name: memorIA
description: Two personal agendas and a shared space for academic work and confirmed plans.
colors:
  background: "#101b2d"
  surface: "#17263c"
  raised: "#21344e"
  spotlight: "#203853"
  navigation: "#1c304a"
  foreground: "#f0f5fa"
  muted: "#adbed1"
  accent: "#97c7e7"
  accent-ink: "#11273b"
  accent-hover: "#b4dbf3"
  raised-hover: "#2c4463"
  navigation-hover: "#28435f"
  line: "#30415a"
  field-line: "#4a6079"
  danger: "#ffb0ad"
  pending-background: "#493e2c"
  pending-text: "#f7d49c"
  accepted-background: "#23473e"
  accepted-text: "#bbe7d4"
  declined-background: "#4b333b"
  declined-text: "#ffc5ce"
  error-background: "#4b3039"
  error-text: "#ffd1ce"
typography:
  headline:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "30px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  headline-mobile:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "25px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  item-title:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  hint:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 650
    lineHeight: 1.5
  metadata:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  entry-headline:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "36px"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  entry-name:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.5
  entry-name-mobile:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.5
  entry-initial:
    fontFamily: '"Segoe UI Variable", "Segoe UI", sans-serif'
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  status: "5px"
  field: "7px"
  control: "8px"
  inset: "10px"
  preview: "12px"
  panel: "14px"
  dialog: "18px"
  avatar: "50%"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  panel: "28px"
  section: "32px"
  block: "40px"
  page: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "10px 17px"
  button-secondary-hover:
    backgroundColor: "{colors.raised-hover}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    padding: "4px 0"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    padding: "9px 11px"
  navigation-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
  response-state-pending:
    backgroundColor: "{colors.pending-background}"
    textColor: "{colors.pending-text}"
    rounded: "{rounded.status}"
    padding: "3px 8px"
  response-state-accepted:
    backgroundColor: "{colors.accepted-background}"
    textColor: "{colors.accepted-text}"
    rounded: "{rounded.status}"
    padding: "3px 8px"
  response-state-declined:
    backgroundColor: "{colors.declined-background}"
    textColor: "{colors.declined-text}"
    rounded: "{rounded.status}"
    padding: "3px 8px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "24px"
  course:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "24px 28px"
  dialog:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.dialog}"
    width: "min(560px, calc(100% - 28px))"
  profile-choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "28px"
  profile-choice-hover:
    backgroundColor: "{colors.raised}"
  shared-slot:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: "11px 14px"
  shared-slot-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
---

# Design System: memorIA

## Overview

**Creative North Star: "Dos agendas. Un espacio en común."**

memorIA is an everyday academic workspace for Gerardo (Principito) and Norely (Evebebé). Its evening-study atmosphere comes from a dark blue field, slate blue work surfaces and pale blue controls. Familiar navigation, readable interface type and visible ownership keep a dense schedule approachable.

The visual system supports personal work and explicit agreement. Color marks courses, profiles and invitation states; written labels carry the meaning. Broad panels group related work, while chronological rows keep times, session types, rooms and teachers close to their subjects. The implementation uses no decorative images or page-load choreography.

**Key Characteristics:**

- Dark blue shell with flat, tonal work surfaces.
- Pale blue actions and clearly marked active navigation.
- Segoe UI hierarchy with compact, readable schedule metadata.
- Native fields and dialogs with visible keyboard focus.
- Course-contained sessions and text-labeled invitation states.
- Explicit person selection and day-led shared availability.

## Colors

The palette combines cool, subdued structure with a light blue action color; warm and green tones carry specific response states.

### Primary

- **Pale Study Blue** (`accent`): primary actions, active desktop destinations, links, selection and focus outlines. Its dark ink companion keeps filled controls readable.
- **Pale Blue Hover** (`accent-hover`): the primary button's hover state.

### Neutral

- **Evening Blue** (`background`): page field, header and dialog ground.
- **Slate Work Surface** (`surface`): cards, form fields and session groups.
- **Raised Slate** (`raised`, `raised-hover`): secondary controls and selected segmented controls.
- **Focus Panel Blue** (`spotlight`): the day overview and shared-plan introduction.
- **Navigation Blue** (`navigation`, `navigation-hover`): the desktop rail and mobile bar.
- **Cool White** (`foreground`) and **Quiet Blue Gray** (`muted`): primary text and supporting information.
- **Slate Divider** (`line`) and **Field Stroke** (`field-line`): calendar structure and native field boundaries.

### Named Rules

**The Ownership Rule.** Course and profile colors identify data. Keep their accompanying names or type labels visible; do not use those editable colors as replacements for the application action accent.

Invitation status uses the `pending-*`, `accepted-*` and `declined-*` pairs. Danger and error tokens identify destructive actions and failure messages. The default Gerardo and Norely avatar colors come from profile data, and course colors remain editable data rather than a fixed secondary palette.

## Typography

**Interface Font:** Segoe UI Variable, with Segoe UI and sans-serif fallbacks.

**Character:** A single familiar interface family supports Spanish prose, native controls and compact academic metadata. There is no separate display or monospace family. Times and emphasized numbers use tabular numerals.

### Hierarchy

- **Headline:** the normative `headline` role; switches to `headline-mobile` at the small-screen breakpoint.
- **Title:** the `title` role for section and dialog headings. The day overview uses a larger contextual title that steps down from desktop (25px) through tablet (23px) to mobile (22px).
- **Item title:** the `item-title` role for agenda entries. Course titles use a compact intermediate size, desktop (18px) and mobile (17px).
- **Body:** the `body` role, with prose limited to a readable measure (70ch).
- **Label and hint:** native form labels and supporting guidance use the respective frontmatter roles.
- **Metadata:** course session rows, ownership and timing details use the compact `metadata` role. Status badges are smaller (11px); mobile navigation labels are (10px).
- **Entry decision:** `entry-headline` enlarges the profile-selection question; at the small-screen breakpoint it reuses `headline`. Profile names use `entry-name` and `entry-name-mobile`, with `entry-initial` inside the avatar. These four roles intentionally extend the existing interface ramp for the entry surface; they do not introduce another font family or replace incumbent roles.

**The Interface Voice Rule.** Use sentence case, direct headings and the interface family. Keep schedule times aligned with tabular numerals instead of introducing display lettering.

## Layout

Before entry, a standalone minimum-height viewport centers a selector within a maximum width (640px), with padding (48px 24px). Its two profile buttons stay side by side, with a gap (20px). At or below (600px), outer padding becomes (32px 20px), the gap becomes (12px), and card padding becomes (24px 18px); the two-choice comparison remains visible at (390px).

After selection, the viewport is a fixed-height application shell with an independently scrolling main workspace. The desktop rail is normally (228px) wide and the header (76px) high. Pages center within a maximum width (1320px), with normal desktop padding (44px 48px 64px). Wider screens, from (1500px), increase the rail to (250px) and top page padding to (54px).

The day workspace uses a broad agenda column and a narrower support column in a ratio (1.65fr / 1fr), with a gap (46px). Course cards stack vertically and contain their own session rows. Full-width session rows align type, weekday, time, room and teacher across five columns. The spacing scale is pragmatic rather than a rigid multiple: small gaps support controls, medium spaces group rows, and larger spaces distinguish sections.

At or below (1150px), the rail narrows to (205px), page padding tightens, and session rows use three columns. At or below (850px), the rail gives way to a five-destination fixed bottom bar; the header becomes (68px) high, and main content reserves (76px) for bottom navigation. Save state remains visible as an icon while its text is hidden at narrower widths.

At or below (600px), headings and actions stack, the dashboard becomes one column, page padding becomes (26px 18px 36px), and course rows use two columns with time and the last detail spanning the row. Native date-time forms and the parsed-note review collapse to one column. Other paired fields retain their two-column grouping where the implementation supports it.

Shared planning centers within a maximum width (1120px). Its day controls and proposal span the full form; the middle row places both agendas beside a free-hour column (320px), with gaps (36px 32px). At or below (1100px), the outer form becomes one column. The two agendas remain paired until (600px), when they stack with a gap (24px) and begin collapsed behind a named-count summary and “Ver horas ocupadas.” The proposal's time-and-title grid also becomes one column there. This preserves the order day and duration → agendas → common hours → proposal at desktop, tablet and mobile widths.

## Elevation & Depth

Depth comes primarily from tonal layering. Ordinary cards and controls have no drop shadow. The dialog alone casts a broad shadow over a dark backdrop; paired sidebar avatars use a narrow ring to separate their overlapping circles.

### Shadow Vocabulary

- **Dialog:** (`0 16px 60px #0007`), reserved for the native modal surface.
- **Avatar separation:** (`0 0 0 3px #1c304a`), a ring matching the navigation ground.

**The Tonal Surface Rule.** Separate everyday work regions with background tone and spacing. Reserve elevation for the modal layer.

## Shapes

Broad work panels use the `panel` radius. Fields and controls use the tighter `field` and `control` radii; inset session groups, parsed previews and dialogs have their own evidenced steps. Status badges are compact rectangles with lightly softened corners. Avatars and course markers are circles.

Use borders where they clarify a field, check control or calendar grid. The implementation does not outline every card. Course color remains a small marker; calendar events use a translucent tint derived from that color.

## Components

### Buttons

Calm, compact controls with a clear filled primary action. Primary and secondary controls share a minimum height (44px), inline icon spacing (8px) and their frontmatter shape and padding. Small variants use a minimum height (38px), tighter padding (8px 13px), and type (13px); mobile trims their horizontal padding to (11px).

Icon controls are transparent by default, muted in color and normally at least (40px) square. Hover fills them with the raised surface and brightens the icon. Text actions use the accent and gain an underline on hover. Disabled buttons use opacity (0.45) and a not-allowed cursor. All interactive elements share an accent focus outline (3px) with offset (3px). Color transitions last (0.16s); reduced-motion preference removes transitions.

### Chips

Invitation response badges show “Por confirmar,” “Aceptada” or “Rechazada” using the corresponding frontmatter pairs. “Cancelada” uses the declined pair; “Finalizada” overrides the wording while retaining the stored response's color pair. They describe state rather than acting as controls. Keep the text label, compact padding and modest corner shape together.

### Cards / Containers

Work panels use the surface tone, panel radius and no shadow. The upcoming-work panel uses padding (24px); course and full invitation cards normally use padding (24px 28px). On mobile course padding becomes (20px 16px). Avoid adding ornamental borders to these flat containers.

### Inputs / Fields

Use native inputs, selects and textareas. Dialog fields have a visible field stroke (1px), a surface fill and a minimum height (42px), with their shape and padding in the frontmatter. Labels sit above the control with a gap (7px). Inputs use the global focus outline; date and time controls retain native editing affordances. Error notices use the error pair and explanatory text. Native checkbox controls use the action accent.

### Navigation

The desktop rail contains five icon-and-label destinations. Items are at least (46px) high and (14px) in type; the active destination receives pale blue fill and dark ink. The mobile bar keeps the same destinations, uses stacked icons and labels, and marks the active item with lighter blue text and a thicker icon stroke. Use inline SVG line icons, as the existing Lucide components do. Preserve accessible names and current-page semantics.

### Profile entry and active identity

The entry question precedes all agenda content and navigation. Each entire profile card is a native button with a data-colored circular avatar (60px), name, distinct nickname and “Entrar” action with a line arrow. Gerardo appears with Principito; Norely appears with Evebebé and the initial N. The name supplies identity, while the nickname is supporting text. The card uses the surface tone and panel radius; hover raises only its tone, and keyboard focus uses the shared outline. Loading shows “Preparando tu espacio…” as a status message in the same entry region.

After entry, the header keeps the active name and a separate “Cambiar perfil” text action. On wider screens it includes a small avatar; at or below (600px) the avatar hides while the name and action remain. This action returns to the entry selector; choosing a person opens Mi día. The selector replaces the former compact profile segments. Names and nicknames remain attached to the existing profile identifiers and data.

### Shared planning and invitation history

Day, duration and an expandable search interval precede availability. Each agenda names its owner and marks the active person “Tú”; occupied rows align an accent-colored time with a title and compact session details. Pending reservations add the written label “Propuesta pendiente.” Empty agendas say “Sin horas ocupadas registradas.” The visible Peru time context accompanies the availability explanation.

Free-hour choices are native buttons with an interval, a minimum height (44px), control radius and field-like border. Hover uses the raised tone; selection uses accent fill, dark ink, a check icon and pressed semantics. Initially only eight starts appear, with an action to reveal the rest. When no common window fits, the inline empty state offers another day, shorter duration or wider search interval.

The proposal fields use native controls with a minimum height (44px). Until a start is chosen, time, title and details are disabled and guidance explains the next action. A valid choice shows a date-and-interval summary and names the person who will confirm it. A conflict uses the existing error pair, names the conflicting commitment and disables sending; stale or updating agendas expose a status notice. Editing the date or details requests a new confirmation.

Invitation history keeps explicit response text and separates incoming response actions from the sender's edit link. Accept and reject appear only for an incoming invitation that is still pending; a detected conflict disables acceptance and explains why. Cancelled, completed and declined invitations have no response buttons. The compact dashboard lists at most two pending invitations, excluding closed states, and says “No hay invitaciones pendientes.” when empty. Rejected proposals remain in history and no longer appear in personal agendas. Mobile history wraps ownership and status metadata rather than clipping it.

### Course sessions

A course is the enclosing visual unit. Its color marker and identity lead, with edit/delete controls aligned at the edge; theory, laboratory and practice sessions remain nested inside. Session metadata has a compact grid, explicit type text and a laboratory icon where applicable. The session editor uses inset fieldsets with native time fields, independent room and teacher inputs, and a small numbered legend.

### Native dialog

The modal uses the native `dialog` element, its title as the accessible name, a close icon and a sticky header. Standard width is in the frontmatter; the wide course editor expands to (720px), and both preserve a viewport margin (28px) and maximum height (90dvh). The body scrolls when needed. A dark backdrop (`#030d1bcc`) separates it from the workspace.

### Calendar and review states

Calendar view selectors use inset segmented controls: a dark group ground, compact buttons, and a raised selected segment. Events use a light ownership tint and retain visible type, title and time; completion adds a line through the title. The parsed-note review groups editable fields in a surface-colored inset panel and prints a human-readable Peru date before its save action.

## Do's and Don'ts

### Do:

- **Do** use the pale blue accent for primary actions, selected destinations and keyboard focus.
- **Do** preserve written owner, session-type and invitation-state labels beside color cues.
- **Do** group each course's sessions within its card and adapt their grid at the evidenced breakpoints.
- **Do** keep native date and time inputs editable and show the Peru time context in review forms.
- **Do** use tonal surfaces for ordinary grouping and reserve the broad shadow for dialogs.
- **Do** keep the five navigation destinations available when the rail becomes the bottom bar.

### Don't:

- **Don't** replace the current interface hierarchy with decorative display type or page-load choreography.
- **Don't** turn editable profile or course colors into application-wide action colors.
- **Don't** add decorative eyebrow text above page or status headings.
- **Don't** replace native controls with nonfunctional visual replicas or icon-font glyphs.
- **Don't** use a drop shadow on every work card.
