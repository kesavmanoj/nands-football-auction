# Nand's Football Auction

Bid with friends to build the best 4-4-2 + manager. Ratings stay hidden until every squad is complete.

**Play:** open the GitHub Pages link on each phone. One person taps *Create a room* and shares the 5-letter code; everyone else taps *Join*.

## How it works
- Plain HTML + JavaScript, hosted free on GitHub Pages. No build step.
- The host's browser runs the game. Other phones connect straight to it (WebRTC via the free PeerJS signalling server).
- Nothing is stored anywhere: no accounts, no database. Close the host tab and the game is gone.
- Player photos load from Wikipedia and only free-licence images from Wikimedia Commons are used (credits on the results screen).
- Optional AI pundit: the host pastes a free Groq API key in the lobby. It stays in the host's browser and only goes to Groq. Without it, a built-in formula scores the game.

## Files
| File | What it is |
| --- | --- |
| `index.html`, `style.css` | Page and styling |
| `app.js` | Rooms, lobby, live bidding, reveal, results |
| `engine.js` | Game rules (tiers, bids, timer, unsold rule, chemistry, scoring) |
| `db.js` | Player database: name, position, prime club, league, nation, prime years, rating |
| `photos.js` | Wikimedia photo lookup and credits |
| `judge.js` | AI pundit (Groq) |

To add or edit players, change the lines in `db.js`.
