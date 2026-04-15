var hostip = "cnsrd.jp";
if('testDomain' in this){
    hostip = testDomain;
}
var bmBaseURL = "https://" + hostip + "/necobingo";
var jqUrl       = bmBaseURL + "/js/jquery.php";
var jqrUrl      = bmBaseURL + "/js/jqueryqr.php";
var machinewsJsUrl = bmBaseURL + "/js/machinews.php";
var clientwsJsUrl = bmBaseURL + "/js/clientws.php";

// ビンゴナンバーマスタ(1〜75)
var bmNumsMast = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75];

// ゲームで使用するナンバーの最大値(1〜75)
var bmNumsMax = 75;

// 現在マシーンに入ってるビンゴナンバーの配列
var bmNumsArray;

// これまでに引いたビンゴナンバーの配列
var bmPastNumArray = [];

// 保持しておくこれまでに引いたビンゴナンバーの数
var bmPastNumMax = 5;

// ビンゴマシーンステータス
var MACHINE_STATUS_STOP = 0;        // 停止中
var MACHINE_STATUS_ENTRY = 1;       // 受付中
var MACHINE_STATUS_WORKING = 2;     // マシーン回転中
var MACHINE_STATUS_OUTPUT = 3;      // ボール排出
var MACHINE_STATUS_OUTPUT_END = 4;  // ボール排出後
var bmMachineStatus = MACHINE_STATUS_STOP;

// ビンゴマシーン停止フラグ
var bmIsStop = false;

// 自動実行フラグ
var bmIsAutoRun = false;

// ゲーム開始時間
var bmGameStartDate;

var bmAnimation1Interval = 2.0*1000;
var bmAnimation2Interval = 2.0*1000;
var bmNextDrawInterval = 2.0*1000;

// 画面表示の倍率
var bmDisplayRatio = 1.0;

var bmLeft = 0;

// 表示タイプ
// fiexed : サイズ固定(720x560)
// scaling : ブラウザのウインドウサイズいっぱいに拡大縮小する
var bmDisplayType = "fixed";

// 余白の色
var bmMarginColor = "#fff799";

// ビンゴカードのURL
var bmBingoCardURL = bmBaseURL + "/bingocard.php";

// サーバーへの画像取得リトライ回数
var bmRetryCnt = 0;
var bmRetryCntMax = 100;

// ビンゴマシーンアニメーション画像テーブル
var bmAnimationImg = [];

// カスタマイズビンゴマシーンアニメーション画像テーブル
var bmCustomizeAnimationStopImg = "";
var bmCustomizeAnimationImg = ["", "", ""];

// デフォルト絵柄画像テーブル
var bmDefaultPictureArray = {};

// カスタマイズ絵柄画像テーブル
// key:(ビンゴナンバー - 1) value:URL
var bmPictureArray = [];

// カスタマイズ背景画像のURL
var bmBackgroundImgURL = "";

// カスタマイズタイトル画像のURL
var bmTitleImgURL = "";

// カスタマイズスタートボタン画像のURL
var bmStartBtnImgURL = "";

// カスタマイズリセットボタン画像のURL
var bmResetBtnImgURL = "";

// カスタマイズ排出絵柄一覧画像のURL
var bmDischargeListImgURL = "";

// カスタマイズ受付中画像のURL
var bmAcceptImgURL = "";

// カスタマイズ抽選中画像のURL
var bmSelectImgURL = "";

// カスタマイズ抽選終了画像のURL
var bmEndImgURL = "";

// カスタマイズステータス画像のURL
var bmStatImgURL = "";

// カスタマイズ結果画像のURL
var bmResultImgURL = "";

var BingoMachine = {};

BingoMachine.setDisplayType = function(type){
    bmDisplayType = type;   
}

BingoMachine.setMarginColor = function(color){
    bmMarginColor = color;   
}

BingoMachine.setBingoCard = function(url){
    bmBingoCardURL = url;   
}

BingoMachine.setAnimationStopURL = function(url){
    bmCustomizeAnimationStopImg = url;   
}

BingoMachine.setAnimation1URL = function(url){
    bmCustomizeAnimationImg[1] = url;   
}

