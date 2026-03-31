# youtubecron

Automated YouTube keyword research for Latin Branding content strategy.

Runs Mon/Wed/Fri at 7am PDT. Sends a Telegram report with:
- Top trending videos per niche keyword
- View counts and channels
- Video content ideas

## GitHub Secrets Required

| Secret | Value |
|--------|-------|
| `YOUTUBE_API_KEY` | Google Cloud YouTube Data API v3 key |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |

## Manual run
Actions → YouTube Keyword Research → Run workflow
