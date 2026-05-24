# Design System

Dokumen ini menjelaskan design system yang digunakan dalam aplikasi AI Learning Plan.

## Overview

Aplikasi menggunakan gaya **Modern Clean** dengan:
- Layout bersih dan spacious
- Subtle shadows dan rounded corners
- Smooth animations dan transitions
- Color palette profesional dengan aksen biru-hijau

## Color Palette

### Primary Colors (Indigo/Slate)

Digunakan untuk text utama, background, dan elemen primer.

| Token | Hex | Usage |
|-------|-----|-------|
| primary-50 | #f8fafc | Lightest background |
| primary-100 | #f1f5f9 | Card backgrounds |
| primary-200 | #e2e8f0 | Borders, dividers |
| primary-300 | #cbd5e1 | Disabled states |
| primary-400 | #94a3b8 | Placeholder text |
| primary-500 | #64748b | Secondary text |
| primary-600 | #475569 | Body text |
| primary-700 | #334155 | Headings |
| primary-800 | #1e293b | Dark text |
| primary-900 | #0f172a | Darkest text |

### Accent Colors (Teal/Cyan)

Digunakan untuk highlights, calls-to-action, dan status.

| Token | Hex | Usage |
|-------|-----|-------|
| accent-50 | #ecfeff | Light accent background |
| accent-100 | #cffafe | Alert badges |
| accent-200 | #a5f3fc | Hover states |
| accent-300 | #67e8f9 | Active states |
| accent-400 | #22d3ee | Links |
| accent-500 | #06b6d4 | Primary accent |
| accent-600 | #0891b2 | Buttons primary |
| accent-700 | #0e7490 | Active buttons |
| accent-800 | #155e75 | Dark accent |

### Status Colors

| Token | Hex | Usage |
|-------|-----|-------|
| success | #10b981 | Task completed |
| warning | #f59e0b | In progress |
| danger | #ef4444 | Overdue |
| info | #3b82f6 | Information |

### Task Type Palette

| Type | Color |
|------|-------|
| acquire | #6366f1 (Indigo) |
| practice | #8b5cf6 (Violet) |
| recall | #ec4899 (Pink) |
| interleave | #14b8a6 (Teal) |
| synthesize | #f97316 (Orange) |
| review | #3b82f6 (Blue) |
| assess | #06b6d4 (Cyan) |
| reflect | #a855f7 (Purple) |

## Typography

### Font Family

- **Primary**: Inter (Google Fonts)
- **Fallback**: system-ui, -apple-system, sans-serif

### Font Weights

| Weight | Value | Usage |
|--------|-------|-------|
| Light | 300 | Decorative |
| Regular | 400 | Body text |
| Medium | 500 | Navigation, card titles |
| Semibold | 600 | Section headings |
| Bold | 700 | Page titles |

### Font Sizes

| Token | Size | Usage |
|-------|------|-------|
| text-xs | 0.75rem | Small captions |
| text-sm | 0.875rem | Labels, metadata |
| text-base | 1rem | Body text |
| text-lg | 1.125rem | Large body |
| text-xl | 1.25rem | Card titles |
| text-2xl | 1.5rem | Section headings |
| text-3xl | 1.875rem | Page headings |
| text-4xl | 2.25rem | Hero text |

## Spacing

Standard spacing scale (Tailwind default):

| Token | Value |
|-------|-------|
| 1 | 0.25rem (4px) |
| 2 | 0.5rem (8px) |
| 3 | 0.75rem (12px) |
| 4 | 1rem (16px) |
| 5 | 1.25rem (20px) |
| 6 | 1.5rem (24px) |
| 8 | 2rem (32px) |
| 10 | 2.5rem (40px) |
| 12 | 3rem (48px) |
| 16 | 4rem (64px) |
| 20 | 5rem (80px) |

## Border Radius

| Token | Value |
|-------|-------|
| rounded | 0.25rem (4px) |
| rounded-md | 0.375rem (6px) |
| rounded-lg | 0.5rem (8px) |
| rounded-xl | 0.75rem (12px) |
| rounded-2xl | 1rem (16px) |
| rounded-3xl | 1.5rem (24px) |
| rounded-full | 9999px |