BingoMachine.setAnimation2URL = function(url){
    bmCustomizeAnimationImg[2] = url;   
}

BingoMachine.addPicture = function(url){
    if(bmPictureArray.length < 75){
        bmPictureArray.push(url);
    }
}

BingoMachine.setPictureNum = function(num){
    if(isFinite(num)){
        bmNumsMax = num;
    }
}

BingoMachine.setBackground = function(url){
    bmBackgroundImgURL = url;   
}

BingoMachine.setTitle = function(url){
    bmTitleImgURL = url;   
}

BingoMachine.setStartButton = function(url){
    bmStartBtnImgURL = url;   
}

BingoMachine.setResetButton = function(url){
    bmResetBtnImgURL = url;   
}

BingoMachine.setDischargeList = function(url){
    bmDischargeListImgURL = url;   
}

BingoMachine.setAccept = function(url){
    bmAcceptImgURL = url;   
}

BingoMachine.setSelect = function(url){
    bmSelectImgURL = url;   
}

BingoMachine.setEnd = function(url){
    bmEndImgURL = url;   
}

BingoMachine.setStatus = function(url){
    bmStatImgURL = url;   
}

BingoMachine.setResult = function(url){
    bmResultImgURL = url;   
}

window.onload = function() {
    initArea();
    createInfoArea();
    createPlayArea();
    createStateArea();
    
    // 広告エリア作成
    createAdDiv();

    // カスタム表示処理
    editCustomArea();
    
    loadlib();    
}

function initArea(){
    // bodyの余白を0にする
    var body = document.getElementById("bingoMachine").parentNode;
    body.style.margin = "0px";
    body.style.padding = "0px";
    
    // 左右の余白の色を設定
    var machineDiv = document.getElementById("bingoMachine");
    machineDiv.style.backgroundColor = bmMarginColor;
    
    var machineWrapDiv = document.createElement("div");
    machineWrapDiv.id = "bingoMachineWrap";
    machineWrapDiv.style.position = "relative";
    machineDiv.appendChild(machineWrapDiv);
    
    // ウィンドウサイズの方が横長
    if((window.innerWidth / window.innerHeight) > (720/560)){
        // 表示倍率
        if(bmDisplayType === "scaling"){
            bmDisplayRatio = window.innerHeight / 560;
        }
        
        // 表示エリアのサイズ
        machineDiv.style.width = (window.innerWidth) + "px";
        machineDiv.style.height = 560 * bmDisplayRatio + "px";
        
        // 位置調整
        var left = parseInt((window.innerWidth - (720 * bmDisplayRatio))*0.5);
        machineWrapDiv.style.width = window.innerWidth - left + "px";
        machineWrapDiv.style.left = left + "px";
        
        bmLeft = left;
    }
    // ビンゴマシーンの方が横長
    else{
        // 表示倍率
        if(bmDisplayType === "scaling"){
            bmDisplayRatio = window.innerWidth / 720;
        }
        
        // 表示エリアのサイズ
        machineDiv.style.width = window.innerWidth + "px";
        machineDiv.style.height = "560px";
    }   
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
    req.open("GET", bmBaseURL + "/js/def.php", true);
    req.send("");
}

