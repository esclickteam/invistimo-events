# Invistimo mobile

Native iOS and Android app for Invistimo, built with React Native and Expo. It is a separate project from the website and uses the existing Invistimo API, users, events, and database.

The production website in the parent folder is not modified by this app.

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

Login still sets the website's HttpOnly `authToken` cookie. The API also returns that same JWT as `token` in the JSON body after a successful login. The app stores it in secure storage and sends `Authorization: Bearer <token>` on later requests. Failed logins never include a token.
