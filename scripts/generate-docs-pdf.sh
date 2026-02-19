#!/bin/bash
# Generate PDF from World-Class Dev Template
# Requires: npx md-to-pdf (downloads Puppeteer/Chromium on first run)
# Output: docs/WORLD_CLASS_DEV_TEMPLATE_COMPLETE.pdf
# Copy to Downloads: cp docs/WORLD_CLASS_DEV_TEMPLATE_COMPLETE.pdf ~/Downloads/

set -e
cd "$(dirname "$0")/.."
echo "Generating PDF from docs/WORLD_CLASS_DEV_TEMPLATE_COMPLETE.md ..."
npx --yes md-to-pdf docs/WORLD_CLASS_DEV_TEMPLATE_COMPLETE.md --pdf-options '{"format":"A4","margin":"25mm"}'
OUTPUT="docs/WORLD_CLASS_DEV_TEMPLATE_COMPLETE.pdf"
if [ -f "$OUTPUT" ]; then
  cp "$OUTPUT" "$HOME/Downloads/World_Class_Dev_Template_Complete.pdf"
  echo "Done. PDF saved to: $HOME/Downloads/World_Class_Dev_Template_Complete.pdf"
else
  echo "PDF generation may have failed. Check npx md-to-pdf output."
fi
