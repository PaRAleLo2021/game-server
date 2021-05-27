const { SSL_OP_EPHEMERAL_RSA, SSL_OP_SSLEAY_080_CLIENT_DH_BUG } = require('constants');

const server = require('express')();
const http = require('http').createServer(server);
const io = require('socket.io')(http);
let gameDB = new Map();


function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
}

io.on('connection', function (socket) {
    console.log('A user connected: ' + socket.id);

    io.to(socket.id).emit('getGameId');

    socket.on('getGameId', function (gameId ) {

        if(!gameDB.has(gameId)){
            //initialize card numbers array
            let cardNumbers = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18",
            "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36"];
            
            //shuffle
            shuffle(cardNumbers);

            gameDB.set(gameId, {
                playersId: [],
                storyteller: 0,
                playersUsername: [],
                playersCards: [],
                scores: [],
                gatheredCards: [],
                gatheredVotedCards: [],
                waiting: 0,
                storytellerCard: "",
                cardVotes: [],
                storytellerEmitedWaiting: false,
                round: 1,
                cardNumbers: cardNumbers
                
            });
        }

        let game = gameDB.get(gameId);

        game.playersId.push(socket.id);
        game.scores.push(0);
        
    
        if (game.playersId.length === 1) {
            io.to(game.playersId[0]).emit('isPlayerA');
        };
    
        if (game.playersId.length >= 3) {
            io.to(game.playersId[0]).emit('enableStartButton');
        }
        
        gameDB.set(gameId, game);
    });


    socket.on('saveUsername', function (gameId, username) {
        let game = gameDB.get(gameId);
        game.playersUsername.push(username);
        gameDB.set(gameId, game);
    });

    socket.on('dealCards', function (gameId, id) {
        let game = gameDB.get(gameId);
        for (let i=0; i<game.playersId.length; i++) {
            if(game.playersId[i] == id){
                let cards=[];
                for(let j=i*6; j<6*(i+1); j++){
                    cards.push(game.playersCards[j]);
                }
                io.to(game.playersId[i]).emit('dealCards', cards);
            }
        }
        gameDB.set(gameId, game);
    });

    socket.on('startGame', function(gameId, id) {
        let game = gameDB.get(gameId);
        console.log('Game is starting...');
        // initialize game
        game.gatheredCards = ["","","",""];
        game.cardVotes = new Array(game.playersId.length);
        for(let i=0; i < game.playersId.length; i++){
            game.cardVotes[i] = 0;
        }
        for (let i = 0; i < game.playersId.length; i++) {
            if (game.playersId[i] !== id) {
                io.to(game.playersId[i]).emit('startGame');
            }
        }
        game.playersCards = [];
        let cards=[];
        for (let i = 0; i < game.playersId.length; i++) {
            for (let j = 0; j < 6; j++) {
                game.playersCards.push(game.cardNumbers.pop());
            }
            cards = [];
        }
        console.log("All cards added "+ game.playersCards);
        console.log("Cards left: "+ game.cardNumbers.length);
        gameDB.set(gameId, game);
    });

    socket.on('submitStory', function(gameId, story, id) {
        let game = gameDB.get(gameId);
        //console.log('-> story: ' + story + " from player " + id);
        for (let i = 0; i < game.playersId.length; i++) {
            if (game.playersId[i] !== id) {
                io.to(game.playersId[i]).emit('submittedStory', story);
            }
        }
        gameDB.set(gameId, game);
    });

    socket.on('gatherCards', function(gameId, card, id) {
        let game = gameDB.get(gameId);
        // remove card from hand
        for(let i=0; i<game.playersCards.length; i++)
            if(card.includes(game.playersCards[i]))
                game.playersCards[i] = game.cardNumbers.pop();
        for(let i=0; i<game.playersId.length; i++)
            if(game.playersId[i]==id)
                game.gatheredCards[i]=card;
        gameDB.set(gameId, game);
    });

    socket.on('gatherVotedCards', function(gameId, card, id) {
        let game = gameDB.get(gameId);
        for(i=0; i < game.gatheredCards.length; i++){
            if(id === game.playersId[i])
                game.gatheredVotedCards[i]=card;
            if(game.gatheredCards[i] === card)
                game.cardVotes[i]++;
        }
        gameDB.set(gameId, game);
    });

    socket.on('storytellerCard', function(gameId, card) {
        let game = gameDB.get(gameId);
        game.storytellerCard = card;
        gameDB.set(gameId, game);
    });

    socket.on('waiting', function(gameId) {
        let game = gameDB.get(gameId);
        game.waiting++;
        if (game.waiting === game.playersId.length) {
            for (let i = 0; i < game.playersId.length; i++) {
                io.to(game.playersId[i]).emit('cardResults', game.gatheredCards);
            }
            game.waiting = 0;
        }
        gameDB.set(gameId, game);
    });

    socket.on('votedWaiting', function(gameId, id) {
        let game = gameDB.get(gameId);
        if(!game.storytellerEmitedWaiting||id!=game.playersId[game.storyteller]){
            if(id==game.playersId[game.storyteller])
                game.storytellerEmitedWaiting=true;
            game.waiting++;
        }
        console.log("Waiting " + game.waiting + " by " + id);
        if (game.waiting === game.playersId.length) {

            /*** Scoring Logic ***/
            let storytellerVotes = game.cardVotes[game.storyteller];
            if(storytellerVotes===game.playersId.length-1||storytellerVotes===0){
                for(let i=0; i<game.playersId.length; i++){
                    game.scores[i]=game.scores[i]+2;
                }
                game.scores[game.storyteller]=game.scores[game.storyteller]-2;
            }
            else{
                for(let i=0; i<game.playersId.length; i++){
                    if(i!=game.storyteller&&game.storytellerCard===game.gatheredVotedCards[i])
                        game.scores[i]=game.scores[i]+3;
                }
                game.scores[game.storyteller]=game.scores[game.storyteller]+3;
            }
            for(let i=0; i<game.playersId.length; i++)
                if(i!==game.storyteller)
                    game.scores[i]= game.scores[i]+game.cardVotes[i];
        
            for(let i=0; i < game.playersId.length; i++){
                game.gatheredVotedCards[i] = "";
            }

            for (let i = 0; i < game.playersId.length; i++) {
                io.to(game.playersId[i]).emit('voteResults', {storytellerCard: game.storytellerCard, gatheredCards: game.gatheredCards, cardVotes: game.cardVotes});
            }
            game.waiting = 0;
            game.storytellerEmitedWaiting=false;
        }
        gameDB.set(gameId, game);
    });

    socket.on('sendScores', function(gameId) {
        let game = gameDB.get(gameId);
        io.to(socket.id).emit('printScores', game.playersUsername, game.scores);
        gameDB.set(gameId, game);
    });

    socket.on('sendRound', function(gameId) {
        let game = gameDB.get(gameId);
        io.to(socket.id).emit('saveRound', game.round);
        gameDB.set(gameId, game);
    });

    socket.on('continue', function(gameId) {
        let game = gameDB.get(gameId);
        let winners = [];
        let winnersId = [];

        for(let i=0; i < game.playersId.length; i++){
            game.cardVotes[i] = 0;
        }
        
        for(let i = 0; i < game.playersId.length; i++) {
            if (game.scores[i] >= 15) {
                winners.push(game.playersUsername[i]);
                winnersId.push(game.playersId[i]);
            }
        }

        if (winners.length >= 1) {
            for (let i = 0; i < game.playersId.length; i++) {
                io.to(game.playersId[i]).emit('endGame', winners, winnersId);
            }
        }
        else {
            game.round++;
            if (game.storyteller == game.playersId.length - 1) {
                game.storyteller = 0;
            }
            else
                game.storyteller = game.storyteller + 1;
        
            console.log("I am storyteller: "+game.playersId[game.storyteller]);

            for (let i = 0; i < game.playersId.length; i++) {
                if (i === game.storyteller) {
                    io.to(game.playersId[i]).emit("continueStoryteller");
                }
                else
                    io.to(game.playersId[i]).emit("continueNormalPlayer");
            }
        }
        gameDB.set(gameId, game);
    });

    socket.on('disconnect', function () {
        console.log('User disconnected: ' + socket.id);
        let gameid;
        let values;
        let i;
        for ([gameid, values] of gameDB) {
            if (values.playersId.includes(socket.id)) { 
                i = values.playersId.indexOf(socket.id);
                break;
            }
        }  
        gameDB.get(gameid).playersId.pop(i);
        gameDB.get(gameid).scores.pop(i);
        gameDB.get(gameid).playersUsername.pop(i);

        if (gameDB.get(gameid).playersId.length === 0) {
            gameDB.delete(gameid);
        }
    });
});

http.listen(3000, function () {
    console.log('Server started!');
});