function loadjq(){
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
        switch ( req.readyState ) {
            case 4: // データ受信完了.
                if( req.status == 200 || req.status == 304 ) {
                    eval(req.responseText);
                    loadjqr();
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

function loadjqr(){
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
    req.open("GET", jqrUrl, true);
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
    req.open("GET", machinewsJsUrl, true);
    req.send("");        
}

function createInfoArea(){
    var machineDiv = document.getElementById("bingoMachineWrap");

    // 背景
    var topImg = document.createElement("img");
    topImg.width = 720 * bmDisplayRatio;
    topImg.height = 560 * bmDisplayRatio;
    if(bmBackgroundImgURL !== ""){
        topImg.src = bmBackgroundImgURL;
    }
    else{
        setServerImageToElement("images/top_background.png", topImg);
    }
    topImg.style.position = "absolute";
    topImg.style.top = "0px";
    topImg.style.left = "0px";
    machineDiv.appendChild(topImg);

    // QRコード
    var qrDiv = document.createElement("div");
    qrDiv.id = "bingoQR";
    qrDiv.style.position = "absolute";
    qrDiv.style.top = (162 * bmDisplayRatio) + "px";
    qrDiv.style.left = (40 * bmDisplayRatio) + "px";
    machineDiv.appendChild(qrDiv);
}

function createPlayArea(){
    var machineDiv = document.getElementById("bingoMachineWrap");

    // タイトル
    var titleImg = document.createElement("img");
    titleImg.width = 316 * bmDisplayRatio;
    titleImg.height = 132 * bmDisplayRatio;
    if(bmTitleImgURL !== ""){
        titleImg.src = bmTitleImgURL;
    }
    else{
        setServerImageToElement("images/top_logo.png", titleImg);
    }
    titleImg.style.position = "absolute";
    titleImg.style.top = 30 * bmDisplayRatio + "px";
    titleImg.style.left = 204 * bmDisplayRatio + "px";
    machineDiv.appendChild(titleImg);

    // ビンゴマシーン画像
    var machineImg = document.createElement("img");
    machineImg.id = "bingoMachineImg";
    machineImg.width = 260 * bmDisplayRatio;
    machineImg.height = 195 * bmDisplayRatio;
    if(bmCustomizeAnimationStopImg !== ""){
        machineImg.src = bmCustomizeAnimationStopImg;
    }
    else{
        setServerImageToElement("images/bingo_cage_stop.png", machineImg);
    }
    machineImg.style.position = "absolute";
    machineImg.style.top = 132 * bmDisplayRatio + "px";
    machineImg.style.left = 230 * bmDisplayRatio + "px";
    machineDiv.appendChild(machineImg);

    // スタートボタン
    var startButton = document.createElement("input");
    startButton.id = "startButton";
    startButton.type = "image";
    startButton.onclick = new Function('start()');
    startButton.width = 150 * bmDisplayRatio;
    startButton.height = 60 * bmDisplayRatio;
    startButton.style.position = "absolute";
    startButton.style.top = 336 * bmDisplayRatio + "px";
    startButton.style.left = 285 * bmDisplayRatio + "px";
    if(bmStartBtnImgURL !== ""){
        startButton.src = bmStartBtnImgURL;
    }
    else{
        setServerImageToElement("images/top_button_start.png", startButton);
    }
    machineDiv.appendChild(startButton);

    // リセットボタン
    var resetButton = document.createElement("input");
    resetButton.id = "resetButton";
    resetButton.type = "image";
    resetButton.onclick = new Function('resetButton()');
    resetButton.width = 150 * bmDisplayRatio;
    resetButton.height = 60 * bmDisplayRatio;
    resetButton.style.visibility = "hidden";
    resetButton.style.position = "absolute";
    resetButton.style.top = 336 * bmDisplayRatio + "px";
    resetButton.style.left = 285 * bmDisplayRatio + "px";
    if(bmResetBtnImgURL !== ""){
        resetButton.src = bmResetBtnImgURL;
    }
    else{
        setServerImageToElement("images/top_button_reset.png", resetButton);
    }
    machineDiv.appendChild(resetButton);
    
    // 履歴エリア
    var historyImg = document.createElement("img");
    historyImg.id = "historyImg";
    historyImg.width = 320 * bmDisplayRatio;
    historyImg.height = 136 * bmDisplayRatio;
    if(bmDischargeListImgURL !== ""){
        historyImg.src = bmDischargeListImgURL;
    }
    else{
        setServerImageToElement("images/top_list_background.png", historyImg);
    }
    historyImg.style.position = "absolute";
    historyImg.style.top = 414 * bmDisplayRatio + "px";
    historyImg.style.left = 200 * bmDisplayRatio + "px";
    machineDiv.appendChild(historyImg);
    
    for(var i = 0; i < 5; i++){
        // 履歴画像
        var pastDiv = document.createElement("div");
        pastDiv.id = "pastNumDiv" + i;
        pastDiv.style.position = "absolute";
        pastDiv.style.width = 60 * bmDisplayRatio + "px";
        pastDiv.style.height = 60 * bmDisplayRatio + "px";
        pastDiv.style.top = 480 * bmDisplayRatio + "px";
        pastDiv.style.left = (204 + (i*63)) * bmDisplayRatio + "px";
        machineDiv.appendChild(pastDiv);
    }
    
    // アニメーション画像取得
    if(bmCustomizeAnimationImg[1] !== ""){
        bmAnimationImg[1] = bmCustomizeAnimationImg[1];
    }
    else{
        setServerImageToObject("images/bingo_cage.gif", bmAnimationImg, 1);
    }
    if(bmCustomizeAnimationImg[2] !== ""){
        bmAnimationImg[2] = bmCustomizeAnimationImg[2];
    }
    else{
        setServerImageToObject("images/tama_A.gif", bmAnimationImg, 2);
    }
    
    // 絵柄画像取得
    for(var i = 1; i <= bmNumsMax; i++){
        setServerImageToObject("images/iconA/icon_" + ('00' + i).slice(-3) + ".gif", bmDefaultPictureArray, i);
    }
}

function createStateArea(){
    var machineDiv = document.getElementById("bingoMachineWrap");

    var conditionDiv = document.createElement("div");
    conditionDiv.id = "bingoCondition";
    machineDiv.appendChild(conditionDiv);    
    
    // 参加受付中画像
    var acceptImg = document.createElement("img");
    acceptImg.id = "acceptImg";
    acceptImg.width = 182 * bmDisplayRatio;
    acceptImg.height = 82 * bmDisplayRatio;
    if(bmAcceptImgURL !== ""){
        acceptImg.src = bmAcceptImgURL;
    }
    else{
        setServerImageToElement("images/top_accept.png", acceptImg);
    }
    acceptImg.style.position = "absolute";
    acceptImg.style.top = 19 * bmDisplayRatio + "px";
    acceptImg.style.left = 529 * bmDisplayRatio + "px";
    machineDiv.appendChild(acceptImg);
    
    // 抽選中画像
    var selectImg = document.createElement("img");
    selectImg.id = "selectImg";
    selectImg.width = 182 * bmDisplayRatio;
    selectImg.height = 82 * bmDisplayRatio;
    if(bmSelectImgURL !== ""){
        selectImg.src = bmSelectImgURL;
    }
    else{
        setServerImageToElement("images/top_select.png", selectImg);
    }
    selectImg.style.visibility = "hidden";
    selectImg.style.position = "absolute";
    selectImg.style.top = 19 * bmDisplayRatio + "px";
    selectImg.style.left = 529 * bmDisplayRatio + "px";
    machineDiv.appendChild(selectImg);
    
    // 抽選終了画像
    var endImg = document.createElement("img");
    endImg.id = "endImg";
    endImg.width = 182 * bmDisplayRatio;
    endImg.height = 82 * bmDisplayRatio;
    if(bmEndImgURL !== ""){
        endImg.src = bmEndImgURL;
    }
    else{
        setServerImageToElement("images/top_end.png", endImg);
    }
    endImg.style.visibility = "hidden";
    endImg.style.position = "absolute";
    endImg.style.top = 19 * bmDisplayRatio + "px";
    endImg.style.left = 529 * bmDisplayRatio + "px";
    machineDiv.appendChild(endImg);
    
    // ステータスエリア
    var statusImg = document.createElement("img");
    statusImg.id = "statusImg";
    statusImg.width = 180 * bmDisplayRatio;
    statusImg.height = 112 * bmDisplayRatio;
    if(bmStatImgURL !== ""){
        statusImg.src = bmStatImgURL;
    }
    else{
        setServerImageToElement("images/top_status.png", statusImg);
    }
    statusImg.style.position = "absolute";
    statusImg.style.top = 110 * bmDisplayRatio + "px";
    statusImg.style.left = 530 * bmDisplayRatio + "px";
    machineDiv.appendChild(statusImg);
    
    // ビンゴ結果エリア
    var resultImg = document.createElement("img");
    resultImg.id = "statusImg";
    resultImg.width = 180 * bmDisplayRatio;
    resultImg.height = 286 * bmDisplayRatio;
    if(bmResultImgURL !== ""){
        resultImg.src = bmResultImgURL;
    }
    else{
        setServerImageToElement("images/top_result_background.png", resultImg);
    }
    resultImg.style.position = "absolute";
    resultImg.style.top = 236 * bmDisplayRatio + "px";
    resultImg.style.left = 530 * bmDisplayRatio + "px";
    machineDiv.appendChild(resultImg);

    // 参加者
    var entryDiv = document.createElement("div");
    entryDiv.id = "bingoEntry";
    entryDiv.style.position = "absolute";
    entryDiv.style.top = 142 * bmDisplayRatio + "px";
    entryDiv.style.left = 607 * bmDisplayRatio + "px";
    entryDiv.style.width = 60 * bmDisplayRatio + "px";
    entryDiv.style.fontSize = 1.7 * bmDisplayRatio + "em";
    entryDiv.style.fontWeight = "bold";
    entryDiv.style.color = "red";
    entryDiv.style.textAlign = "center";
    entryDiv.textContent = 0;
    machineDiv.appendChild(entryDiv);    
    
    var lizhiDiv = document.createElement("div");
    lizhiDiv.id = "bingoLizhi";
    lizhiDiv.style.position = "absolute";
    lizhiDiv.style.top = 180 * bmDisplayRatio + "px";
    lizhiDiv.style.left = 607 * bmDisplayRatio + "px";
    lizhiDiv.style.width = 60 * bmDisplayRatio + "px";
    lizhiDiv.style.fontSize = 1.7 * bmDisplayRatio + "em";
    lizhiDiv.style.fontWeight = "bold";
    lizhiDiv.style.color = "red";
    lizhiDiv.style.textAlign = "center";
    lizhiDiv.textContent = 0;
    machineDiv.appendChild(lizhiDiv);    

    var rankingDiv11 = document.createElement("div");
    rankingDiv11.id = "bingoRanking1-1";
    rankingDiv11.style.position = "absolute";
    rankingDiv11.style.top = 373 * bmDisplayRatio + "px";
    rankingDiv11.style.left = 590 * bmDisplayRatio + "px";
    rankingDiv11.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv11.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv11.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv11);    
    
    var rankingDiv12 = document.createElement("div");
    rankingDiv12.id = "bingoRanking1-2";
    rankingDiv12.style.position = "absolute";
    rankingDiv12.style.top = 373 * bmDisplayRatio + "px";
    rankingDiv12.style.left = 650 * bmDisplayRatio + "px";
    rankingDiv12.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv12.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv12.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv12);    
    
    var rankingDiv13 = document.createElement("div");
    rankingDiv13.id = "bingoRanking1-3";
    rankingDiv13.style.position = "absolute";
    rankingDiv13.style.top = 396 * bmDisplayRatio + "px";
    rankingDiv13.style.left = 590 * bmDisplayRatio + "px";
    rankingDiv13.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv13.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv13.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv13);    
    
    var rankingDiv14 = document.createElement("div");
    rankingDiv14.id = "bingoRanking1-4";
    rankingDiv14.style.position = "absolute";
    rankingDiv14.style.top = 396 * bmDisplayRatio + "px";
    rankingDiv14.style.left = 650 * bmDisplayRatio + "px";
    rankingDiv14.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv14.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv14.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv14);    
    
    var rankingDiv21 = document.createElement("div");
    rankingDiv21.id = "bingoRanking2-1";
    rankingDiv21.style.position = "absolute";
    rankingDiv21.style.top = 423 * bmDisplayRatio + "px";
    rankingDiv21.style.left = 590 * bmDisplayRatio + "px";
    rankingDiv21.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv21.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv21.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv21);    
    
    var rankingDiv22 = document.createElement("div");
    rankingDiv22.id = "bingoRanking2-2";
    rankingDiv22.style.position = "absolute";
    rankingDiv22.style.top = 423 * bmDisplayRatio + "px";
    rankingDiv22.style.left = 650 * bmDisplayRatio + "px";
    rankingDiv22.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv22.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv22.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv22);    
    
    var rankingDiv23 = document.createElement("div");
    rankingDiv23.id = "bingoRanking2-3";
    rankingDiv23.style.position = "absolute";
    rankingDiv23.style.top = 446 * bmDisplayRatio + "px";
    rankingDiv23.style.left = 590 * bmDisplayRatio + "px";
    rankingDiv23.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv23.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv23.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv23);    
    
    var rankingDiv24 = document.createElement("div");
    rankingDiv24.id = "bingoRanking2-4";
    rankingDiv24.style.position = "absolute";
    rankingDiv24.style.top = 446 * bmDisplayRatio + "px";
    rankingDiv24.style.left = 650 * bmDisplayRatio + "px";
    rankingDiv24.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv24.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv24.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv24);    
    
    var rankingDiv31 = document.createElement("div");
    rankingDiv31.id = "bingoRanking3-1";
    rankingDiv31.style.position = "absolute";
    rankingDiv31.style.top = 473 * bmDisplayRatio + "px";
    rankingDiv31.style.left = 590 * bmDisplayRatio + "px";
    rankingDiv31.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv31.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv31.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv31);    
    
    var rankingDiv32 = document.createElement("div");
    rankingDiv32.id = "bingoRanking3-2";
    rankingDiv32.style.position = "absolute";
    rankingDiv32.style.top = 473 * bmDisplayRatio + "px";
    rankingDiv32.style.left = 650 * bmDisplayRatio + "px";
    rankingDiv32.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv32.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv32.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv32);    
    
    var rankingDiv33 = document.createElement("div");
    rankingDiv33.id = "bingoRanking3-3";
    rankingDiv33.style.position = "absolute";
    rankingDiv33.style.top = 496 * bmDisplayRatio + "px";
    rankingDiv33.style.left = 590 * bmDisplayRatio + "px";
    rankingDiv33.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv33.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv33.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv33);    
    
    var rankingDiv34 = document.createElement("div");
    rankingDiv34.id = "bingoRanking3-4";
    rankingDiv34.style.position = "absolute";
    rankingDiv34.style.top = 496 * bmDisplayRatio + "px";
    rankingDiv34.style.left = 650 * bmDisplayRatio + "px";
    rankingDiv34.style.width = 50 * bmDisplayRatio + "px";
    rankingDiv34.style.fontSize = 16 * bmDisplayRatio + "px";
    rankingDiv34.style.textAlign = "center";
    machineDiv.appendChild(rankingDiv34);    
}

