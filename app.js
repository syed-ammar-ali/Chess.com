const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app); // Creates an HTTP server using the express app
const io = socket(server); // Initializes socket.io with the HTTP server

let chess = new Chess(); // Creates a new chess game instance
const players = { white: null, black: null }; // Tracks the connected players (White and Black)

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "Public")));

app.get("/", (req, res) => {
  res.render("index");
});

// Helper to assemble current game metadata
const getGameMeta = () => ({
  whiteConnected: !!players.white,
  blackConnected: !!players.black,
  turn: chess.turn(),
  fen: chess.fen(),
  isCheck: chess.isCheck(),
  isCheckmate: chess.isCheckmate(),
  isDraw: chess.isDraw(),
});

// Broadcast current board and meta to all clients
const broadcastState = () => {
  io.emit("boardState", chess.fen());
  io.emit("gameMeta", getGameMeta());
};

// Check and broadcast checkmate/check/draw status
const handleGameStatus = (playerColor) => {
  if (chess.isCheckmate()) {
    const winner = playerColor === "w" ? "White" : "Black";
    io.emit("gameStatus", {
      type: "checkmate",
      winner,
      message: `Checkmate! ${winner} wins the game!`,
    });
  } else if (chess.isCheck()) {
    const checkedColor = chess.turn() === "w" ? "White" : "Black";
    io.emit("gameStatus", {
      type: "check",
      checkedColor,
      message: `Check! ${checkedColor} is in check.`,
    });
  } else if (chess.isDraw()) {
    io.emit("gameStatus", {
      type: "draw",
      message: "Game drawn (Stalemate or insufficient material)!",
    });
  }
};

// Socket.IO connection event
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Send current board state & metadata immediately upon connection
  socket.emit("boardState", chess.fen());
  socket.emit("gameMeta", getGameMeta());

  // Assign player roles (White or Black)
  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
  } else {
    socket.emit("spectatorRole");
  }

  // Update all connected clients with player status
  io.emit("gameMeta", getGameMeta());

  // Handle player disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    let disconnectedRole = null;
    if (players.white === socket.id) {
      players.white = null;
      disconnectedRole = "White";
    } else if (players.black === socket.id) {
      players.black = null;
      disconnectedRole = "Black";
    }

    if (disconnectedRole) {
      io.emit("gameStatus", {
        type: "disconnect",
        message: `${disconnectedRole} player left the match. Waiting for a new opponent...`,
      });
    }

    // If both players left, automatically reset the board
    if (!players.white && !players.black) {
      chess = new Chess();
    }

    io.emit("gameMeta", getGameMeta());
  });

  // Handle manual game reset/restart
  socket.on("resetGame", () => {
    // Only allow players in the game to restart
    if (socket.id === players.white || socket.id === players.black || (!players.white && !players.black)) {
      chess = new Chess();
      broadcastState();
      io.emit("gameStatus", {
        type: "reset",
        message: "New game started! The board has been reset.",
      });
    }
  });

  // Handle moves from clients
  socket.on("move", (move) => {
    try {
      // Determine player color
      let playerColor = null;
      if (players.white === socket.id) playerColor = "w";
      else if (players.black === socket.id) playerColor = "b";

      if (!playerColor) {
        return socket.emit("errorMessage", "Spectators cannot make moves.");
      }

      // Check if it's the player's turn
      if (chess.turn() !== playerColor) {
        return socket.emit("errorMessage", "Wait for your turn!");
      }

      // Safe validation: verify move has from/to and the 'from' square has a piece
      if (!move || !move.from || !move.to) {
        return socket.emit("errorMessage", "Invalid move parameters.");
      }

      const piece = chess.get(move.from);
      if (!piece) {
        return socket.emit("errorMessage", "No piece at starting square.");
      }

      if (piece.color !== playerColor) {
        return socket.emit("errorMessage", "You can only move your own pieces.");
      }

      // Automatically promote pawn to queen if reached last rank and no promotion specified
      const targetRank = parseInt(move.to[1], 10);
      if (
        piece.type === "p" &&
        (targetRank === 8 || targetRank === 1)
      ) {
        move.promotion = move.promotion || "q";
      }

      // Execute move
      const result = chess.move(move);
      if (result) {
        io.emit("move", move); // Broadcast the move to all clients
        broadcastState(); // Broadcast updated FEN and metadata
        handleGameStatus(playerColor); // Check check/checkmate/draw
      } else {
        socket.emit("errorMessage", "Illegal move according to chess rules!");
      }
    } catch (error) {
      console.error("Move error:", error);
      socket.emit("errorMessage", "An error occurred while making the move.");
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chess server running on http://localhost:${PORT}`);
});
