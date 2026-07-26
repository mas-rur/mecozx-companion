# mecozx companion app

The Next.js companion app for the mecozx T-OLED card — the "read-only
viewport and transaction initiator" described in whitepaper section 5.0.
Runs today against a fully simulated card so you can build/demo the whole
flow before physical hardware exists, and is structured so real hardware
slots in later without touching the UI.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Click **"Tap card to connect"** — this is
running against `SimulatedTransport` by default, an in-memory fake card
with its own keypair, so the whole loop (connect → balances → send →
biometric wait → sign → broadcast) works with zero hardware.

Drop your `font.ttf` into `public/fonts/font.ttf` and it'll automatically
become the display font (see `@font-face` in `app/globals.css`); until
then it falls back to Space Grotesk.

## What's actually wired up

- **Multi-chain balances** — direct public JSON-RPC calls (no Alchemy/
  Infura key) for Ethereum, Base, Polygon, Optimism, Arbitrum, Mantle,
  Zora, plus Solana (`lib/rpc.js`, `lib/chains.js`).
- **Live pricing** — CoinGecko `/simple/price`, no key (`lib/price.js`).
- **T-OLED live preview** (`components/TOLEDCard.jsx`) — shows exactly
  what would be rendered on the physical glass display right now
  (balance, "awaiting tap", "biometric", tx confirmation), driven by the
  same `pushDisplay()` calls that would target the real T-OLED matrix.
- **Send flow** (`components/TransactionModal.jsx`) — builds an unsigned
  transfer, pushes it to the card's display, requests a biometric-gated
  signature, then broadcasts the raw signed tx the card hands back. The
  app never touches or sees a private key at any point.
- **Firmware OTA** (`components/FirmwareUpdate.jsx`) — chunked write
  simulation over the "encrypted NFC tunnel" from whitepaper section 5.0.

## Architecture: the transport boundary

Everything above `lib/secureElement.js` talks to a `MecozxCard` instance
and nothing else — it doesn't know or care whether a real card is
involved. `MecozxCard` in turn delegates to a `HardwareTransport`
(`lib/transport/`), and that's the one seam meant to be swapped out as
real hardware comes online:

- **`SimulatedTransport`** — what runs today. Generates a real keypair
  in its own closure and never exposes it, mirroring the actual security
  boundary the Secure Element is supposed to enforce.
- **`WebNFCTransport`** — a real implementation against the browser
  `NDEFReader` API (Android Chrome/Edge only, HTTPS + user gesture
  required). **Read this file's header comment before relying on it.**
  Web NFC can read/write NDEF records — enough for "wake the card and
  push a display payload" — but it cannot carry raw ISO 7816-4 APDUs.
  That means it's **not sufficient for the actual biometric-gated
  signing exchange**, which needs a true ISO-DEP channel.
- **What signing in production actually needs**: a native NFC bridge —
  Android `IsoDep.transceive()` or iOS CoreNFC's `NFCISO7816APDU`,
  most practically reached via a React Native native module or a
  Capacitor/Expo NFC plugin that exposes raw APDU transceive. Implement
  that against the same `HardwareTransport` interface
  (`lib/transport/HardwareTransport.js`) as e.g. `NativeBridgeTransport`,
  and nothing in `components/` or `app/page.jsx` needs to change.

`lib/transport/HardwareTransport.js` also documents the command set
(`CARD_COMMANDS`) that maps to what the Secure Element firmware will
need to expose as real APDU instructions — `SELECT_APPLET`,
`GET_PUBLIC_KEY`, `PUSH_DISPLAY`, `REQUEST_SIGNATURE`,
`GET_FIRMWARE_INFO`, `OTA_WRITE_CHUNK` — worth syncing with whoever
owns the Secure Element / applet side.

## Known non-issues from `npm audit`

Two transitive `postcss` advisories will show up — both are build-tool
source-map path issues that only matter if you're compiling untrusted
CSS, not a runtime risk for this app. Not worth chasing a Next.js 16
upgrade for right now.
