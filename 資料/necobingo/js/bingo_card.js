
// ビンゴナンバー
var bcNums = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75];        

var hostip = "cnsrd.jp";
if('testDomain' in this){
    hostip = testDomain;
}
var bcBaseURL = "https://" + hostip + "/necobingo";
var jqUrl       = bcBaseURL + "/js/jquery.php";
var jqrUrl      = bcBaseURL + "/js/jqueryqr.php";
var machinewsJsUrl = bcBaseURL + "/js/machinews.php";
var clientwsJsUrl = bcBaseURL + "/js/clientws.php";

var bcAcid = 0;

// カードNo
var bcCardNo = 0;

// カードNo
var bcNumsMax = 0;

// ステータス
// none     :未使用
// playing  :プレイ中
// lizhi    :リーチ
// bingo    :ビンゴ
// end      :ビンゴ通知済
var bcState = 'none';

// スタンプ画像テーブル
var defaultPictureArray = [];

// サーバーへの画像取得リトライ回数
var bcRetryCnt = 0;
var bcRetryCntMax = 100;

// カスタマイズ：ビンゴカード画像のURL
var bcCardURL = "";

// カスタマイズ：絵柄画像テーブル
// key:(ビンゴナンバー - 1) value:URL
var bcPictureArray = [];

// カスタマイズ：ビンゴスタンプ画像のURL
var bcStampURL = "";

// カスタマイズ：ビンゴ達成画像のURL
var bcAchieveURL = "";
var bcAchieveBG1URL = "";
var bcAchieveBG2URL = "";
var bcAchieveBG3URL = "";

// ビンゴ達成の報酬
var bcRewardURL = "http://colecole.jp/";

var BingoCard = {};

BingoCard.setBingoCard = function(url){
    bcCardURL = url;   
}

BingoCard.setBingoStamp = function(url){
    bcStampURL = url;   
}

BingoCard.setBingoAchieve = function(url){
    bcAchieveURL = url;   
}

BingoCard.setBingoAchieveBG1 = function(url){
    bcAchieveBG1URL = url;   
}

BingoCard.setBingoAchieveBG2 = function(url){
    bcAchieveBG2URL = url;   
}

BingoCard.setBingoAchieveBG3 = function(url){
    bcAchieveBG3URL = url;   
}

BingoCard.setRewardURL = function(url){
    bcRewardURL = url;   
}

BingoCard.addPicture = function(url){
    if(bcPictureArray.length < 75){
        bcPictureArray.push(url);
    }
}

window.onload = function() {
    var param = GetQueryString();
    bcAcid = param["acid"];
    
    createBingoCard();
    loadlib();
}

window.onbeforeunload = function(){
  return "本当に離れますか？";
}

function loadlib(){
    // loaddef();
    loadjq();
}    
    
function loaddef(){
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        switch ( req.readyState ) {
            case 4: // データ受信完了.
                if( req.status == 200 || req.status == 304 ) {
                    eval(req.responseText);
                    loadjq();
                    return true;
                } else {    //err
                    return false;
                }
                break;
        }
    };
    req.open("GET", bcBaseURL + "/js/def.php", true);
    req.send("");
}

function loadjq(){
    
    if(typeof jQuery != "undefined"){
        loadws();
        return;
    }
    
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        switch ( req.readyState ) {
            case 4: // データ受信完了.
                if( req.status == 200 || req.status == 304 ) {
                    eval(req.responseText);
                    loadws();
                    return true;
                } else {    //err
                    return false;
                }
                break;
        }
    };
    req.open("GET", jqUrl, true);
    req.send("");
}

function loadws(){
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        switch ( req.readyState ) {
            case 4: // データ受信完了.
                if( req.status == 200 || req.status == 304 ) {
                    eval(req.responseText);
                    initWebSocket();
                    return true;
                } else {    //err
                    return false;
                }
                break;
        }
    };
    req.open("GET", clientwsJsUrl, true);
    req.send("");        
}