// 広告エリア構築
function createAdDiv(){
    var machineDiv = document.getElementById("bingoMachineWrap");
    
    var divAd = document.createElement('div');
    divAd.style.position = "absolute";
    divAd.style.top = parseInt(520 * bmDisplayRatio) + "px";
    divAd.style.width = parseInt(200 * bmDisplayRatio) + "px";
    divAd.style.height = parseInt(40 * bmDisplayRatio) + "px";
    divAd.style.backgroundColor = "#fff799";
    machineDiv.appendChild(divAd);

    var aBanner = document.createElement('a');
    aBanner.href = "http://colecole.jp";
    aBanner.target = "_blank";
    divAd.appendChild(aBanner);

    // CNSサイト外では"colecole_banner2.png","colecole_banner3.png"
    // CNSサイト内では"colecole_banner4.png","colecole_banner5.png"
    // をランダム表示
    var bannerNo = 2;
    if(document.domain === "colecole.jp" || 
       document.domain === "www.cnsinc.jp" ||
       document.domain === "rd.cnsrd.jp"){
        bannerNo = 4;
    }
    bannerNo += Math.floor( Math.random() * 2 ) ; // 0 or 1 を加算する

    var imgBanner = document.createElement('img');
//    imgBanner.src = "images/banner/colecole_banner" + bannerNo + "_400_80.png";
    setServerImageToElement("images/banner/colecole_banner" + bannerNo + "_400_80.png", imgBanner);
    imgBanner.style.position = "absolute";
    imgBanner.style.top = "0px";
    imgBanner.width = parseInt(200 * bmDisplayRatio);
    imgBanner.height = parseInt(40 * bmDisplayRatio);
    aBanner.appendChild(imgBanner);
}

