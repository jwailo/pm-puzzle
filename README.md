# PM Puzzle

A Property Management themed Wordle game created for Ailo.

## Features

- **Daily Puzzles**: New property management word every day at 12:00 PM
- **User Authentication**: Sign up/sign in system with guest play option
- **Statistics Tracking**: Track wins, streaks, and guess distributions
- **Leaderboards**: Daily fastest times and longest streaks
- **Mobile-First Design**: Fully responsive design optimized for mobile devices
- **Share Results**: Share your puzzle results with custom branding

## How to Play

1. Guess the 5-letter property management word in 6 tries
2. Each guess must be a valid 5-letter word
3. After each guess, tile colors show how close you are:
   - 🟩 **Pink**: Letter is correct and in the right spot
   - 🟨 **Blue**: Letter is in the word but in the wrong spot
   - ⬛ **Gray**: Letter is not in the word

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Storage**: Local Storage (will migrate to Supabase)
- **Hosting**: Vercel
- **Fonts**: Google Fonts (Clear Sans)

## Daily Prizes

Players can win a **$50 MECCA voucher** given to a player daily! Sign up to be eligible for prizes and compete on leaderboards.

## Development

### Local Development
1. Clone the repository
2. Serve the files with a local HTTP server:
   ```bash
   python3 -m http.server 8080
   ```
3. Open `http://localhost:8080` in your browser

### Testing Features
- Use `testWin()` in console to simulate a win
- Use `setTestWord('LEASE')` to set a specific test word
- Use `testAuth()` to reset authentication state

## Deployment

Deployed on Vercel with automatic deployments from the main branch.

## License

Created for Ailo - Property Management Software