function GetQueryString()
{
    var result = {};
    if( 1 < window.location.search.length )
    {
        // 最初の1文字 (?記号) を除いた文字列を取得する
        var query = window.location.search.substring( 1 );

        // クエリの区切り記号 (&) で文字列を配列に分割する
        var parameters = query.split( '&' );

        for( var i = 0; i < parameters.length; i++ )
        {
            // パラメータ名とパラメータ値に分割する
            var element = parameters[ i ].split( '=' );

            var paramName = decodeURIComponent( element[ 0 ] );
            var paramValue = decodeURIComponent( element[ 1 ] );

            // パラメータ名をキーとして連想配列に追加する
            result[ paramName ] = paramValue;
        }
    }
    return result;
}

function createBingoCard(){
    var bingoRoot = document.getElementById("bingoCard");
    bingoRoot.style.position = "relative";
    bingoRoot.style.width = "320px";
    bingoRoot.style.margin = "0 auto";

    var bingoCardImg = document.createElement("img");
    bingoCardImg.id = "bingoCardImg";
    bingoCardImg.width = 320;
    bingoCardImg.height = 560;
    bingoCardImg.style.position = "absolute";
    bingoCardImg.style.top = "0px";
    bingoCardImg.style.left = "0px";
    if(bcCardURL !== ""){
        bingoCardImg.src = bcCardURL;
    }
    else {
        setServerImageToElement("images/card_background.png", bingoCardImg);
    }
    bingoRoot.appendChild(bingoCardImg);

    var bingoCardNoDiv = document.createElement('div');
    bingoCardNoDiv.id = "bingoCardNoDiv";
    bingoCardNoDiv.style.width = "60px";
    bingoCardNoDiv.style.textAlign = "center";
    bingoCardNoDiv.style.fontSize = "x-large";
    bingoCardNoDiv.style.position = "absolute";
    bingoCardNoDiv.style.top = "7px";
    bingoCardNoDiv.style.left = "153px";
    bingoRoot.appendChild(bingoCardNoDiv);

    for(var i = 1; i <= 5; i++){
        for(var j = 1; j <= 5; j++){
            if(i !== 3 || j !== 3){
                var bingoItemImg = document.createElement("img");
                bingoItemImg.id = "bingoItemImg" + i + j;
                bingoItemImg.width = 60;
                bingoItemImg.height = 60;
                bingoItemImg.style.position = "absolute";
                bingoItemImg.style.top = (172 + 63 * (i-1)) + "px";
                bingoItemImg.style.left = (4 + 63 * (j-1)) + "px";
                bingoRoot.appendChild(bingoItemImg);

                var bingoItemDiv = document.createElement("div");
                bingoItemDiv.id = "bingoItemDiv" + i + j;
                bingoItemDiv.style.display = "none";
                bingoRoot.appendChild(bingoItemDiv);
            }
        }
    }
}

function setPicture(){
    bcRetryCnt = 0;
    bcState = 'playing';
    
    // ビンゴ達成時画像を削除する
    var achieveBG1Div = document.getElementById("bingoAchieveBG1");
    if(achieveBG1Div){
        achieveBG1Div.parentNode.removeChild(achieveBG1Div);
    }
    var achieveBG2Div = document.getElementById("bingoAchieveBG2");
    if(achieveBG2Div){
        achieveBG2Div.parentNode.removeChild(achieveBG2Div);
    }
    var achieveBG3Div = document.getElementById("bingoAchieveBG3");
    if(achieveBG3Div){
        achieveBG3Div.parentNode.removeChild(achieveBG3Div);
    }
    var achieveDiv = document.getElementById("bingoAchieveDiv");
    if(achieveDiv){
        achieveDiv.parentNode.removeChild(achieveDiv);
    }
    
    // スタンプ画像を削除する
    for(var i = 1; i <= 5; i++){
        for(var j = 1; j <= 5; j++){
            if(i !== 3 || j !== 3){
                var stampImg = document.getElementById("bingoStampImg" + i + j);
                if(stampImg){
                    stampImg.parentNode.removeChild(stampImg);
                }
            }
        }
    }        
    
    var bcNumsTmp = [];
    for(var i = 0; i < bcNumsMax; i++){
        bcNumsTmp.push(bcNums[i]);
    }
    
    for(var i = 1; i <= 5; i++){
        for(var j = 1; j <= 5; j++){
            if(i !== 3 || j !== 3){
                var bingoItemImg = document.getElementById("bingoItemImg" + i + j);
                
                var rnd = Math.floor(Math.random() * bcNumsTmp.length);
                var no = bcNumsTmp[rnd];
                if(bcNumsMax >= 24){
                    bcNumsTmp.splice(rnd, 1);                
                }

                if(bcPictureArray.length > 0){
                    bingoItemImg.src = bcPictureArray[no-1];
                }
                else{
                    setServerImageToElement("images/iconA/icon_" + ('00' + no).slice(-3) + ".gif", bingoItemImg);
//                    bingoItemImg.src = "images/iconA/icon_" + ('00' + no).slice(-3) + ".gif";
                }
                document.getElementById("bingoCard").appendChild(bingoItemImg);

                var bingoItemDiv = document.getElementById("bingoItemDiv" + i + j);
                bingoItemDiv.textContent = no;
            }
        }
    }        
}

