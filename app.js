'use strict';

const paraSwapAssetList = require('./core-const/token');
//Set up express
const express = require('express');
const app = express();
const fetch = require('node-fetch');
const AppKey = 'SiBwfZ6IYrGp1NgluEbJIMnGH7qKnrPY4OkuTNWatg2JDyO64scddNbd/Q==';
//Setup socket.io
const server = require('http').Server(app);
const io = require('socket.io')(server);

//Setup static page handling
app.set('view engine', 'ejs');
app.use('/static', express.static('public'));

//Handle client interface on /
app.get('/', (req, res) => {
  res.render('client');
});

//Player name : player data
let users = new Map();
//Player number : socket
let playersToSockets = new Map();
//Socket : player number
let socketsToPlayers = new Map();


let loginURL = 'https://mwj2g19-group-coursework.azurewebsites.net/api/login';
let registerURL = 'https://mwj2g19-group-coursework.azurewebsites.net/api/register';
let favURL = 'https://mwj2g19-group-coursework.azurewebsites.net/api/addFavouriteCoin';


let nextPlayerNumber = 0;
let lastPlayer = null;
let state = 0;

let token

//Start the server
function startServer() {
  const PORT = process.env.PORT || 8081;
  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

//Update all players
function updateAll() {
  //console.log('Updating all players');
  for (let [playerNumber, socket] of playersToSockets) {
    updatePlayer(socket);
  }
}

//Update one player
function updatePlayer(socket) {
  const playerName = socketsToPlayers.get(socket);
  const theUser = users.get(playerName);
  console.log(theUser);
  socket.emit('auth', theUser);
}

//Handle errors
function error(socket, message, halt) {
  console.log('Error: ' + message);
  socket.emit('fail', message);
  if (halt) {
    socket.disconnect();
  }
}

function success1(socket, message, halt) {
  console.log('Success: ' + message);
  socket.emit('success', message);
  if (halt) {
    socket.disconnect();
  }
}

async function addFav(socket, str) {
  console.log("Adding to favourites");
  let userName = socketsToPlayers.get(socket);

  let user = users.get(userName);
  console.log(user);
  const Data = { token: user.token, coin: str };

  let response = await callAzure(favURL, Data);
  console.log(response);
  if (response.message == "OK.") {
    success1(socket, "Token added to favourites", false);
    return;
  }
  error(socket, response.message, false);
}

//Requesting the API
async function callAzure(Url, Data) {
  const otherPram = {
    headers: { 'x-functions-key': AppKey },
    body: JSON.stringify(Data),
    method: 'POST'
  };

  let response = await fetch(Url, otherPram);
  let users = await response.json();
  const results = await Promise.resolve(users);

  return results;
}



//Register and Login
async function handleAuth(json1, socket, url) {
  console.log("Auth event");

  const Data = json1;

  let response = await callAzure(url, Data);


  if (response.message == "OK.") {
    if (users.get(json1.username) == null) {

    }

    users.set(json1.username, { name: json1.username, state: 1, favourites: [], page: 1, token: response.token });
    playersToSockets.set(json1.username);
    socketsToPlayers.set(socket, json1.username);

    updatePlayer(socket);
    return;
  }
  error(socket, response.message, false);
}



//Disconnect
function handleLogout(socket) {
  if (!socketsToPlayers.has(socket)) {
    console.log('Handling quit');
    return;
  }

  const player = socketsToPlayers.get(socket);
  users.set(player, { name: '', state: 0, favourites: [], page: 1 });
  updatePlayer(socket);
  users.delete(player);
  socketsToPlayers.delete(socket);
  playersToSockets.delete(player);

}


//Handle new connection
io.on('connection', socket => {
  console.log('New connection');

  //Handle on chat message received
  socket.on('chat', message => {
    if (!socketsToPlayers.has(socket)) return;
    handleChat(socketsToPlayers.get(socket), message);
  });

  socket.on('admin', action => {
    if (!socketsToPlayers.has(socket)) return;
    handleAdmin(socketsToPlayers.get(socket), action);
    updateAll();
  });

  socket.on('action', action => {
    if (!socketsToPlayers.has(socket)) return;
    handleAction(socketsToPlayers.get(socket), action);
    updateAll()
  });

  socket.on('join', () => {
    if (socketsToPlayers.has(socket)) return;
    handleJoin(socket);
    updateAll();
  });

  socket.on('login', json => {
    handleAuth(json, socket, loginURL);
    //updateAll();
  });

  socket.on('register', json => {
    handleAuth(json, socket, registerURL);
    //updateAll();
  });

  socket.on('logout', () => {
    handleLogout(socket);
    //updateAll();
  });

  socket.on('addfav', str => {
    addFav(socket, str);
    //updateAll();
  });

  //Handle disconnection
  socket.on('disconnect', () => {
    console.log('Dropped connection');
    //handleLogout(socket);
  });

});

//Start server
if (module === require.main) {
  startServer();
}

module.exports = server;
