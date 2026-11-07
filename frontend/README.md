# AI Sheep expert app: mobile UI

The mobile UI for the ACAPS Ground Truth expert panel. It runs on mock data, and the backend comes later.

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173, check at 390 × 844
npm run build
```

## Where things live

| Path | What |
|---|---|
| `src/styles/tokens.css` | Colours, type sizes, soft and glass surfaces |
| `src/data/api.ts` | The only data entry point. These async functions return mock data now; replace their bodies with real calls later |
| `src/data/mock.ts` | Six real ACAPS risks (from `data/risk-radar-export.csv`). Everything else is synthetic |
| `src/data/families.ts` | Risk family colours and the image for each illustration category |
| `src/i18n/en.ts` | All UI text |
| `src/mode/` | Lite / rich mode detection and the `lowData` setting |
| `src/config.ts` | `IMAGE_TREATMENT` (`'original'` or `'duotone'`) |
| `public/risk-images/` | Copies of `UI_Images/`, renamed `cat-<category>.jpg` |

## Lite and rich mode

The app always starts in lite mode (system font, no images, blur, waves or metal shapes). It upgrades to rich mode in the background when the connection allows it, and never while someone is typing. The Low-data mode setting in Profile (Auto / On / Off) overrides the detection. It is stored in `localStorage` under `lowData`.

## Routes

`/` Log in · `/risks` · `/todo` · `/alerts` · `/community` · `/community/:riskId` · `/ranking` · `/profile` · `/answer/:riskId`