function editCustomArea(){
    // http://colecole.jp/necobingo/の場合は説明文の表示位置を調整する
    var desc = document.getElementById("description");
    if(desc){
        var wrap = document.getElementById("bingoMachineWrap");
        desc.style.top = (bmDisplayRatio * 300) + "px";
        desc.style.left = bmLeft + (bmDisplayRatio * 10) + "px";
        desc.style.width = (bmDisplayRatio * 155) + "px";
        desc.style.height = (bmDisplayRatio * 90) + "px";
        desc.style.fontsize = "10px";
        
        if(bmDisplayRatio < 1.0){
            desc.style.padding = "0px";
            desc.style.width = (bmDisplayRatio * 180) + "px";
        }
        
        var h1 = document.getElementById("description_h1");
        h1.style.fontSize = (bmDisplayRatio *  1) + "em";
        
        var dd = document.getElementById("description_dd");
        dd.style.fontSize = (bmDisplayRatio *  0.6) + "em";
    }
}

function entry(){
    // ゲーム実行中は抜ける
    if(bmMachineStatus !== MACHINE_STATUS_STOP) return;
    bmMachineStatus = MACHINE_STATUS_ENTRY;
    
    document.getElementById("resetButton").style.visibility = "hidden";
    document.getElementById("startButton").style.visibility = "visible";
    document.getElementById("acceptImg").style.visibility = "visible";
    document.getElementById("selectImg").style.visibility = "hidden";
    document.getElementById("endImg").style.visibility = "hidden";
    
    // ビンゴマシーンにナンバーをセット
    bmNumsArray = [];
    for(var i = 0; i < bmNumsMax; i++){
        bmNumsArray.push(bmNumsMast[i]);
    }
    
    // これまでに引いたビンゴナンバークリア
    bmPastNumArray = [];
    for(var i = 0; i < 5; i++){
        var pastNumDiv = document.getElementById("pastNumDiv" + i);
        while (pastNumDiv.firstChild) pastNumDiv.removeChild(pastNumDiv.firstChild);
    }

    // 表示リセット
    document.getElementById("bingoEntry").textContent = 0;
    document.getElementById("bingoLizhi").textContent = 0;
    for(var i = 1; i < 4; i++){
        for(var j = 1; j < 5; j++){
            document.getElementById("bingoRanking" + i + "-" + j).textContent = "";
        }
    }
    
    // サーバーにゲームリセットを送信
    var msg = {
        message : 'reset_game',
        acid : bmAcid,
        numsMax : bmNumsMax
    };
    websocket.send(JSON.stringify(msg));
    
    if(bmIsAutoRun){
        // ビンゴマシーン起動時間
        var now = new Date();
        var restartDate = new Date(now.getTime() + 60*1000);
        document.getElementById("bingoCondition").textContent = "参加者募集中(" + restartDate.getHours() + ":" + restartDate.getMinutes() + ":" + restartDate.getSeconds() + "に開始)";
        
        // 1分後にゲームスタート
        var id = setTimeout("start()", 60*1000);
    }
}

