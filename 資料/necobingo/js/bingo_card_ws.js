bcIsConnected = false;
bcBingoNum = [];

function drawNumber(){
    if(bcState === 'playing' || bcState === 'lizhi'){
        // ヒットしたらスタンプをセット
        for(var i = 1; i <= 5; i++){
            for(var j = 1; j <= 5; j++){
                if(i !== 3 || j !== 3){
                    var item = document.getElementById("bingoItemDiv" + i + j);

                    // 数字がヒット
                    if(item.textContent == bcBingoNum[bcBingoNum.length-1]){
                        var bingoCardDiv = document.getElementById("bingoCard");
                        var stampImg = document.createElement("img");
                        stampImg.id = "bingoStampImg" + i + j;
                        stampImg.width =  60;
                        stampImg.height = 60;
                        stampImg.style.position = "absolute";
                        stampImg.style.top = (172 + 63 * (i-1)) + "px";
                        stampImg.style.left = (4 + 63 * (j-1)) + "px";
                        if(bcStampURL !== ""){
                            stampImg.src = bcStampURL;
                        }
                        else{
                            setServerImageToElement("images/card_stamp.png", stampImg);
                        }
                        bingoCardDiv.appendChild(stampImg);
                    }
                }
            }
        }

        checkLizhi();
        checkBingo();
    }

    // サーバーに状態を送る
    var msg = {
        message : 'card_state',
        acid : bcAcid,
        no : bcCardNo,
        state : bcState
    };
    websocket.send(JSON.stringify(msg));

    if(bcState === 'bingo') bcState = 'end';
}

function initWebSocket(){
    var wsUri   = "wss://" + hostip + "/necobingo/socket/";     
    //create a new WebSocket object.
    try{
        websocket = new WebSocket(wsUri);
    }catch(e){
        alert("申し訳ありません。お使いのブラウザでは動作しません。(websocket err)");
    }

    websocket.onmessage = function(ev) {
        var msg = JSON.parse(ev.data); //PHP sends Json data
       console.log( "onmessage : " + ev.data);

        if(msg.message === 'draw_number'){
            if(bcBingoNum.length > 3){
                bcBingoNum.shift();
            }
            bcBingoNum.push(msg.num);                        
            drawNumber();
            
        }else if( msg.message === 'connected' && !bcIsConnected){
            var msg = {
                message : 'card_connect',
                acid : bcAcid
                };
            websocket.send(JSON.stringify(msg));

            bcIsConnected = true;
    
        }else if(msg.message === 'card_no'){
            bcCardNo = msg.no;
            document.getElementById("bingoCardNoDiv").textContent = bcCardNo;
            bcState = 'playing';

            bcNumsMax = msg.numsMax;
            setPicture();
            
            var msg = {
                message : 'card_state',
                acid : bcAcid,
                no : bcCardNo,
                state : bcState
            };
            websocket.send(JSON.stringify(msg));
            
        }else if( msg.message === 'reset_game'){
            setPicture();
            
            var msg = {
                message : 'card_state',
                acid : bcAcid,
                no : bcCardNo,
                state : bcState
            };
            websocket.send(JSON.stringify(msg));
            
        }else if(msg.message === 'entry_deadline'){
            alert("現在のゲームには参加出来ません。\n現在のゲーム終了後に再度エントリーしてください。");
            
        }else if(msg.message === 'bingo_card_entry_max'){
            alert("参加出来るビンゴカードの上限に達しています。");
            
        }
    };

    websocket.onopen  = function(ev){};
    websocket.onerror = function(ev){}; 
    websocket.onclose = function(ev){};                
}

function closeWebSocket(){
    websocket.close();
}
