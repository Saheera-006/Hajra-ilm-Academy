# Certificate PDF memory and verification update

## What changed
- Compressed certificate background JPEG and reduced signature PNG, with direct JPEG embedding instead of large lossless PDF image creation.
- Single PDF generation at a time (15-second bounded wait), reduced QR raster dimensions, removed Times-Roman fallback font usage.
- QR verification base URL defaults to `https://hajra-ilm-academy.pages.dev` and supports `APP_PUBLIC_URL` on Render.
- Verification endpoint displays the issued certificate's chosen `display_name` when available.
- Admin manual certificate fallback: upload PDF <= 2 MB for a completed batch, preview, download a verification QR image, then publish. The uploaded PDF is stored in TiDB and served to the student without regenerating it.
- New Flyway migration `V19__manual_certificate_uploads.sql` creates the persistent upload tables. **Do not delete or modify existing migrations.**

## Required configuration
In Render set `APP_PUBLIC_URL=https://hajra-ilm-academy.pages.dev` (no trailing slash). Keep `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and other existing secrets as they were.

## Manual upload verification workflow
1. Select a student in the Admin Certificates batch screen, choose **Upload PDF**.
2. Save the draft. Use **Download QR** to get the verification QR for that draft's certificate code.
3. **Insert that QR image or the URL** `https://hajra-ilm-academy.pages.dev/verify-certificate/<certificate-code>` into the PDF using your PDF editor, and **upload the updated PDF again** for the same student.
4. Preview the PDF and check the student's name and QR. Only then click **Publish PDF**. The verification URL becomes valid once published.
5. The student downloads the uploaded original PDF. The public verifier queries the issued certificate record.

The QR download is a separate image. This memory-safe fallback does not modify the uploaded PDF automatically. Never publish a PDF with the old localhost QR or without the correct code.

## Testing before production
- `cd frontend && npm ci && npm run build` (Node 24.12+ recommended for installed Firebase dependencies).
- `cd backend && mvn test && mvn package` with JDK 17+ and Maven installed.
- Start with a backup of TiDB; verify Flyway V19 applies and the backend starts.
- Test admin draft preview, manual upload and replacement, manual QR, issue, student download, and public verification on the Cloudflare URL.
- Check Render Events/metrics for OOM; test 1, 10, and 100 sequential certificates. **512 MB success is not guaranteed.**
- Verify the browser's API requests stay on the Pages domain and the Cloudflare proxy returns `application/pdf`.

## Validation status
- ZIP structure and frontend JSX syntax checked in the packaging environment.
- Full Java/Maven build and live TiDB/Render end-to-end testing **not performed** here.
- Frontend Vite build could not be completed in this environment because the uploaded Windows `node_modules` lacked the Linux Rollup native binary. Run `npm ci` on your own machine or in Cloudflare CI.
