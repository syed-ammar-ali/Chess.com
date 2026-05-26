// Connects to the Socket.IO server
const socket = io();

// Creates a new chess game using Chess.js
const chess = new Chess();

// Selects the chessboard element from the HTML
const boardElement = document.querySelector(".chessboard");

// Tracks the player's role (white or black)
let playerRole = null;

// Function to render the chessboard
const renderBoard = () => {
  const board = chess.board(); // Gets the current state of the board
  boardElement.innerHTML = ""; // Clears the chessboard before re-rendering

  // Loops through each row and column of the chessboard
  board.forEach((row, rowIndex) => {
    row.forEach((square, colIndex) => {
      // Creates a new div for each square on the board
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowIndex + colIndex) % 2 === 0 ? "light" : "dark"
      );

      // If there is a piece on this square, create and add it
      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.textContent = getPieceUnicode(square.type, square.color);
        pieceElement.draggable = playerRole === square.color; // Makes the piece draggable only if it's the player's piece

        // Adds event listener for dragging the piece
        pieceElement.addEventListener("dragstart", (e) => {
          e.dataTransfer.setData(
            "text",
            `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`
          ); // Stores the piece's position
        });

        squareElement.appendChild(pieceElement); // Adds the piece to the square
      }

      // Allows the square to accept a piece when dropped
      squareElement.addEventListener("dragover", (e) => e.preventDefault());

      // Handles the drop of a piece onto a square
      squareElement.addEventListener("drop", (e) => {
        handleMove(
          e.dataTransfer.getData("text"),
          `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`
        ); // Moves the piece
      });

      // Adds the square to the board
      boardElement.appendChild(squareElement);
    });
  });
};

// Function to handle a move (when a piece is dragged and dropped)
const handleMove = (from, to) => {
  // If no player role or it's not the player's turn, do nothing
  if (!playerRole || chess.turn() !== playerRole) return;

  // Sends the move to the server via Socket.IO
  socket.emit("move", { from, to });
};

const getPieceUnicode = (type, color) => {
  const pieces = {
    w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
    b: { p: "♙", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
  };
  return pieces[color][type]; // Returns the unicode symbol for the piece
};

// Listens for the player's role (white or black) from the server
socket.on("playerRole", (role) => {
  playerRole = role; // Sets the player's role
  renderBoard(); // Re-renders the board with the correct pieces
});

// Listens for when the user is a spectator
socket.on("spectatorRole", () => {
  playerRole = null; // Clears the player's role if they're a spectator
  renderBoard(); //
});

// Listens for the board state (in FEN format) from the server
socket.on("boardState", (fen) => {
  chess.load(fen); // Loads the board state into the chess game
  renderBoard();
});

// Listens for a move from the server (to update the board state)
socket.on("move", (move) => {
  chess.move(move); // Makes the move on the chess board
  renderBoard(); //
});

socket.on("errorMessage", (message) => {
  alert(message);
});

socket.on("gameStatus", (statusMessage) => {
  alert(statusMessage);
});

renderBoard();
