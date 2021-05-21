import Card from '../helpers/card';

export default class scoresScene extends Phaser.Scene {
    constructor() {
        super({
            key: 'scoresScene'
        });
    }

    init(data){
        /**   Game   **/
        this.socket = data.server;
        this.id = data.id;
        this.storytellerCard = data.storytellerCard;
        this.story = data.story;
        this.gatheredCards = data.gatheredCards;
        this.cardVotes = data.cardVotes;

        /**   Game Get Username And Game ID   **/
        function getParameterByName(name, url = window.location.href) {
            name = name.replace(/[\[\]]/g, '\\$&');
            var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
                results = regex.exec(url);
            if (!results) return null;
            if (!results[2]) return '';
            return decodeURIComponent(results[2].replace(/\+/g, ' '));
        }
        
        this.username = getParameterByName('username');
        this.gameid = getParameterByName('gameid');
        
    }

    preload() {
        this.load.image('button','src/assets/button-start-game.png');
    }

    create() {
        /**   Game   **/
        let self = this;
        let totalVotes = 0;

        var style = { 
            fontSize: 32,
            fontFamily: 'Arial',
            align: "left",
            color: '#ffffff',
            wordWrap: { width: 250, useAdvancedWrap: true }
        };

        var styleBlackBackground = { 
            fontSize: 32,
            fontFamily: 'Arial',
            align: "left",
            color: '#ffffff',
            backgroundColor: "#413b45",
            wordWrap: { width: 250, useAdvancedWrap: true }
        };

        var styleBold = { 
            fontSize: 30,
            fontFamily: 'Arial',
            align: "left",
            color: '#ffffff',
            wordWrap: { width: 250, useAdvancedWrap: true }
        };

        for(let i=0; i<this.cardVotes.length; i++)
            totalVotes = totalVotes + this.cardVotes[i];

        this.add.rectangle(170, 530, 320, 560,"0x3f51b5");
        let playerCard = new Card(self);
        playerCard.render(170, 250, this.storytellerCard, true).setTint().setScale(1.8, 1.8);
        this.add.text(170, 430, "Votes "+this.cardVotes[0]+"/"+totalVotes, styleBlackBackground);

        for (let j = 0; j < 2; j++)
            for (let i = 0; i < 2; i++) {
                let playerCard = new Card(self);
                if(this.gatheredCards.length > i + j*2 +1){
                    playerCard.render(445 + (i * 225), 230 + 340 * j, this.gatheredCards[i + j*2+1], true).setTint();
                    this.add.text(405 + (i * 225), 345 + 340 * j, " Votes "+this.cardVotes[i + j*2+1]+"/"+totalVotes+" ", styleBlackBackground);
                }
            }
        
        this.add.text(50, 480, 'This is the card of the storyteller.\nFor the story:', style);
        this.add.text(50, 595, '' + this.story, styleBold).setFontSize(40);

        
    }
}