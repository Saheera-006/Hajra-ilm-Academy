# Hajara Ilm Academy

An online academy for women and girls offering one six-month Islamic Learning Programme (இஸ்லாமியக் கல்விப் பாடத்திட்டம்) in Tamil. Its four learning areas are Holy Quran & Tajweed, Kolkai – Islamic Creed, Sattathittangal & Ethics, and Islamic History.

The React frontend is in `frontend/`. The Spring Boot backend and Flyway migrations are in `backend/`.

## Prerequisites

Java 17 or newer, Maven, Node.js with npm, and MySQL 8.

## Start the backend on Windows

1. Start MySQL. For a fresh setup, provision the MySQL application user with `docs/setup/mysql-setup.sql`, replacing the example password first. The backend creates the database named in `DB_URL` when it is missing and the configured MySQL user has permission to create it. If you already have a database, use your existing connection settings. For an existing `backend/.env`, append `&createDatabaseIfNotExist=true` to the JDBC URL if it already has query parameters, or use `?createDatabaseIfNotExist=true` otherwise.
2. Copy `backend/.env.example` to `backend/.env` if the file does not already exist. Set `DB_URL` to your `jdbc:mysql://...` URL, fill in `DB_USERNAME` and `DB_PASSWORD`, and set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 16 characters. Keep your existing `ADMIN_MFA_ENCRYPTION_KEY` if admin MFA is already configured. The startup script generates a key for a new installation.
3. From the project root, run the trusted project script in CMD:

   ```cmd
   powershell -NoProfile -ExecutionPolicy Bypass -File .\start-backend.ps1
   ```

   The script loads `backend/.env` and runs `mvn spring-boot:run`. If you run Maven directly from `backend/`, first supply those settings as environment variables. Flyway applies pending migrations at startup.

## Start the frontend

The Vite proxy and backend default to port 8081. If you change the backend port, update the proxy target in `frontend/vite.config.js`.

In a separate terminal from the project root:

```cmd
cd frontend
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. Admin login is at `/admin/login` and student login is at `/login`. Complete authenticator setup and save your recovery codes at first admin sign-in. To check a production build locally, stop the dev server, run `npm run build`, then run `npm run preview -- --host 127.0.0.1 --port 5173 --strictPort`.

## Staging and certificates

For HTTPS staging, set `APP_PUBLIC_URL` in `backend/.env` to your public frontend URL. Include that origin in `CORS_ALLOWED_ORIGINS`, set `SESSION_COOKIE_SECURE=true`, and restart the backend. Serve the frontend and route `/api` to Spring Boot through the same public origin.

In the admin panel, generate a certificate draft, review it, and issue it. The student can download the issued PDF from the dashboard. To test verification, download a fresh issued PDF and scan its QR code on a phone. If the public URL changes, update `APP_PUBLIC_URL`, restart the backend, and download a fresh copy. Use dummy data for staging.

## Student verification and recovery

Configure the following in your existing `backend/.env` and restart using
`start-backend.ps1`. If you run Maven directly, export the same environment variables.

- Email uses an authenticated SMTP server with STARTTLS. Set `SMTP_HOST`,
  `SMTP_PORT` (default 587), `SMTP_USERNAME`, `SMTP_PASSWORD` and
  `SMTP_FROM` (an authorized sender address).
On the enrollment page, provide a phone number, enter the six-digit email code
within 15 minutes, then complete demo checkout. After enrollment commits, the portal sends a
welcome email with the student ID. If the welcome email fails to send, the
account still works and the confirmation screen reports the email failure.
On Forgot Password, enter the verified student email address and use the code
within five minutes to set a new password. Twilio credentials are no longer needed.
In **Student → Profile**, students can update their name, age, phone number,
email and password. Use the current password to request an email change or
change the password. An email change takes effect after the student confirms a
code sent to the new address. Password recovery uses the verified address.

## Batch audiences

In **Admin → Content**, Notes, Google Meet, Announcements and Notifications
default to the batch whose registration is open. Choose another batch or
**All enrolled students** from Audience. If registration is closed for every
batch, choose an audience before posting. Existing broadcast records retain
their audience. For private notifications, choose **Individual student** and
search by student ID or name.

## Browser push notifications

1. In Firebase Console, register a Web app in your Firebase project and copy
   its web configuration. In Project settings → Cloud Messaging → Web Push
   certificates, generate a key pair and copy the public VAPID key. Enable
   the FCM Registration API and Firebase Cloud Messaging API in Google Cloud
   if they are disabled.
2. Create `frontend/.env.local` and fill in the public web settings.

   ```dotenv
   VITE_FCM_API_KEY=
   VITE_FCM_PROJECT_ID=
   VITE_FCM_SENDER_ID=
   VITE_FCM_APP_ID=
   VITE_FCM_VAPID_KEY=
   ```

3. Set `FCM_PROJECT_ID` in `backend/.env` to the same Firebase project ID.
   Set `GOOGLE_APPLICATION_CREDENTIALS` to the absolute path of the Firebase
   service account JSON, or provide Application Default Credentials in your
   hosting environment. Keep the credential file outside the project and Git.
4. Restart the backend and frontend. Use localhost for development and HTTPS
   when hosting. On each supported browser or device, sign in as an enrolled
   student, open the bell, select **Enable browser push**, and allow notifications.
5. In **Admin → Notifications**, choose a batch, **All enrolled students**, or
   **Individual student**. Try different audiences with two student accounts
   using separate browser profiles. Check the student bell and test with the
   student tab in the background. The push alert includes the academy name and icon, the admin title, and up to 250 characters of the message.
   The full message appears in the signed-in portal. Push text can be visible
   on device lock screens, including messages sent to one student. The admin send result counts devices that
   Firebase accepted, which does not guarantee that each browser displayed it.
   In-app messages still work with Firebase unconfigured.

After successful enrollment, students can choose **Enable notifications** or
**Maybe later**. The first option takes them to sign-in and brings them to the
dashboard notification prompt. Tapping **Enable notifications** there requests
browser permission and registers the device with the signed-in account.
On iPhone (iOS 16.4+), students must first add the portal to their Home Screen
and open it from the icon.

### Razorpay proxy correction
Controller calls service methods rather than reading fields on the transactional Spring proxy. Existing database and environment variables are unchanged. Run `mvn clean test` in backend (includes RazorpayProxyTest). After deploying, sign in as admin, open Payments and recover existing captured test payments using their matching Razorpay payment IDs. Do not pay again or manually mark rows paid. Confirm student account, receipt and webhook processing before enabling live payments.

### Enrollment CSRF recovery
CSRF tokens are stored in the server session and fetched without caching before writes. Only explicit CSRF-filter rejections are retried once; other failures are not replayed. Deploy backend and frontend together. Keep same-origin Cloudflare API routing and secure session cookies enabled in production. Test with `node --test frontend/tests/csrf.test.mjs` from the project root, and `mvn test` from backend. Verify on the previously affected phone before accepting real payments. If cookies are entirely blocked, enrollment still requires a browser that accepts first-party session cookies.
