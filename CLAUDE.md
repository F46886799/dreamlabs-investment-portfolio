## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

## Design System

Always read DESIGN.md before implementing any UI or styling changes.

**Key principles:**
- Project uses shadcn/ui "new-york" style with OKLCH color space
- All colors defined in frontend/src/index.css as CSS variables
- Primary color: oklch(0.5982 0.10687 182.4689) — trust/professional cyan-blue
- For portfolio dashboard: use amber-600 for stale/warnings, green-600 for success
- Data tables: use `font-mono tabular-nums` for numbers/currency alignment
- All components in frontend/src/components/ui/ — use existing library, don't create duplicates
- Responsive breakpoints: sm(640px), md(768px), lg(1024px), xl(1280px)

Do NOT:
- Create custom CSS classes — use Tailwind utilities only
- Deviate from DESIGN.md colors without explicit approval
- Build new UI components if shadcn/ui or project components exist
- Use non-semantic colors (use primary/destructive/success/warning instead of arbitrary colors)