function checkLizhi(){
    if(bcState !== 'playing') return;
    
    var isLizhi = false;
    
    // ヨコ
    for(var i = 1; i <= 5; i++){
        var count = 0;
        for(var j = 1; j <= 5; j++){
            if(i !== 3 || j !== 3){
                if(document.getElementById("bingoStampImg" + i + j)){
                    count++;
                }
            }
            else{
                count++;
            }
        }
        if(count >= 4){
            isLizhi = true;
            break;
        }
    }
    if(isLizhi){
        bcState = 'lizhi';
        return;
    }            
    
    // タテ
    for(var i = 1; i <= 5; i++){
        var count = 0;
        for(var j = 1; j <= 5; j++){
            if(i !== 3 || j !== 3){
                if(document.getElementById("bingoStampImg" + j + i)){
                    count++;
                }
            }
            else{
                count++;
            }
        }
        if(count >= 4){
            isLizhi = true;
            break;
        }
    }
    if(isLizhi){
        bcState = 'lizhi';
        return;
    }            
    
    // ナナメ(左上>右下)
    var count = 0;
    for(var i = 1; i <= 5; i++){        
        if(i !== 3){
            if(document.getElementById("bingoStampImg" + i + i)){
                count++;
            }
        }
        else{
            count++;
        }
    }
    if(count >= 4){
        bcState = 'lizhi';
        return;
    }
    
    // ナナメ(左下>右上)
    var count = 0;
    for(var i = 1; i <= 5; i++){        
        if(i !== 3){
            if(document.getElementById("bingoStampImg" + i +(6 - i))){
                count++;
            }
        }
        else{
            count++;
        }
    }
    if(count >= 4){
        bcState = 'lizhi';
        return;
    }
}

function checkBingo(){
    var isBingo = true;
    
    // ヨコ
    for(var i = 1; i <= 5; i++){
        isBingo = true;
        for(var j = 1; j <= 5; j++){
            if(i !== 3 || j !== 3){
                if(!document.getElementById("bingoStampImg" + i + j)){
                    isBingo = false;
                }
            }
        }
        if(isBingo){
            bingo();
            return;
        }            
    }
    
    // タテ
    for(var i = 1; i <= 5; i++){
        isBingo = true;
        for(var j = 1; j <= 5; j++){
            if(i !== 3 || j !== 3){
                if(!document.getElementById("bingoStampImg" + j + i)){
                    isBingo = false;
                }
            }
        }
        if(isBingo){
            bingo();
            return;
        }            
    }
    
    // ナナメ(左上>右下)
    isBingo = true;
    for(var i = 1; i <= 5; i++){        
        if(i !== 3){
            if(!document.getElementById("bingoStampImg" + i + i)){
                isBingo = false;
            }
        }
    }
    if(isBingo){
        bingo();
        return;
    }            
    
    // ナナメ(左下>右上)
    isBingo = true;
    for(var i = 1; i <= 5; i++){        
        if(i !== 3){
            if(!document.getElementById("bingoStampImg" + i +(6 - i))){
                isBingo = false;
            }
        }
    }
    if(isBingo){
        bingo();
        return;
    }            
}

