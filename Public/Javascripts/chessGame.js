// Connect to Socket.IO server
const socket = io();

// Initialize Chess engine
const chess = new Chess();

// DOM elements
const boardElement = document.querySelector(".chessboard");
const statusBanner = document.getElementById("status-banner");
const statusText = document.getElementById("status-text");
const statusIcon = document.getElementById("status-icon");
const whiteStatus = document.getElementById("white-status");
const blackStatus = document.getElementById("black-status");
const opponentTurnIndicator = document.getElementById("opponent-turn-indicator");
const playerTurnIndicator = document.getElementById("player-turn-indicator");
const opponentBadge = document.getElementById("opponent-badge");
const playerBadge = document.getElementById("player-badge");
const opponentName = document.getElementById("opponent-name");
const playerName = document.getElementById("player-name");
const opponentAvatar = document.getElementById("opponent-avatar");
const playerAvatar = document.getElementById("player-avatar");
const opponentCaptured = document.getElementById("opponent-captured");
const playerCaptured = document.getElementById("player-captured");
const moveHistoryBody = document.getElementById("move-history-body");
const moveHistoryContainer = document.getElementById("move-history-container");
const emptyHistory = document.getElementById("empty-history");
const moveCount = document.getElementById("move-count");
const btnFlip = document.getElementById("btn-flip");
const btnReset = document.getElementById("btn-reset");
const btnSoundToggle = document.getElementById("btn-sound-toggle");
const soundIcon = document.getElementById("sound-icon");
const promotionModal = document.getElementById("promotion-modal");
const promotionOptions = document.getElementById("promotion-options");
const toastContainer = document.getElementById("toast-container");

// State
let playerRole = null; // 'w', 'b', or null (spectator)
let isFlipped = false;
let selectedSquare = null;
let legalMoves = [];
let lastMove = null;
let moveHistory = []; // Array of move strings
let soundEnabled = true;
let pendingPromotion = null;

// Sound Synthesizer using Web Audio API
class ChessAudio {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playMove() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  playCapture() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(70, now + 0.12);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  playCheck() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.linearRampToValueAtTime(840, now + 0.15);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  playGameOver() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    [440, 554, 659].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + i * 0.1;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  }

  playError() {
    if (!soundEnabled) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.15);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }
}

const audio = new ChessAudio();

