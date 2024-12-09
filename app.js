const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app); // Creates an HTTP server using the express app
const io = socket(server); // Initializes socket.io with the HTTP server

const chess = new Chess(); // Creates a new chess game instance
const players = { white: null, black: null }; // Tracks the connected players (White and Black)

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

// Socket.IO connection event
io.on("connection", (socket) => {
  console.log("User connected:", socket.id); // Logs when a user connects

  // Assign player roles (White or Black)
  if (!players.white) {
    players.white = socket.id; // If no one is playing white, assign this user to white
    socket.emit("playerRole", "w"); // Sends role "w" (white) to the player
  } else if (!players.black) {
    players.black = socket.id; // If no one is playing black, assign this user to black
    socket.emit("playerRole", "b"); // Sends role "b" (black) to the player
  } else {
    socket.emit("spectatorRole"); // If both players are already assigned, make this user a spectator
  }

  // Handle player disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    if (players.white === socket.id) players.white = null;
    if (players.black === socket.id) players.black = null;
  });

  // Handle moves from clients
  socket.on("move", (move) => {
    try {
      const playerColor = players.white === socket.id ? "w" : "b"; // Determine the player's color (white or black)

      // Check if it's the player's turn
      if (chess.turn() !== playerColor)
        return socket.emit("errorMessage", "apni turn ka wait kro!");

      // Promote pawns to queens when reaching the last rank
      if (
        !move.promotion &&
        chess.get(move.from).type === "p" &&
        (parseInt(move.to[1], 10) === 8 || parseInt(move.to[1], 10) === 1)
      ) {
        move.promotion = "q"; // Automatically promote pawn to queen
      }

      // Execute the move and check if it's valid
      const result = chess.move(move);
      if (result) {
        io.emit("move", move); // Broadcast the move to all connected clients
        io.emit("boardState", chess.fen()); // Broadcast the updated board state (in FEN format)
        handleGameStatus(playerColor); // Check and broadcast the game status (checkmate, check, draw)
      } else {
        socket.emit("errorMessage", "khelna nhi ata?!");
      }
    } catch (error) {
      console.error("Move error:", error);
      socket.emit("errorMessage", "kuch error aya hai");
    }
  });
});

// Function to handle the game status (check, checkmate, draw)
const handleGameStatus = (playerColor) => {
  if (chess.isCheckmate()) {
    io.emit(
      "gameStatus",
      `${playerColor === "w" ? "White" : "Black"} ko checkmated!`
    ); // Notifies when a player is checkmated
  } else if (chess.isCheck()) {
    io.emit(
      "gameStatus",
      `${playerColor === "w" ? "Black" : "White"} ko check!`
    );
  } else if (chess.isDraw()) {
    io.emit("gameStatus", "koi nhi jeetaa!");
  }
};

server.listen(3000, () => {
  console.log("chl gya server bhai idhar -> http://localhost:3000");
});
