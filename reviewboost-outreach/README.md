# ReviewBoost Outreach Pipeline

Automated lead generation and email outreach for restaurants in Chandigarh and Mohali, India.

## What it does

1. **Scrapes** restaurant leads from Google Places API
2. **Finds** owner emails by crawling restaurant websites
3. **Generates** personalized cold emails using Claude AI (Haiku 4.5)
4. **Sends** a day-0 / day-3 / day-7 follow-up sequence via Brevo

## Setup

### 1. Clone and install

```bash
pip install -r requirements.txt
```

On Windows, double-click **START.bat** instead.  
On Mac/Linux, run `bash start.sh`.

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Where to get it |
|---|---|
| `GOOGLE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) — enable *Places API* |
| `CLAUDE_API_KEY` | [console.anthropic.com](https://console.anthropic.com/) |
| `BREVO_API_KEY` | [app.brevo.com](https://app.brevo.com/) → Settings → API Keys |
| `SENDER_EMAIL` | The email address you send from (must be verified in Brevo) |
| `SENDER_NAME` | Your name (default: Mosim Khan) |

### 3. Run

```bash
python main.py
```

Use the numbered menu to run individual steps or the full pipeline.

## Project structure

```
reviewboost-outreach/
├── models/
│   └── lead.py          # Lead dataclass with 22 typed fields
├── scripts/
│   ├── scraper.py       # Google Places API scraper
│   ├── email_finder.py  # Website email extractor
│   ├── ai_writer.py     # Claude email personalizer
│   └── sender.py        # Brevo SMTP sender + follow-up scheduler
├── utils/
│   ├── logger.py        # Rich + file dual logging
│   ├── validator.py     # Env / email / URL validation
│   └── csv_handler.py   # CSV read/write/latest helpers
├── tests/               # 17 pytest unit tests (all APIs mocked)
├── pipeline.py          # Step orchestrator
├── main.py              # Rich terminal UI (9-option menu)
├── data/                # Auto-created; CSVs saved here
├── logs/                # Auto-created; daily log files
└── .env.example         # Environment variable template
```

## Running tests

```bash
pytest tests/ -v
```

All 17 tests mock external APIs — no real keys required.

## Follow-up sequence

| Day | Action |
|-----|--------|
| 0 | Initial personalized cold email |
| 3 | First follow-up |
| 7 | Final follow-up |

`outreach_status` lifecycle: `not_contacted` → `contacted` → `sequence_complete`  
(or `replied` / `converted` / `unsubscribed` at any point)

## Dry run mode

Menu options 1 and 5 prompt for dry-run mode. With dry run enabled, emails are logged to the console instead of being sent to Brevo.
