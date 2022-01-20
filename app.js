'use strict';

const paraSwapAssetList = require('./core-const/token');
const networks = require('./core-const/ExchangeRouterAddress');
//Set up express
const express = require('express');
const app = express();
const fetch = require('node-fetch');

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

const AppKey = 'SiBwfZ6IYrGp1NgluEbJIMnGH7qKnrPY4OkuTNWatg2JDyO64scddNbd/Q==';
let loginURL = 'https://mwj2g19-group-coursework.azurewebsites.net/api/login';
let registerURL = 'https://mwj2g19-group-coursework.azurewebsites.net/api/register';
let favURL = 'https://mwj2g19-group-coursework.azurewebsites.net/api/addFavouriteCoin';
let getFavURL = 'https://mwj2g19-group-coursework.azurewebsites.net/api/getUserData';
let compareURL = 'https://mwj2g19-group-coursework.azurewebsites.net/api/getCurrencyPrice';



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
    updateUser(socket);
  }
}

//Update a user
function updateUser(socket) {
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

//Handle success messages
function success1(socket, message, halt) {
  console.log('Success: ' + message);
  socket.emit('success', message);
  if (halt) {
    socket.disconnect();
  }
}

//Adding a token to favourites
async function addFav(socket, str) {
  console.log("Adding to favourites");
  let userName = socketsToPlayers.get(socket);

  let user = users.get(userName);
  const Data = { token: user.token, coin: str };

  let response = await callAzure(favURL, Data);
  console.log(response);
  if (response.message == "OK.") {
    success1(socket, "Token added to favourites", false);
    return;
  }
  error(socket, response.message, false);
  return;
}

//Get the favourite tokens of a user
async function getFav(socket) {
  let userName = socketsToPlayers.get(socket);

  let user = users.get(userName);

  const Data = { token: user.token };
  let response = await callAzure(getFavURL, Data);
  console.log(response.output.username);

  socket.emit('fav', response.output.favouriteCurrencyList);
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

    //Add the user
    users.set(json1.username, { name: json1.username, state: 1, favourites: [], page: 1, token: response.token });
    playersToSockets.set(json1.username);
    socketsToPlayers.set(socket, json1.username);

    updateUser(socket);
    return;
  }
  error(socket, response.message, false);
}

//getting the price  from different exchanges
async function compare(socket, json) {
  console.log("Comparing event");


  let results = [];
  for (let dex in networks.BSC) {

    const Data = { from: json.from, to: json.to, router: networks.BSC[dex], decimal: json.decimals };
    console.log(Data);

    let response = await callAzure(compareURL, Data);


    if (response.success) {

      results.push({ dex: dex, price: response.value });
    }
    else {

      results.push({ dex: dex, price: 0 });
    }
  }
  results.sort(function (a, b) {
    return parseFloat(a.price) - parseFloat(b.price);
  });

  socket.emit('result', results);
}


//Disconnect
function handleLogout(socket) {
  if (!socketsToPlayers.has(socket)) {
    console.log('Handling quit');
    return;
  }

  const player = socketsToPlayers.get(socket);
  users.set(player, { name: '', state: 0, favourites: [], page: 1 });
  updateUser(socket);
  users.delete(player);
  socketsToPlayers.delete(socket);
  playersToSockets.delete(player);

}

//Sends the token list to the frontend
function sendTokens(socket) {
  socket.emit('tokens', paraSwapAssetList);

}


//Handle new connection
io.on('connection', socket => {
  console.log('New connection');
  sendTokens(socket);

  //Handle a login event
  socket.on('login', json => {
    handleAuth(json, socket, loginURL);
    //updateAll();
  });

  //Handle a register event
  socket.on('register', json => {
    handleAuth(json, socket, registerURL);
    //updateAll();
  });

  //Handle a logout eent
  socket.on('logout', () => {
    handleLogout(socket);
    //updateAll();
  });

  //Handle add favourite event
  socket.on('addfav', str => {
    addFav(socket, str);
    //updateAll();
  });

  //Handle get favourite event
  socket.on('getfav', () => {
    getFav(socket);
    //updateAll();
  });

  socket.on('compare', json => {
    compare(socket, json);
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
