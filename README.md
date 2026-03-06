# Web Resume Starter

A clean, modern web resume that reads from `resume.json` and exports to PDF using the browser print dialog.

## Files
- `index.html` - main page
- `styles.css` - layout and print styles
- `script.js` - renders the resume from JSON
- `resume.json` - your editable data source

## How to use
1. Open the folder.
2. Run a simple local web server.
3. Open the site in your browser.
4. Click **Export PDF**.

## Quick start
Using Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Updating content
Edit `resume.json` and refresh the page.

## PDF export
Use the **Export PDF** button or the browser print dialog.
Choose:
- Destination: Save as PDF
- Paper size: Letter
- Margins: Default
- Background graphics: On
