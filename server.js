const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const HOST_PASSWORD = 'The story cafe 7373'; // Yahan apna host password badal sakte hain

// Sample Questions
const questions = [
  {
    text: 'India ka Rashtriya Phool (National Flower) kaun sa hai?',
    options: ['Gulab (Rose)', 'Kamal (Lotus)', 'Genda (Marigold)', 'Champa'],
    correct: 1
  },
  {
    text: 'Taj Mahal kis shahar mein sthit hai?',
    options: ['Mumbai', 'Delhi', 'Agra', 'Jaipur'],
    correct: 2
  },
  {
    text: 'Computer ka dimag (Brain) kise kaha jata hai?',
    options: ['Monitor', 'Keyboard', 'CPU', 'Mouse'],
    correct: 2
  }
];

// Game State
let state = {
  cafe: 'The Story Cafe',
  phase: 'lobby', // lobby, question, reveal, finished
  qNum: 0,
  total: questions.length,
  playerCount: 0,
  names: [],
  question: null,
  correct: 0,
  answeredCount: 0,
  playersList: [], // { id, name, score, socketId }
  leaderboard: [],
  winners: []
};

// Static files serve karne ke liye (index.html aur host.html ke liye)
app.use(express.static(path.join(__dirname)));

io.on('connection', (socket) => {
  let userRole = 'player';
  let playerId = null;

  // State update sabhi ko bhejne ke liye
  function broadcastState() {
    state.playerCount = state.playersList.length;
    state.names = state.playersList.map(p => p.name);
    io.emit('state', state);
  }

  socket.emit('state', state);

  // --- HOST EVENTS ---
  socket.on('host:login', (pw, callback) => {
    if (pw === HOST_PASSWORD) {
      userRole = 'host';
      socket.emit('state', { ...state, role: 'host' });
      if (typeof callback === 'function') callback({ ok: true });
    } else {
      if (typeof callback === 'function') callback({ ok: false });
    }
  });

  socket.on('host:start', (callback) => {
    if (state.playersList.length === 0) {
      if (typeof callback === 'function') callback({ ok: false, error: 'Kam se kam 1 player zaroori hai' });
      return;
    }
    state.phase = 'question';
    state.qNum = 1;
    state.answeredCount = 0;
    const q = questions[0];
    state.question = { text: q.text, options: q.options };
    state.correct = q.correct;
    
    // Reset player answers tracking
    state.playersList.forEach(p => p.hasAnswered = false);

    broadcastState();
    if (typeof callback === 'function') callback({ ok: true });
  });

  socket.on('host:skip', () => {
    if (state.phase === 'question') {
      // Reveal answer phase
      state.phase = 'reveal';
      updateLeaderboard();
      broadcastState();
    } else if (state.phase === 'reveal') {
      // Next question or finish
      if (state.qNum < questions.length) {
        state.qNum++;
        state.phase = 'question';
        state.answeredCount = 0;
        const q = questions[state.qNum - 1];
        state.question = { text: q.text, options: q.options };
        state.correct = q.correct;
        state.playersList.forEach(p => p.hasAnswered = false);
        io.emit('clear_choice');
        broadcastState();
      } else {
        // Finish game & decide winners
        state.phase = 'finished';
        updateLeaderboard();
        
        // Top 3 winners generate
        state.winners = state.leaderboard.slice(0, 3).map((l, index) => ({
          rank: index + 1,
          id: l.id,
          name: l.name,
          score: l.score,
          gift: index === 0 ? 'Free Coffee Voucher' : (index === 1 ? '50% Off on Snacks' : 'Free Pastry'),
          code: 'CAFE-' + Math.floor(1000 + Math.random() * 9000),
          redeemed: false
        }));
        broadcastState();
      }
    }
  });

  socket.on('host:reset', () => {
    state.phase = 'lobby';
    state.qNum = 0;
    state.answeredCount = 0;
    state.question = null;
    state.playersList.forEach(p => p.score = 0);
    state.leaderboard = [];
    state.winners = [];
    io.emit('clear_choice');
    broadcastState();
  });

  socket.on('host:redeem', (code) => {
    const winner = state.winners.find(w => w.code === code);
    if (winner) {
      winner.redeemed = true;
      broadcastState();
    }
  });

  // --- PLAYER EVENTS ---
  socket.on('player:join', (name, callback) => {
    playerId = 'p_' + Math.random().toString(36).substring(2, 9);
    const newPlayer = { id: playerId, name: name, score: 0, socketId: socket.id, hasAnswered: false };
    state.playersList.push(newPlayer);
    
    if (typeof callback === 'function') callback({ ok: true, id: playerId });
    broadcastState();
  });

  socket.on('player:reconnect', (data, callback) => {
    const player = state.playersList.find(p => p.id === data.id);
    if (player) {
      player.socketId = socket.id;
      playerId = player.id;
      if (typeof callback === 'function') callback({ ok: true });
      broadcastState();
    } else {
      if (typeof callback === 'function') callback({ ok: false });
    }
  });

  socket.on('player:answer', (data) => {
    const player = state.playersList.find(p => p.id === data.id);
    if (player && !player.hasAnswered && state.phase === 'question') {
      player.hasAnswered = true;
      state.answeredCount++;
      
      if (data.opt === state.correct) {
        player.score += 10; // Sahi jawab par 10 points
      }
      updateLeaderboard();
      broadcastState();
    }
  });

  socket.on('disconnect', () => {
    // Optional: handle disconnection if needed
  });
});

function updateLeaderboard() {
  state.leaderboard = [...state.playersList]
    .sort((a, b) => b.score - a.score)
    .map((p, index) => ({
      rank: index + 1,
      id: p.id,
      name: p.name,
      score: p.score
    }));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});