function bingo(){
    bcState = 'bingo';

    var bingoDiv = document.getElementById("bingoCard");

    var bingoAchieveBG1Img = document.createElement("img");
    bingoAchieveBG1Img.id = "bingoAchieveBG1";
    bingoAchieveBG1Img.width = 320;
    bingoAchieveBG1Img.height = 560;
    bingoAchieveBG1Img.style.position = "absolute";
    bingoAchieveBG1Img.style.top = "0px";
    bingoAchieveBG1Img.style.left = "0px";
    if(bcAchieveBG1URL !== ""){
        bingoAchieveBG1Img.src = bcAchieveBG1URL;
    }
    else{
        setServerImageToElement("images/card_bingo_background.png", bingoAchieveBG1Img);
    }
    bingoDiv.appendChild(bingoAchieveBG1Img);

    var bingoAchieveBG2Img = document.createElement("img");
    bingoAchieveBG2Img.id = "bingoAchieveBG2";
    bingoAchieveBG2Img.width = 200;
    bingoAchieveBG2Img.height = 190;
    bingoAchieveBG2Img.style.position = "absolute";
    bingoAchieveBG2Img.style.top = "145px";
    bingoAchieveBG2Img.style.left = "60px";
    if(bcAchieveBG2URL !== ""){
        bingoAchieveBG2Img.src = bcAchieveBG2URL;
    }
    else{
        setServerImageToElement("images/card_bingo_neco.png", bingoAchieveBG2Img);
    }
    bingoDiv.appendChild(bingoAchieveBG2Img);

    var bingoAchieveBG3Img = document.createElement("img");
    bingoAchieveBG3Img.id = "bingoAchieveBG3";
    bingoAchieveBG3Img.width = 248;
    bingoAchieveBG3Img.height = 92;
    bingoAchieveBG3Img.style.position = "absolute";
    bingoAchieveBG3Img.style.top = "304px";
    bingoAchieveBG3Img.style.left = "46px";
    if(bcAchieveBG3URL !== ""){
        bingoAchieveBG3Img.src = bcAchieveBG3URL;
    }
    else{
        setServerImageToElement("images/card_bingo_logo.png", bingoAchieveBG3Img);
    }
    bingoDiv.appendChild(bingoAchieveBG3Img);

    var bingoAchieveDiv = document.createElement('div');
    bingoAchieveDiv.id = "bingoAchieveDiv";
    bingoAchieveDiv.style.position = "relative";
    bingoDiv.appendChild(bingoAchieveDiv);

    var bingoAchieveA = document.createElement('a');
    bingoAchieveA.href = bcRewardURL;
    bingoAchieveA.target = "_blank";
    bingoAchieveDiv.appendChild(bingoAchieveA);

    var bingoAchieveImg = document.createElement("img");
    bingoAchieveImg.id = "bingoAchieveImg";
    bingoAchieveImg.width = 208;
    bingoAchieveImg.style.position = "absolute";
    bingoAchieveImg.style.top = "396px";
    bingoAchieveImg.style.left = "56px";
    if(bcAchieveURL !== ""){
        bingoAchieveImg.src = bcAchieveURL;
    }
    else{
        setServerImageToElement("images/card_bingo_button.png", bingoAchieveImg);
    }
    bingoAchieveA.appendChild(bingoAchieveImg);
}

function setServerImageToElement(filePath, element){
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        switch ( req.readyState ) {
            case 4: // データ受信完了.
                if( req.status == 200 || req.status == 304 ) {
                    var oURL = URL.createObjectURL(req.response);
                    element.src = oURL;
                    return true;
                    
                } else {    //err
                    if(bcRetryCnt < bcRetryCntMax){
                        bcRetryCnt++;
                       console.log("* retry : " + bcRetryCnt + " : " + filePath);
                        setServerImageToElement(filePath, element);
                    }
                    return false;
                }
                break;
        }
    };
    req.open("GET", bcBaseURL + "/js/getServerImage.php?f=" + filePath, true);
    req.responseType = 'blob';
    req.send("");    
}

function setServerImageToObject(filePath, array, key){
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        switch ( req.readyState ) {
            case 4: // データ受信完了.
                if( req.status == 200 || req.status == 304 ) {
                    var oURL = URL.createObjectURL(req.response);
                    array[key] = oURL;
                    return true;

                } else {    //err
                    if(bcRetryCnt < bcRetryCntMax){
                        bcRetryCnt++;
                       console.log("* retry : " + bcRetryCnt + " : " + filePath);
                        setServerImageToObject(filePath, array, key);
                    }
                    return false;
                }
                break;
        }
    };
    req.open("GET", bcBaseURL + "/js/getServerImage.php?f=" + filePath, true);
    req.responseType = 'blob';
    req.send("");    
}
