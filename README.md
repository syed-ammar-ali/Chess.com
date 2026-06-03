<div align="center">

<br/>

# ♟️ Chess.com — but make it real-time

**A multiplayer chess app where two players connect live and play against each other in the browser — powered by WebSockets.**

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)](https://socket.io)
[![Chess.js](https://img.shields.io/badge/Chess.js-779556?style=for-the-badge&logo=lichess&logoColor=white)](https://github.com/jhlywa/chess.js)
[![EJS](https://img.shields.io/badge/EJS-B4CA65?style=for-the-badge&logo=ejs&logoColor=black)](https://ejs.co)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-chess--com-4A90E2?style=for-the-badge&logo=render&logoColor=white)](https://chess-com-4d78.onrender.com)

<br/>

[Features](#-features) · [Live Demo](#-live-demo) · [How It Works](#-how-it-works) · [Getting Started](#-getting-started) · [Known Issues](#-known-issues--roadmap)

<br/>

</div>

---

## 🧠 What Is This?

A real-time, two-player chess game built entirely from scratch using **Node.js**, **Socket.io**, and **chess.js**.

No database. No accounts. No fluff. Just open the link, share it with a friend, and play chess — live, in the browser, with moves syncing instantly over WebSockets.

The first person to connect plays **White**. The second plays **Black**.

---

## ✨ Features

- ⚡ &nbsp; **Real-time Gameplay** — Moves sync instantly between both players via Socket.io
- ♟️ &nbsp; **Full Chess Logic** — Legal move validation, check, checkmate, and draw detection via chess.js
- 👥 &nbsp; **Role Assignment** — First connection → White, second → Black, rest → Spectators
- 👑 &nbsp; **Auto Pawn Promotion** — Pawns reaching the last rank are automatically promoted to Queens
- 📡 &nbsp; **Live Board State** — Board state broadcast in FEN format after every move
- 🔒 &nbsp; **Turn Enforcement** — Server rejects moves played out of turn
- 👁️ &nbsp; **Spectator Mode** — Additional users can watch the game live without interfering

---

## 🚀 Live Demo

> **[https://chess-com-4d78.onrender.com](https://chess-com-4d78.onrender.com)**
>
> ⚠️ Hosted on Render's free tier — may take 30–50 seconds to wake up on first load.
>
> 💡 Open the link in **two separate browser tabs** (or share with a friend) to start a game.

---

## 📸 Screenshots

<div align="center">

### Live Game — Two Players Connected

![Chessboard](/screenshots/dashboard.png)
![Chessboard](/screenshots/blackCheck.png)
![Chessboard](/screenshots/whiteCheck.png)

</div>

---

## 🔄 How It Works

```
Player 1 opens the app
        ↓
Server assigns role: WHITE
        ↓
Player 2 opens the app
        ↓
Server assigns role: BLACK
        ↓
Player 1 drags a piece → move sent to server via WebSocket
        ↓
Server validates move using chess.js
        ↓
Valid? → Broadcast updated board (FEN) to ALL clients
Invalid? → Error sent back only to that player
        ↓
Server checks game status → check / checkmate / draw
        ↓
Status broadcast to all connected clients
```

---

## 🗂️ Project Structure

```
chess.com/
│
├── Public/Javascripts
│   └── chessGame.js         # Static frontend assets (CSS, JS, chessboard UI)
│
├── views/
│   └── index.ejs            # Main game view — renders the chessboard
│
├── app.js                   # Server, Socket.io logic, chess engine
└── package.json
```

---

## ⚙️ Getting Started

### Prerequisites

- **Node.js** v18 or higher

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/syed-ammar-ali/chess.com.git
cd chess.com
```

**2. Install dependencies**

```bash
npm install
```

**3. Start the server**

```bash
npm start
```

**4. Open the game**

Visit **http://localhost:3000** in two separate browser tabs — first tab is White, second is Black.

---

## 🛠️ Tech Stack

| Layer        | Technology             |
| ------------ | ---------------------- |
| Runtime      | Node.js                |
| Framework    | Express.js             |
| Real-time    | Socket.io (WebSockets) |
| Chess Engine | chess.js               |
| Templating   | EJS                    |

---

## ⚠️ Known Issues & Roadmap

### Known Issue — Game Requires Both Players to Be Connected Simultaneously

Currently, the game starts assigning roles the moment a socket connects — there is no waiting/lobby state. This means:

- If only one player is connected, the board renders but the game cannot begin
- If a player disconnects mid-game, their slot opens and the next person to join takes their color — which can break the ongoing game
- There is no reconnection handling

**The fix (planned):**

Implement a lobby system where:

1. Player 1 connects → server holds them in a "waiting" state and shows a _"Waiting for opponent..."_ message
2. Player 2 connects → server pairs both players and emits a `gameStart` event to begin the match
3. On disconnect → emit a `playerDisconnected` event and pause/end the game gracefully

```js
// Rough approach
io.on("connection", (socket) => {
  if (!players.white) {
    players.white = socket.id;
    socket.emit("waiting"); // show waiting screen
  } else if (!players.black) {
    players.black = socket.id;
    io.emit("gameStart"); // both players ready — begin
  }
});
```

---

- [ ] Lobby / waiting room before game starts
- [ ] Disconnect handling and game pause
- [ ] Reconnection support
- [ ] Game timer / clock
- [ ] Move history panel
- [ ] Rematch button

---

## 🤝 Contributing

Issues and pull requests are welcome.
Open an [issue](https://github.com/syed-ammar-ali/chess.com/issues) to report bugs or suggest features.

---

## 👤 Author

**Syed Ammar Ali**

[![GitHub](https://img.shields.io/badge/GitHub-@syed--ammar--ali-181717?style=for-the-badge&logo=github)](https://github.com/syed-ammar-ali)

---

## 📄 License

Distributed under the **ISC License**.

---

<div align="center">
  <br/>
  <sub>Built with Node.js, WebSockets, and the audacity to name it chess.com.</sub>
  <br/><br/>
</div>
