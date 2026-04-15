# Compatibility Validation Checklist

This project can be validated repeatedly against the SRS using the checklist below.

## Browsers

- Chrome latest on macOS
- Firefox latest on macOS
- Edge latest on Windows

## Core flows to verify

- Login and logout
- Sidebar collapse/expand
- Dashboard charts render and refresh
- Products CRUD
- Sales CRUD and stage transitions
- Purchase CRUD and stage transitions
- Manufacturing CRUD and completion
- History filter, CSV export, PDF export
- Chatbot launcher and popup

## Responsiveness

- Small-screen page scroll works
- Dialogs scroll on small screens
- Sidebar off-canvas behavior works on mobile widths

## Windows validation

The current implementation work was completed from macOS. Real Windows validation is still a manual QA step and should be completed on a Windows machine before final sign-off.

Recommended manual checks on Windows:

- Edge rendering
- Chrome rendering
- Font rendering and spacing
- Download behavior for CSV/PDF exports
- Print-to-PDF flow from History
- Long-form dialog scrolling
- Dashboard load feel with cold cache

## Performance checkpoints

- Orders with 100+ products complete in under 3 seconds
- Dashboard summary request completes in under 2 seconds
- First-load dashboard chart rendering is visually acceptable on a cold cache
