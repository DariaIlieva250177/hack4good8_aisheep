# ACAPS Community: expert app, website and analyst view

The phone app that experts use, the public website and ACAPS's analyst view, in one React and TypeScript bundle. The app and website read the demo expert's data from `app/data/expert_demo.json`, which `python src/build_demo_data.py` writes. Nothing is saved: anything you do lasts until the page reloads.

```bash
cd frontend
npm install
npm run dev     # website at http://localhost:5173, app at /app, analyst view at /analyst
npm run build
```

The login screen accepts anything: there is no real login yet.

## Where things live

| Path | What |
|---|---|
| `src/analyst/` | ACAPS's analyst view, with its own demo data in `src/analyst/data/analyst-data.json` |
| `src/data/live.ts` | Turns `app/data/expert_demo.json` into the app's risks, chats, alerts and ranking |
| `src/data/api.ts` | The only data entry point for the screens. Replace these functions with server calls later |
| `src/data/families.ts` | Risk family colours and the image for each illustration category |
| `src/i18n/en.ts` | All English text. `src/i18n/translations/` holds French, Spanish, Portuguese and Arabic |
| `src/styles/tokens.css` | Colours, type sizes, soft and glass surfaces |
| `src/mode/` | Lite and rich mode detection and the `lowData` setting |
| `src/config.ts` | `IMAGE_TREATMENT` (`'original'` or `'duotone'`) |
| `public/risk-images/` | One illustration per risk category, named `cat-<category>.jpg` |

## Lite and rich mode

The app always starts in lite mode (system font, no images, blur, waves or metal shapes). It upgrades to rich mode in the background when the connection allows it, and never while someone is typing. The Low-data mode setting in Profile (Auto / On / Off) overrides the detection. It is stored in `localStorage` under `lowData`.

## Routes

Website: `/` home and sign-up, plus web versions of the app pages.

Analyst view, under `/analyst`: `/picture` · `/open` · `/risk/:id` · `/country/:name` · `/approve` · `/connect` · `/track` · `/dashboard` · `/upload`

App, under `/app`: `/login` · `/risks` · `/todo` · `/alerts` · `/community` · `/community/:riskId` · `/ranking` · `/profile` · `/answer/:riskId`