// Toast Notifications System (Replaces alert())
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  const bgColors = {
    info: "bg-zinc-800/95 border-zinc-700 text-zinc-100",
    success: "bg-emerald-950/90 border-emerald-600/50 text-emerald-100",
    warning: "bg-amber-950/90 border-amber-600/50 text-amber-100",
    error: "bg-rose-950/90 border-rose-600/50 text-rose-100",
  };

  const icons = {
    info: "ℹ️",
    success: "🎉",
    warning: "⚠️",
    error: "❌",
  };

  toast.className = `pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium transition-all duration-300 transform translate-y-3 opacity-0 ${bgColors[type] || bgColors.info}`;
  toast.innerHTML = `
    <span class="text-base">${icons[type] || icons.info}</span>
    <span class="flex-1">${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger smooth enter animation
  requestAnimationFrame(() => {
    toast.classList.remove("translate-y-3", "opacity-0");
    toast.classList.add("translate-y-0", "opacity-100");
  });

  // Auto remove after 4.5 seconds
  setTimeout(() => {
    toast.classList.add("translate-y-3", "opacity-0");
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 4500);
}

// Unicode pieces map (Fixed black pawn)
const getPieceUnicode = (type, color) => {
  const pieces = {
    w: { p: "♙", n: "♘", b: "♗", r: "♖", q: "♕", k: "♔" },
    b: { p: "♟", n: "♞", b: "♝", r: "♜", q: "♛", k: "♚" },
  };
  return pieces[color]?.[type] || "";
};

// Board state tracking for animations
let isBoardInitialized = false;
let pieceElements = [];

// Initialize static board squares (created once)
const initBoard = () => {
  boardElement.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isLight = (r + c) % 2 === 0;

      const squareElement = document.createElement("div");
      squareElement.classList.add("square", isLight ? "light" : "dark");
      squareElement.dataset.index = `${r}-${c}`;

      // Drag and Drop listeners
      squareElement.addEventListener("dragover", (e) => e.preventDefault());
      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        const fromSquare = e.dataTransfer.getData("text/plain");
        if (fromSquare && squareElement.dataset.square) {
          attemptMove(fromSquare, squareElement.dataset.square);
        }
      });

      // Square click listener
      squareElement.addEventListener("click", (e) => {
        if (e.target === squareElement || e.target.classList.contains("move-hint")) {
          if (squareElement.dataset.square) {
            handleSquareClick(squareElement.dataset.square);
          }
        }
      });

      boardElement.appendChild(squareElement);
    }
  }
};

// Update square notations & coordinates based on isFlipped
const updateBoardSquares = () => {
  const squares = boardElement.querySelectorAll(".square");
  squares.forEach((sq, idx) => {
    const r = Math.floor(idx / 8);
    const c = idx % 8;

    // Files: White view = a..h (c=0 is 'a'), Black view = h..a (c=0 is 'h')
    const fileChar = isFlipped ? String.fromCharCode(104 - c) : String.fromCharCode(97 + c);
    // Ranks: White view = 8..1 (r=0 is 8), Black view = 1..8 (r=0 is 1)
    const rankNum = isFlipped ? 1 + r : 8 - r;
    const squareNotation = `${fileChar}${rankNum}`;

    sq.dataset.square = squareNotation;

    // Rank label on leftmost column (c === 0)
    let rankLabel = sq.querySelector(".coord-rank");
    if (c === 0) {
      if (!rankLabel) {
        rankLabel = document.createElement("span");
        rankLabel.className = "coord-rank";
        sq.appendChild(rankLabel);
      }
      rankLabel.textContent = `${rankNum}`;
    } else if (rankLabel) {
      rankLabel.remove();
    }

    // File label on bottom row (r === 7)
    let fileLabel = sq.querySelector(".coord-file");
    if (r === 7) {
      if (!fileLabel) {
        fileLabel = document.createElement("span");
        fileLabel.className = "coord-file";
        sq.appendChild(fileLabel);
      }
      fileLabel.textContent = fileChar;
    } else if (fileLabel) {
      fileLabel.remove();
    }
  });
};

// Render chessboard and animate pieces
const renderBoard = () => {
  if (!isBoardInitialized) {
    initBoard();
    isBoardInitialized = true;
  }

  // Update square notations and labels based on orientation
  updateBoardSquares();

  const board = chess.board();

  // Check for King in check
  let checkKingSquare = null;
  if (chess.in_check && chess.in_check()) {
    const checkedTurn = chess.turn();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === "k" && p.color === checkedTurn) {
          checkKingSquare = `${String.fromCharCode(97 + c)}${8 - r}`;
        }
      }
    }
  }

  // Update Squares (highlights and move hints)
  const squares = boardElement.querySelectorAll(".square");
  squares.forEach((sq) => {
    const squareNotation = sq.dataset.square;

    // Clear old highlights
    sq.classList.remove("last-move", "selected", "in-check");

    // Apply new highlights
    if (lastMove && (lastMove.from === squareNotation || lastMove.to === squareNotation)) {
      sq.classList.add("last-move");
    }
    if (selectedSquare === squareNotation) {
      sq.classList.add("selected");
    }
    if (checkKingSquare === squareNotation) {
      sq.classList.add("in-check");
    }

    // Move hints
    const oldHint = sq.querySelector(".move-hint");
    if (oldHint) oldHint.remove();

    const legalMove = legalMoves.find((m) => m.to === squareNotation);
    if (legalMove) {
      const isCapture = !!legalMove.captured || !!chess.get(squareNotation);
      const hintIndicator = document.createElement("div");
      hintIndicator.className = isCapture ? "capture-indicator move-hint" : "move-indicator move-hint";
      sq.appendChild(hintIndicator);
    }
  });

  // Reconcile and Animate Pieces
  const newPieces = [];
  board.forEach((row, rowIndex) => {
    row.forEach((piece, colIndex) => {
      if (piece) {
        newPieces.push({
          ...piece,
          square: `${String.fromCharCode(97 + colIndex)}${8 - rowIndex}`,
        });
      }
    });
  });

  const matchedDoms = new Set();

  // Pass 1: Exact matches (unmoved pieces)
  newPieces.forEach((np) => {
    const match = pieceElements.find(
      (dom) =>
        !matchedDoms.has(dom) &&
        dom.dataset.square === np.square &&
        dom.dataset.type === np.type &&
        dom.dataset.color === np.color
    );
    if (match) {
      np.element = match;
      matchedDoms.add(match);
    }
  });

  // Pass 2: Moved pieces
  newPieces.forEach((np) => {
    if (!np.element) {
      const match = pieceElements.find(
        (dom) =>
          !matchedDoms.has(dom) &&
          dom.dataset.type === np.type &&
          dom.dataset.color === np.color
      );
      if (match) {
        np.element = match;
        matchedDoms.add(match);
        np.element.dataset.square = np.square;
      }
    }
  });

  // Pass 3: Pawn promotions
  newPieces.forEach((np) => {
    if (!np.element) {
      const match = pieceElements.find(
        (dom) =>
          !matchedDoms.has(dom) &&
          dom.dataset.type === "p" &&
          dom.dataset.color === np.color
      );
      if (match) {
        np.element = match;
        matchedDoms.add(match);
        np.element.dataset.square = np.square;
        np.element.dataset.type = np.type;
        np.element.textContent = getPieceUnicode(np.type, np.color);
      }
    }
  });

  // Fade out captured/dead pieces
  pieceElements.forEach((dom) => {
    if (!matchedDoms.has(dom)) {
      dom.style.opacity = "0";
      dom.style.transform = "scale(0.5)";
      setTimeout(() => {
        if (dom.parentNode) dom.parentNode.removeChild(dom);
      }, 250);
    }
  });

  pieceElements = [];

  // Update positions for active pieces
  newPieces.forEach((np) => {
    if (!np.element) {
      np.element = document.createElement("div");
      np.element.classList.add("piece", np.color === "w" ? "white" : "black");
      np.element.dataset.square = np.square;
      np.element.dataset.type = np.type;
      np.element.dataset.color = np.color;
      np.element.textContent = getPieceUnicode(np.type, np.color);
      boardElement.appendChild(np.element);

      // Setup interaction listeners
      np.element.addEventListener("dragstart", (e) => {
        const canMove = playerRole === np.element.dataset.color && chess.turn() === playerRole;
        if (!canMove) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", np.element.dataset.square);
        np.element.classList.add("dragging");
        selectSquare(np.element.dataset.square);
      });

      np.element.addEventListener("dragend", () => {
        np.element.classList.remove("dragging");
      });

      np.element.addEventListener("click", () => {
        handleSquareClick(np.element.dataset.square);
      });
    }

    // Set draggable state
    const canMove = playerRole === np.color && chess.turn() === playerRole;
    if (canMove) {
      np.element.classList.add("draggable");
      np.element.draggable = true;
    } else {
      np.element.classList.remove("draggable");
      np.element.draggable = false;
    }

    // Map board square to screen percentages
    const fileCode = np.square.charCodeAt(0);
    const rankNum = parseInt(np.square[1], 10);
    const c = isFlipped ? 104 - fileCode : fileCode - 97;
    const r = isFlipped ? rankNum - 1 : 8 - rankNum;

    np.element.style.left = `${c * 12.5}%`;
    np.element.style.top = `${r * 12.5}%`;
    np.element.style.opacity = "1";
    np.element.style.transform = "scale(1)";

    pieceElements.push(np.element);
  });

  updateCapturedPieces();
};

// Handle square selection for click-to-move
const handleSquareClick = (squareNotation) => {
  if (!playerRole || chess.turn() !== playerRole) {
    if (playerRole && chess.turn() !== playerRole) {
      showToast("Wait for your turn!", "warning");
      audio.playError();
    }
    return;
  }

  // If a piece is already selected and we click a legal move destination
  if (selectedSquare) {
    const isTarget = legalMoves.some((m) => m.to === squareNotation);
    if (isTarget) {
      attemptMove(selectedSquare, squareNotation);
      return;
    }
  }

  // Otherwise, select piece at this square
  const piece = chess.get(squareNotation);
  if (piece && piece.color === playerRole) {
    selectSquare(squareNotation);
  } else {
    clearSelection();
    renderBoard();
  }
};

const selectSquare = (squareNotation) => {
  selectedSquare = squareNotation;
  legalMoves = chess.moves({ square: squareNotation, verbose: true });
  renderBoard();
};

const clearSelection = () => {
  selectedSquare = null;
  legalMoves = [];
};

// Attempt move and handle pawn promotion
const attemptMove = (from, to) => {
  if (!playerRole || chess.turn() !== playerRole) return;

  const piece = chess.get(from);
  if (!piece) return;

  // Check if this move requires pawn promotion
  const targetRank = parseInt(to[1], 10);
  const isPawnPromotion =
    piece.type === "p" &&
    ((piece.color === "w" && targetRank === 8) || (piece.color === "b" && targetRank === 1));

  if (isPawnPromotion) {
    // Show promotion dialog
    pendingPromotion = { from, to };
    showPromotionModal(piece.color);
    return;
  }

  sendMove({ from, to });
};

// Show pawn promotion modal
const showPromotionModal = (color) => {
  promotionOptions.innerHTML = "";
  const promotionPieces = [
    { type: "q", label: "Queen", icon: getPieceUnicode("q", color) },
    { type: "r", label: "Rook", icon: getPieceUnicode("r", color) },
    { type: "b", label: "Bishop", icon: getPieceUnicode("b", color) },
    { type: "n", label: "Knight", icon: getPieceUnicode("n", color) },
  ];

  promotionPieces.forEach((p) => {
    const btn = document.createElement("button");
    btn.className =
      "p-3 rounded-lg bg-zinc-800 hover:bg-emerald-600/30 border border-zinc-700 hover:border-emerald-500 transition flex flex-col items-center gap-1 group";
    btn.innerHTML = `
      <span class="text-3xl filter drop-shadow group-hover:scale-110 transition-transform">${p.icon}</span>
      <span class="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">${p.label}</span>
    `;
    btn.addEventListener("click", () => {
      promotionModal.classList.add("hidden");
      if (pendingPromotion) {
        sendMove({ ...pendingPromotion, promotion: p.type });
        pendingPromotion = null;
      }
    });
    promotionOptions.appendChild(btn);
  });

  promotionModal.classList.remove("hidden");
};

// Send move to server
const sendMove = (move) => {
  clearSelection();
  socket.emit("move", move);
};

// Update captured pieces display
const updateCapturedPieces = () => {
  const fullSet = {
    w: { p: 8, r: 2, n: 2, b: 2, q: 1 },
    b: { p: 8, r: 2, n: 2, b: 2, q: 1 },
  };

  const currentBoard = chess.board();
  const remaining = {
    w: { p: 0, r: 0, n: 0, b: 0, q: 0 },
    b: { p: 0, r: 0, n: 0, b: 0, q: 0 },
  };

  currentBoard.forEach((row) => {
    row.forEach((sq) => {
      if (sq && sq.type !== "k") {
        remaining[sq.color][sq.type]++;
      }
    });
  });

  const capturedByWhite = [];
  const capturedByBlack = [];

  ["p", "n", "b", "r", "q"].forEach((t) => {
    const lostBlack = fullSet.b[t] - remaining.b[t];
    for (let i = 0; i < lostBlack; i++) {
      capturedByWhite.push(getPieceUnicode(t, "b"));
    }
    const lostWhite = fullSet.w[t] - remaining.w[t];
    for (let i = 0; i < lostWhite; i++) {
      capturedByBlack.push(getPieceUnicode(t, "w"));
    }
  });

  // Perspective alignment:
  // If !isFlipped: bottom is White, top is Black.
  // If isFlipped: bottom is Black, top is White.
  if (isFlipped) {
    playerCaptured.textContent = capturedByBlack.join(" ");
    opponentCaptured.textContent = capturedByWhite.join(" ");
  } else {
    playerCaptured.textContent = capturedByWhite.join(" ");
    opponentCaptured.textContent = capturedByBlack.join(" ");
  }
};

// Update top and bottom player cards dynamically to match board perspective
const updatePlayerCards = () => {
  const bottomColor = isFlipped ? "b" : "w";
  const topColor = isFlipped ? "w" : "b";

  // Bottom Player Card setup
  if (playerRole === bottomColor) {
    playerName.textContent = `You (${bottomColor === "w" ? "White" : "Black"})`;
    playerBadge.textContent = bottomColor === "w" ? "White" : "Black";
    playerBadge.className = bottomColor === "w"
      ? "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400"
      : "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300";
    playerAvatar.textContent = bottomColor === "w" ? "♙" : "♟";
  } else if (playerRole === topColor) {
    playerName.textContent = `Opponent (${bottomColor === "w" ? "White" : "Black"})`;
    playerBadge.textContent = bottomColor === "w" ? "White" : "Black";
    playerBadge.className = "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400";
    playerAvatar.textContent = bottomColor === "w" ? "♙" : "♟";
  } else {
    playerName.textContent = `${bottomColor === "w" ? "White" : "Black"} Player`;
    playerBadge.textContent = bottomColor === "w" ? "White" : "Black";
    playerBadge.className = "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400";
    playerAvatar.textContent = bottomColor === "w" ? "♙" : "♟";
  }

  // Top Player Card setup
  if (playerRole === topColor) {
    opponentName.textContent = `You (${topColor === "w" ? "White" : "Black"})`;
    opponentBadge.textContent = topColor === "w" ? "White" : "Black";
    opponentBadge.className = topColor === "w"
      ? "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400"
      : "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300";
    opponentAvatar.textContent = topColor === "w" ? "♙" : "♟";
  } else if (playerRole === bottomColor) {
    opponentName.textContent = `Opponent (${topColor === "w" ? "White" : "Black"})`;
    opponentBadge.textContent = topColor === "w" ? "White" : "Black";
    opponentBadge.className = "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400";
    opponentAvatar.textContent = topColor === "w" ? "♙" : "♟";
  } else {
    opponentName.textContent = `${topColor === "w" ? "White" : "Black"} Player`;
    opponentBadge.textContent = topColor === "w" ? "White" : "Black";
    opponentBadge.className = "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400";
    opponentAvatar.textContent = topColor === "w" ? "♙" : "♟";
  }

  // Turn indicators
  const currentTurn = chess.turn();
  if (currentTurn === bottomColor) {
    playerTurnIndicator.classList.remove("hidden");
    opponentTurnIndicator.classList.add("hidden");
    if (playerRole === bottomColor) {
      playerTurnIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Your Turn';
    } else {
      playerTurnIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400"></span> To Move';
    }
  } else {
    playerTurnIndicator.classList.add("hidden");
    opponentTurnIndicator.classList.remove("hidden");
    if (playerRole === topColor) {
      opponentTurnIndicator.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Your Turn';
    } else {
      opponentTurnIndicator.innerHTML = 'Thinking...';
    }
  }
};

// Append move to Move History Table
const recordMoveHistory = (moveObj) => {
  const history = chess.history();
  const lastMoveSan = history[history.length - 1] || `${moveObj.from}-${moveObj.to}`;

  emptyHistory.style.display = "none";

  const moveNum = Math.ceil(history.length / 2);
  const isWhiteMove = history.length % 2 !== 0;

  if (isWhiteMove) {
    const tr = document.createElement("tr");
    tr.id = `move-row-${moveNum}`;
    tr.className = "hover:bg-zinc-800/40 text-zinc-300";
    tr.innerHTML = `
      <td class="font-bold text-zinc-500 py-1 sm:py-1.5">${moveNum}.</td>
      <td class="font-semibold text-zinc-100 py-1 sm:py-1.5">${lastMoveSan}</td>
      <td class="text-zinc-500 py-1 sm:py-1.5" id="move-black-${moveNum}">...</td>
    `;
    moveHistoryBody.appendChild(tr);
  } else {
    const blackCell = document.getElementById(`move-black-${moveNum}`);
    if (blackCell) {
      blackCell.textContent = lastMoveSan;
      blackCell.className = "font-semibold text-zinc-100 py-1 sm:py-1.5";
    }
  }

  moveCount.textContent = `${history.length} ${history.length === 1 ? "move" : "moves"}`;
  moveHistoryContainer.scrollTop = moveHistoryContainer.scrollHeight;
};

// Reset move history display
const resetMoveHistory = () => {
  moveHistoryBody.innerHTML = "";
  emptyHistory.style.display = "block";
  moveCount.textContent = "0 moves";
};

// Update UI headers, turn indicators, and cards
const updateGameUI = (meta) => {
  const currentTurn = chess.turn();

  // Status banner
  const turnName = currentTurn === "w" ? "White" : "Black";
  statusText.textContent = `${turnName}'s Turn`;
  statusIcon.textContent = currentTurn === "w" ? "♙" : "♟";

  if (chess.in_check && chess.in_check()) {
    statusBanner.className =
      "p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/40 text-xs sm:text-sm font-semibold flex items-center gap-2.5 text-rose-300";
    statusText.textContent = `Check! ${turnName} is under attack.`;
  } else {
    statusBanner.className =
      "p-2.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 text-xs sm:text-sm font-medium flex items-center gap-2.5 text-zinc-200";
  }

  // Update player cards and captured pieces based on perspective
  updatePlayerCards();
  updateCapturedPieces();

  // Connection tags in status box
  if (meta) {
    whiteStatus.textContent = meta.whiteConnected ? "Connected" : "Waiting...";
    whiteStatus.className = meta.whiteConnected
      ? "font-medium text-emerald-400 mt-0.5"
      : "font-medium text-zinc-500 mt-0.5";

    blackStatus.textContent = meta.blackConnected ? "Connected" : "Waiting...";
    blackStatus.className = meta.blackConnected
      ? "font-medium text-emerald-400 mt-0.5"
      : "font-medium text-zinc-500 mt-0.5";
  }
};

