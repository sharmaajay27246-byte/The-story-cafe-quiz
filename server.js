const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const HOST_PASSWORD = 'The story cafe 7373';

// Bada Question Bank (Funny, Jokes, Countries, Politics & GK mixed)
const allQuestions = [
  { text: "Agar Mosquito ko allergy ho jaye, toh wo kisko kaatega?", options: ["Doctor ko", "Apne ex ko", "Mithai ko", "Kissi ko nahi, wo khud royege"], correct: 1 },
  { text: "India ka Rashtriya Phool (National Flower) kaun sa hai?", options: ["Gulab (Rose)", "Kaml (Lotus)", "Genda (Marigold)", "Chameli (Jasmine)"], correct: 1 },
  { text: "Kis desh ko 'Land of the Rising Sun' kaha jata hai?", options: ["China", "Japan", "Australia", "South Korea"], correct: 1 },
  { text: "Duniya mein sabse zyada election ladne ka record kis desh ke politicians ke naam hai?", options: ["India", "USA", "UK", "Canada"], correct: 0 },
  { text: "Agar Wi-Fi ka password bhool jayein, toh sabse pehla desi tarika kya hota hai?", options: ["Router ko thappad marna", "Modem ko fuk marna", "Padosi se ladna", "Yeh sabhi"], correct: 3 },
  { text: "Eiffel Tower kis desh mein sthit hai?", options: ["Italy", "France", "Germany", "Spain"], correct: 1 },
  { text: "Rajneeti (Politics) mein sabse bada hathiyar kya hota hai?", options: ["Bhashan (Speech)", "Chai ki tapri", "Social media meme", "Yeh sabhi"], correct: 3 },
  { text: "Computer ka dimag (Brain) kise kaha jata hai?", options: ["RAM", "CPU", "Hard Disk", "Keyboard"], correct: 1 },
  { text: "Duniya ka sabse chota desh kaun sa hai?", options: ["Vatican City", "Monaco", "Maldives", "San Marino"], correct: 0 },
  { text: "Agar Sharma ji ka beta fail ho jaye, toh sabse pehle kya hoga?", options: ["Duniya khatam ho jayegi", "Sharma ji news banwayenge", "Padosi khush honge", "Sabhi"], correct: 3 },
  { text: "Cricket World Cup sabse zyada kis desh ne jeeta hai?", options: ["India", "Australia", "West Indies", "England"], correct: 1 },
  { text: "H2O kiska chemical formula hai?", options: ["Hawa", "Paani", "Namak", "Cheeni"], correct: 1 },
  { text: "Kaun sa janwar ulta nahi chal sakta?", options: ["Kangaroo", "Haathi", "Sher", "Cheetah"], correct: 0 },
  { text: "Parliament mein sone wale neta ko kya award milna chahiye?", options: ["Kumbhakaran Trophy", "Best Sleeper", "Gold Medal", "Inme se koi nahi"], correct: 0 },
  { text: "Pyramid kis desh ki pehchan hain?", options: ["Egypt", "Mexico", "Iraq", "Iran"], correct: 0 },
  { text: "Mobile ki battery 1% hone par dimaag ki kya halat hoti hai?", options: ["Rocket jaisi speed", "Heart attack jaisa darr", "Shanti", "Khushi"], correct: 1 },
  { text: "Taj Mahal kis nadi ke kinare sthit hai?", options: ["Mumbai", "Delhi", "Agra", "Jaipur"], correct: 2 },
  { text: "Agar Zomato wala 2 ghante late aaye, toh khana kaisa ho jata hai?", options: ["Garam", "Thanda aur gusse wala", "Aap khud chef ban chuke hote hain", "Gayab"], correct: 2 },
  { text: "Australia ki rajdhani (Capital) kya hai?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: 2 },
  { text: "The Story Cafe Quiz ka asli boss kaun hai?", options: ["Host", "Player", "Aap khud", "Internet"], correct: 2 }
];

let activeQuestions = [];
let gameState = {
  currentQuestionIndex: 0,
  answers: {},
  showingAnswer: false
};

function shuffleQuestions() {
  activeQuestions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 10);
}

shuffleQuestions();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.emit('question-update', getQuestionData());

  socket.on('submit-answer', (optionIndex) => {
    gameState.answers[socket.id] = optionIndex;
    io.emit('answer-count', Object.keys(gameState.answers).length);
  });

  socket.on('next-question', () => {
    if (gameState.currentQuestionIndex < activeQuestions.length - 1) {
      gameState.currentQuestionIndex++;
      gameState.answers = {};
      gameState.showingAnswer = false;
      io.emit('question-update', getQuestionData());
    }
  });

  socket.on('reveal-answer', () => {
    gameState.showingAnswer = true;
    io.emit('reveal-answer', activeQuestions[gameState.currentQuestionIndex].correct);
  });

  socket.on('reset-game', () => {
    shuffleQuestions();
    gameState = { currentQuestionIndex: 0, answers: {}, showingAnswer: false };
    io.emit('question-update', getQuestionData());
  });
});

function getQuestionData() {
  const q = activeQuestions[gameState.currentQuestionIndex];
  return {
    index: gameState.currentQuestionIndex + 1,
    total: activeQuestions.length,
    question: q.text,
    options: q.options,
    correctAnswer: q.correct
  };
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