function start(){
    if(websocket.readyState != 1) {
        alert("サーバーとの接続が確立されていません。リロードしてください。(websocket err)");
        return;
    }
    
    // ゲーム実行中は抜ける
    if(bmMachineStatus !== MACHINE_STATUS_ENTRY) return;
    
    document.getElementById("startButton").style.visibility = "hidden";
    document.getElementById("acceptImg").style.visibility = "hidden";
    document.getElementById("selectImg").style.visibility = "visible";
    document.getElementById("endImg").style.visibility = "hidden";

    bmGameStartDate = new Date();
    
    drawNumber();
}

function resetButton(){
    bmIsAutoRun = false;
    
    entry();
}

function end(){
    bmMachineStatus = MACHINE_STATUS_STOP;

    document.getElementById("acceptImg").style.visibility = "hidden";
    document.getElementById("selectImg").style.visibility = "hidden";
    document.getElementById("endImg").style.visibility = "visible";
    
    // ゲームスタートからの経過時間を求める
    var now = new Date();
    var interval = now.getTime() - bmGameStartDate.getTime();
    
    document.getElementById("resetButton").style.visibility = "visible";
}

function drawNumber(){                
    if(bmIsStop){
        bmIsStop = false;
        end();
        return;
    }
    
    if(bmMachineStatus === MACHINE_STATUS_ENTRY || bmMachineStatus === MACHINE_STATUS_OUTPUT_END){    
        bmMachineStatus = MACHINE_STATUS_WORKING;

        // ビンゴマシーン回転のアニメーション開始
        var bingoMachineImg = document.getElementById("bingoMachineImg");
        bingoMachineImg.style.top = 132 * bmDisplayRatio + "px";
        bingoMachineImg.src = bmAnimationImg[1];
        
        var id = setTimeout("drawNumber()", bmAnimation1Interval);
        
    }else if(bmMachineStatus === MACHINE_STATUS_WORKING){
        bmMachineStatus = MACHINE_STATUS_OUTPUT;
        
        // ビンゴマシーン出力のアニメーション開始
        var bingoMachineImg = document.getElementById("bingoMachineImg");
        bingoMachineImg.style.top = 160 * bmDisplayRatio + "px";
        bingoMachineImg.src = bmAnimationImg[2];
        
        var id = setTimeout("drawNumber()", bmAnimation2Interval);

    }else if(bmMachineStatus === MACHINE_STATUS_OUTPUT){
        bmMachineStatus = MACHINE_STATUS_OUTPUT_END;
        
        // bmNumsArray[rnd]が今回引いたナンバー
        var rnd = Math.floor(Math.random() * bmNumsArray.length);
        
        // これまでに引いたナンバーテーブル更新
        bmPastNumArray.unshift(bmNumsArray[rnd]);
        if(bmPastNumArray.length > bmPastNumMax) bmPastNumArray.pop();
        
        // 表示更新
        for(var i = 0; i < bmPastNumArray.length; i++){
            var pastNumDiv = document.getElementById("pastNumDiv" + i);
            while (pastNumDiv.firstChild) pastNumDiv.removeChild(pastNumDiv.firstChild);
            
            var pastNumImg = document.createElement("img");
            pastNumImg.id = "pastNumImg" + i;
            pastNumImg.width = 60 * bmDisplayRatio;
            pastNumDiv.appendChild(pastNumImg);
            // カスタマイズ画像
            if(bmPictureArray.length > 0){
                pastNumImg.src = bmPictureArray[bmPastNumArray[i]-1];
            }
            // デフォルト画像
            else {
                pastNumImg.src = bmDefaultPictureArray[bmPastNumArray[i]];
            }
        }
        
    //    console.log("draw number : " + bmNumsArray[rnd]);
    //    console.log("bmPastNumArray : " + bmPastNumArray.join(','));        
        
        // サーバーに引いたナンバーを送る
        var msg = {
            acid : bmAcid,
            num : bmNumsArray[rnd],
            message : 'draw_number'
        };
        websocket.send(JSON.stringify(msg));

        // ビンゴマシーンから引いたナンバーを削除
        bmNumsArray.splice(rnd, 1);
        
        if (bmNumsArray.length > 0) {
            // 再度ナンバーを引く
            var id = setTimeout("drawNumber()", bmNextDrawInterval);
        }
        else{
            var id = setTimeout("end()", 10);
        }
    }
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
                    if(bmRetryCnt < bmRetryCntMax){
                        bmRetryCnt++;
                       console.log("* retry : " + bmRetryCnt + " : " + filePath);
                        setServerImageToElement(filePath, element);
                    }
                    return false;
                }
                break;
        }
    };
    req.open("GET", bmBaseURL + "/js/getServerImage.php?f=" + filePath, true);
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
                    if(bmRetryCnt < bmRetryCntMax){
                        bmRetryCnt++;
                       console.log("* retry : " + bmRetryCnt + " : " + filePath);
                        setServerImageToObject(filePath, array, key);
                    }
                    return false;
                }
                break;
        }
    };
    req.open("GET", bmBaseURL + "/js/getServerImage.php?f=" + filePath, true);
    req.responseType = 'blob';
    req.send("");    
}