// Socket Listeners
socket.on("playerRole", (role) => {
  playerRole = role;
  isFlipped = role === "b";

  showToast(`You are playing as ${role === "w" ? "White (First move)" : "Black"}`, "info");
  renderBoard();
  updateGameUI();
});

socket.on("spectatorRole", () => {
  playerRole = null;
  isFlipped = false;

  showToast("You are viewing match as Spectator", "info");
  renderBoard();
  updateGameUI();
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  renderBoard();
  updateGameUI();
});

socket.on("gameMeta", (meta) => {
  updateGameUI(meta);
});

socket.on("move", (move) => {
  const result = chess.move(move);
  lastMove = move;

  if (result) {
    if (result.captured) {
      audio.playCapture();
    } else {
      audio.playMove();
    }
  }

  recordMoveHistory(move);
  renderBoard();
  updateGameUI();

  if (chess.in_check && chess.in_check()) {
    audio.playCheck();
  }
});

socket.on("errorMessage", (message) => {
  showToast(message, "error");
  audio.playError();
});

socket.on("gameStatus", (status) => {
  if (typeof status === "string") {
    showToast(status, "info");
    return;
  }

  if (status.type === "checkmate") {
    audio.playGameOver();
    showToast(status.message, "success");
    statusBanner.className =
      "p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-sm font-bold flex items-center gap-2.5 text-emerald-300";
    statusText.textContent = status.message;
  } else if (status.type === "check") {
    audio.playCheck();
    showToast(status.message, "warning");
  } else if (status.type === "draw") {
    audio.playGameOver();
    showToast(status.message, "info");
  } else if (status.type === "reset") {
    showToast(status.message, "info");
    lastMove = null;
    clearSelection();
    resetMoveHistory();
  } else if (status.type === "disconnect") {
    showToast(status.message, "warning");
  }
});

// UI Event Handlers
btnFlip.addEventListener("click", () => {
  isFlipped = !isFlipped;
  renderBoard();
  updateGameUI();
  showToast(isFlipped ? "Flipped board to Black perspective" : "Flipped board to White perspective", "info");
});

btnReset.addEventListener("click", () => {
  if (confirm("Are you sure you want to restart the game?")) {
    socket.emit("resetGame");
  }
});

btnSoundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundIcon.textContent = soundEnabled ? "🔊" : "🔇";
  showToast(soundEnabled ? "Sound enabled" : "Sound muted", "info");
});

// Initial Render
renderBoard();
updateGameUI();