## Shadows

| Token | Value | Usage |
|-------|-------|-------|
| shadow-sm | 0 1px 2px rgba(0,0,0,0.05) | Cards subtle |
| shadow | 0 1px 3px rgba(0,0,0,0.1) | Default cards |
| shadow-md | 0 4px 6px rgba(0,0,0,0.07) | Modal, dropdown |
| shadow-lg | 0 10px 15px rgba(0,0,0,0.1) | Modals |
| shadow-xl | 0 20px 25px rgba(0,0,0,0.15) | Overlay |

## Components

### Button

Variants:
- `primary` — Solid accent background (Teal)
- `secondary` — White background with border
- `ghost` — No background, minimal
- `danger` — Red for destructive actions

Sizes:
- `sm` — Small (32px height, px-3 py-1.5)
- `md` — Medium (40px height, px-4 py-2)
- `lg` — Large (48px height, px-6 py-3)

```jsx
<Button variant="primary" size="md" onClick={handleClick}>
  Simpan Goal
</Button>
```

### Input

- Full-width text input
- Rounded corners (lg)
- Focus ring (accent color) on focus
- Error state dengan red border
- Label di atas input
- Optional helper text di bawah

```jsx
<Input
  label="Judul Goal"
  placeholder="Misal: Belajar React"
  error={errors.title}
/>
```

### Card

- White background
- Soft shadow
- Rounded corners (2xl)
- Optional hover effect (shadow naik)
- Padding: p-6

```jsx
<div className="bg-white rounded-2xl shadow-soft p-6 hover:shadow-hover transition-shadow">
  <h3 className="text-lg font-semibold">{title}</h3>
</div>
```

### Badge

- Pill-shaped (rounded-full)
- Small text
- Warna sesuai status/task type

```jsx
<Badge variant="success">Completed</Badge>
<Badge variant="warning">In Progress</Badge>
<Badge variant="danger">Overdue</Badge>
```

### StreakBadge

Komponen khusus untuk menampilkan streak belajar:
- Icon api
- Angka streak
- Animasi saat streak bertambah
- Gradien untuk streak tinggi (>7 hari)

### Skeleton

Loading placeholder dengan animasi pulse:
- `Skeleton.Text` — untuk text lines
- `Skeleton.Card` — untuk card placeholder
- `Skeleton.Avatar` — untuk avatar

## Layout

### Container

- Max width: 72rem (1152px)
- Horizontal padding: 1rem (mobile), 1.5rem (tablet), 2rem (desktop)
- Centered dengan mx-auto

### Responsive Breakpoints

| Breakpoint | Min Width |
|------------|-----------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

### Grid System

```jsx
// 3 columns on desktop, 2 on tablet, 1 on mobile
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
```

### Navigation

- **Top navbar**: Fixed, dengan logo dan user menu
- **Sidebar** (desktop): Halaman utama, Goals, Coach, Calendar
- **Bottom nav** (mobile): Navigasi utama di bagian bawah

## Animations

### Transitions

| Transition | Duration | Usage |
|------------|----------|-------|
| transition-colors | 150ms | Button hover |
| transition-shadow | 200ms | Card hover |
| transition-transform | 200ms | Scale on click |
| transition-all | 300ms | Modal open/close |

### Custom Keyframes

```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

### Usage

```jsx
<div className="animate-fade-in">Content</div>
<div className="animate-slide-up">Content</div>
```

## Accessibility

- **Focus states**: Visible focus ring di semua interactive elements
- **Color contrast**: Semua text memenuhi WCAG AA
- **Labels**: Semua input punya label
- **Keyboard navigation**: Modal bisa ditutup dengan Escape
- **Focus trap**: Modal menjebak fokus (useFocusTrap)
- **Screen reader**: ARIA labels untuk icon buttons

## Tailwind Config Notes

Design system diimplementasikan via Tailwind utility classes. Tidak ada custom tailwind.config — menggunakan Tailwind CSS 4 dengan default theme yang sudah mencakup semua token di atas.
