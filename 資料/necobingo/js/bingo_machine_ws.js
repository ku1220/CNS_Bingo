bmAcid = "";
bmIsConnected = false;

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
    //    console.log("onmessage : " + ev.data);

        // サーバー接続OK
        if( msg.message === 'connected' && !bmIsConnected){
            bmAcid=msg.acid;

            bmIsConnected = true;

            // サーバーにメッセージ送信
            var msg = {
                message : 'machine_connect',
                acid : bmAcid,
                cardurl : bmBingoCardURL
                };
            websocket.send(JSON.stringify(msg));
        }
        // ビンゴマシーン登録OK
        else if(msg.message === 'machine_connect'){
            var clientURL = bmBingoCardURL + "?acid=" + bmAcid;
            console.log(clientURL);

            // QRコード作成
            var qrcodeArea = document.createElement("div");
            qrcodeArea.id = "qr_area";
            document.getElementById("bingoQR").appendChild(qrcodeArea);

            jQuery('#qr_area').qrcode({width:120 * bmDisplayRatio, height:120 * bmDisplayRatio, text:clientURL});

            entry();
        }
        else if(msg.message === 'reset_game'){
        }
        // ビンゴ開始OK
        else if(msg.message === 'start_game'){
            drawNumber();
        }
        // 現在のステータス受信
        else if(msg.message === 'state'){
            document.getElementById("bingoEntry").textContent = msg.entry_cnt;
            document.getElementById("bingoLizhi").textContent = msg.lizhi_cnt;
            
            // ゲーム中でない場合は以降の処理はおこなわない
            if(bmMachineStatus === MACHINE_STATUS_STOP || bmMachineStatus === MACHINE_STATUS_ENTRY){
                return;
            }
            
            // ゲーム終了フラグ
            var isEndFlag = 0;
            var bingoCardNum = 0;
            for(var ranking in msg.ranking){
                // ３位でビンゴした人がいればゲーム終了する
                if(ranking === "3"){
                    isEndFlag = 1;
                }
                bingoCardNum += msg.ranking[ranking].length;
                
                // ビンゴしたカードNoをビンゴ結果に表示する
                var cnt = 4;
                if(msg.ranking[ranking].length < cnt) cnt = msg.ranking[ranking].length;
                for(var i = 0; i < cnt; i++){
                    document.getElementById("bingoRanking" + ranking + "-" + (i+1)).textContent = msg.ranking[ranking][i];
                }
            }
            
            // 参加した人全員がビンゴになればゲーム終了
            if(bingoCardNum >= msg.entry_cnt){
                isEndFlag = 1;
            }
            
            if(isEndFlag === 1){
                bmIsStop = true;
            }
            
            // ビンゴになったカードが一定数を超えたらゲーム終了
//            var endNum = 3
//            if(msg.entry_cnt < endNum){
//                endNum = msg.entry_cnt;
//            }
//            if(bingoCardNum >= endNum){
//                isStop = true;
//            }
        }
        else if(msg.message === 'machine_upperlimit'){
            alert("ビンゴマシーンの同時起動数上限に達しています。\nしばらく後に再度アクセスしてください。");
        }
    };

    websocket.onopen  = function(ev){};
    websocket.onerror = function(ev){
        alert("サーバーとの接続に失敗しました。(websocket err)");
    }; 
    websocket.onclose = function(ev){
    };                
}

function closeWebSocket(){
    websocket.close();
}
