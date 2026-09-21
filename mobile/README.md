# Invistimo mobile

Native iOS and Android app for Invistimo, built with React Native and Expo. It uses the existing Invistimo API, users, events, and database. Website cookie login stays on the HttpOnly `authToken` cookie.

## Run

```bash
cd mobile
npm start
```

Then open the project in Expo Go, or run `npm run ios` / `npm run android` for a development build.

Set the API host if you are not using production:

```bash
EXPO_PUBLIC_API_URL=https://www.invistimo.com
```

## What stays in sync

Guests, RSVP, seating assignments, QR check-in, and event details are read and written through the existing website APIs. A guest created here is the same guest record the website shows.

## Contacts import

Inside Add Guests:

- Add guest manually
- Import from contacts
- Import from Excel

Contacts permission is requested only for the import screen. Only contacts the user selects are sent, and only after the preview is confirmed. The full address book is not uploaded or stored.

Email is saved in the guest notes field (`אימייל: ...`) because the existing guest record has name, phone, relation, RSVP, and notes, and does not have a separate email column.

## Auth note

Login still sets the website's HttpOnly `authToken` cookie. Native clients also receive a rotatable mobile refresh token and store both the access JWT and refresh credential in Expo SecureStore, never in AsyncStorage. The app sends `Authorization: Bearer <token>` on later requests. Failed logins never include a token. Face ID / biometrics only unlock the stored session; they do not replace server authentication.

## Device builds

Use EAS profiles in `eas.json`: `development`, `preview` (internal APK / iOS device), and `production`. Do not submit store builds until after real-device approval.
