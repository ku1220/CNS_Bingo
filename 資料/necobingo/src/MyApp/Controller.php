<?php
namespace MyApp;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use React\EventLoop\Factory as LoopFactory;

date_default_timezone_set('Asia/Tokyo');

class Controller implements MessageComponentInterface {
    // ビンゴマシーンの同時起動最大数
    protected $bingo_machine_max = 10;

    // 各ビンゴマシーンの最大ビンゴカード数
    protected $bingo_card_max = 100;

    // ビンゴマシーンテーブル
    // key:acid value:ConnectionInterface
    protected $machine_array = array();

    // ビンゴマシーン最終接続テーブル
    // key:acid value:time
    protected $machine_lastaccess_array = array();

    // ビンゴカードテーブル
    // key:acid, value:card_no_array( key:card_no value:ConnectionInterface )
    protected $card_array = array();

    // ビンゴカード状態テーブル
    // key:acid, value:card_no_array( key:card_no value:state )
    protected $card_state_array = array();

    // ビンゴマシーンを回した回数テーブル
    // key:acid value:count
    protected $count_array = array();

    // ビンゴマシーン内のナンバーの最大値
    // key:acid value:count
    protected $numsMax_array = array();

    // ランキングテーブル
    // key:acid value:separate_ranking_array( key:ranking, value:card_no_array( key:seq value:card_no ) )
    protected $ranking_array = array();

    // 現在のランキングテーブル
    // key:acid value:ranking
    protected $current_ranking = array();

    // ビンゴマシーンURLテーブル
    // key:acid value:url
    protected $card_url_array = array();

    public function __construct() {
        $this->writeLog("construct", "start");
    }
 
    public function onOpen(ConnectionInterface $conn) {
        // レスポンスデータ作成
        $response = json_encode(array('message'=>'connected', 'acid'=>$conn->resourceId));

        // レスポンス送信
        $conn->send($response);

        $this->writeLog("onOpen", $response);
    }
 
    public function onMessage(ConnectionInterface $from, $msg) {
        $this->writeLog("onMessage", "--------");
        $this->writeLog("onMessage", $msg);
 
        $tst_msg = json_decode($msg); //json decode

        // ビンゴマシーン接続
        if($tst_msg->message == "machine_connect"){
            if(count($this->machine_array) < $this->bingo_machine_max){
                // ビンゴマシーン登録
                $this->machine_array[$tst_msg->acid] = $from;
                $this->writeLog("onMessage", "machine_connect id:" . $tst_msg->acid);

                // ビンゴカードURLを登録
                $this->card_url_array[$tst_msg->acid] = $tst_msg->cardurl;

                // ビンゴマシーンにメッセージ送信
                $msg = json_encode(array('message'=>'machine_connect', 'acid'=>$tst_msg->acid));
                $from->send($msg);
                
                // 最終アクセス日時をテーブルにセット
                $this->machine_lastaccess_array[$tst_msg->acid] = time();
            }
            // ビンゴマシーン登録数が上限に達している
            else{
                // ビンゴマシーンにメッセージ送信
                $msg = json_encode(array('message'=>'machine_upperlimit', 'acid'=>$tst_msg->acid));
                $from->send($msg);
            }
        }
        else if($tst_msg->message == "card_connect"){
            // 参加しようとしたビンゴマシーンがない
            if(!array_key_exists($tst_msg->acid, $this->machine_array)){
                // ビンゴカードにメッセージ送信
                $msg = json_encode(array('message'=>'no_bingo_machine'));
                $from->send($msg);
            }                
            // 既に一定数ボールが出されている場合は、ゲーム参加不可とする
            elseif(!empty($this->count_array[$tst_msg->acid]) && $this->count_array[$tst_msg->acid] >= 5){
                // ビンゴカードにメッセージ送信
                $msg = json_encode(array('message'=>'entry_deadline'));
                $from->send($msg);
            }
            // 参加しているビンゴカードが上限に達している場合は、ゲーム参加不可とする
            elseif(array_key_exists($tst_msg->acid, $this->card_array) && 
                   is_array($this->card_array[$tst_msg->acid]) && 
                   count($this->card_array[$tst_msg->acid]) >= $this->bingo_card_max){
                // ビンゴカードにメッセージ送信
                $msg = json_encode(array('message'=>'bingo_card_entry_max'));
                $from->send($msg);
            }                    
            else{
                // カードNoを決定する
                $card_no = 0;
                // 既存カードNo一覧
                $card_no_array = array();
                if(!empty($this->card_array[$tst_msg->acid])){
                    $card_no_array = array_keys($this->card_array[$tst_msg->acid]);
                }
                while(true){
                    $card_no = mt_rand(1,999);
                    // 同じカードNoがなければループを抜ける
                    if(!in_array($card_no, $card_no_array))break;;
                }
                $this->writeLog("onMessage", "card_connect id:" . $tst_msg->acid);

                // ビンゴカードのソケットを登録
                $this->card_array[$tst_msg->acid][$card_no] = $from;

                // ビンゴカードにカードNoを送信
                $msg = json_encode(array('message'=>'card_no', 'no'=>$card_no, 'numsMax'=>$this->numsMax_array[$tst_msg->acid]));
                $from->send($msg);
                
                // 最終アクセス日時をテーブルにセット
                $this->machine_lastaccess_array[$tst_msg->acid] = time();
            }
        }
        else if( $tst_msg->message == "reset_game" ){
            // 状態リセット
            $this->count_array[$tst_msg->acid] = 0;
            $this->numsMax_array[$tst_msg->acid] = $tst_msg->numsMax;
            $this->ranking_array[$tst_msg->acid] = array();
            $this->current_ranking[$tst_msg->acid] = 1;
                            
            // ビンゴカードにメッセージ送信
            $msg = json_encode(array('message'=>'reset_game', 'acid'=>$tst_msg->acid));
            $this->send_message_toCard($msg, $tst_msg->acid);
            
            // ビンゴマシーンにメッセージ送信
            $msg = json_encode(array('message'=>'reset_game', 'acid'=>$tst_msg->acid));
            $this->machine_array[$tst_msg->acid]->send($msg);
            
            // 最終アクセス日時をテーブルにセット
            $this->machine_lastaccess_array[$tst_msg->acid] = time();
        }
        else if( $tst_msg->message == "start_game" ){
            // ビンゴマシーンにメッセージ送信
            $msg = json_encode(array('message'=>'start_game', 'acid'=>$tst_msg->acid));
            $this->machine_array[$tst_msg->acid]->send($msg);
            
            // 最終アクセス日時をテーブルにセット
            $this->machine_lastaccess_array[$tst_msg->acid] = time();
        }        
        else if( $tst_msg->message == "draw_number" ){
            // カウントアップ
            $this->count_array[$tst_msg->acid]++;
            
            // ランキングテーブル更新
            // 前回のdrawでビンゴになったカードがあれば、ランキングを下げる
            if(array_key_exists($tst_msg->acid, $this->ranking_array) && 
               is_array($this->ranking_array[$tst_msg->acid]) && 
               array_key_exists($this->current_ranking[$tst_msg->acid], $this->ranking_array[$tst_msg->acid]) &&
               count($this->ranking_array[$tst_msg->acid][$this->current_ranking[$tst_msg->acid]]) > 0){
                $this->current_ranking[$tst_msg->acid]++;
            }
            
            // ビンゴカードに数字を送る
            $response_text = json_encode(array('message'=>$tst_msg->message, 'num'=>$tst_msg->num));
            $this->send_message_toCard($response_text, $tst_msg->acid); //send data
            
            // 最終アクセス日時をテーブルにセット
            $this->machine_lastaccess_array[$tst_msg->acid] = time();
        }
        else if( $tst_msg->message == "card_state" ){
            // 状態テーブル更新
            $this->card_state_array[$tst_msg->acid][$tst_msg->no] = $tst_msg->state;
            
            // ランキングテーブル更新
            if($tst_msg->state === 'bingo'){
                if(empty($this->ranking_array[$tst_msg->acid])){
                    $this->ranking_array[$tst_msg->acid] = array();
                    $this->ranking_array[$tst_msg->acid][$this->current_ranking[$tst_msg->acid]] = array();
                }
                $this->ranking_array[$tst_msg->acid][$this->current_ranking[$tst_msg->acid]][] = $tst_msg->no;
            }
            
            // リーチ数算出
            $lizhi_cnt = 0;
            foreach ($this->card_state_array[$tst_msg->acid] as $state) {
                if($state === 'lizhi') $lizhi_cnt++;
            }
            
            // ビンゴマシーンにゲーム情報を送信
            $msg = json_encode(array('message'=>'state', 'entry_cnt'=>count($this->card_array[$tst_msg->acid]), 'lizhi_cnt'=>$lizhi_cnt, 'ranking'=>$this->ranking_array[$tst_msg->acid]));
            $this->machine_array[$tst_msg->acid]->send($msg);
            
            // 最終アクセス日時をテーブルにセット
            $this->machine_lastaccess_array[$tst_msg->acid] = time();
        }
        else if( $tst_msg->message == "entry" ){
            // ビンゴマシーン存在確認
            $result = 'NG';
            if(array_key_exists($tst_msg->acid, $this->machine_array)){
                $result = 'OK';
            }
            
            // エントリー画面にメッセージ送信
            $msg = json_encode(array('message'=>'entry', 'result'=>$result, 'cardurl'=>$this->card_url_array[$tst_msg->acid]));
            $from->send($msg);
            
            // 最終アクセス日時をテーブルにセット
            $this->machine_lastaccess_array[$tst_msg->acid] = time();
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $disconnected_machine_acid = array_search($conn, $this->machine_array);
        // ビンゴマシーンが接続断
        if($disconnected_machine_acid){
            unset($this->machine_array[$disconnected_machine_acid]);
            unset($this->machine_lastaccess_array[$disconnected_machine_acid]);
            unset($this->card_array[$disconnected_machine_acid]);
            unset($this->card_state_array[$disconnected_machine_acid]);
            unset($this->count_array[$disconnected_machine_acid]);
            unset($this->numsMax_array[$disconnected_machine_acid]);
            unset($this->ranking_array[$disconnected_machine_acid]);
            unset($this->current_ranking[$disconnected_machine_acid]);
            unset($this->card_url_array[$disconnected_machine_acid]);

            $this->writeLog("onClose", "machine:" . $disconnected_machine_acid);
        }
        else{
            foreach ($this->card_array as $acid => $socket_array) {
                $disconnected_card_no = array_search($conn, $socket_array);
                // ビンゴカードが接続断
                if($disconnected_card_no){
                    unset($this->card_array[$acid][$disconnected_card_no]);
                    unset($this->card_state_array[$acid][$disconnected_card_no]);

                    // リーチ数算出
                    $lizhi_cnt = 0;
                    foreach ($this->card_state_array[$acid] as $state) {
                        if($state === 'lizhi') $lizhi_cnt++;
                    }
                    
                    // ビンゴマシーンにゲーム情報を送信
                    $msg = json_encode(array('message'=>'state', 'entry_cnt'=>count($this->card_array[$acid]), 'lizhi_cnt'=>$lizhi_cnt, 'ranking'=>$this->ranking_array[$this->card_array[$acid]]));
                    $this->machine_array[$acid]->send($msg);

                    $this->writeLog("onClose", "card:" . $disconnected_card_no);
                }
            }
        }
    }
 
    public function onError(ConnectionInterface $conn, \Exception $e) {
        $this->writeLog("onError", "An error has occurred: {$e->getMessage()}");
 
        $conn->close();
    }

    /**
     * ビンゴカードへのメッセージ送信
     * 引数で指定したビンゴマシーン配下の全てのビンゴカードにメッセージを送信する
     */
    function send_message_toCard($msg, $_id)
    {
        if(!empty($this->card_array[$_id])){
            foreach($this->card_array[$_id] as $card){
                $card->send($msg);
            }
        }
    
        return true;
    }

    /**
     * 稼働チェック
     * 一定時間アプリが動いていない場合、対象のビンゴマシーン、ビンゴカードの接続を切断する
     */
    public function checkLastAccess(){
        $this->writeLog("checkLastAccess", "----");
        $this->writeLog("checkLastAccess", "machine:" . implode(',', array_keys($this->machine_array)));
        $this->writeLog("checkLastAccess", "lastaccess:" . implode(',', $this->machine_lastaccess_array));
        $this->writeLog("checkLastAccess", "machine-card:" . implode(',', array_keys($this->card_array)));
        $this->writeLog("checkLastAccess", "card-state:" . implode(',', array_keys($this->card_state_array)));
        $this->writeLog("checkLastAccess", "count:" . implode(',', $this->count_array));
        $this->writeLog("checkLastAccess", "max:" . implode(',', $this->numsMax_array));
        $this->writeLog("checkLastAccess", "ranking:" . implode(',', array_keys($this->ranking_array)));
        $this->writeLog("checkLastAccess", "current:" . implode(',', $this->current_ranking));
        $this->writeLog("checkLastAccess", "url:" . implode(',', $this->card_url_array));

        foreach ($this->machine_array as $acid => $socket_machine) {
            $past = time() - $this->machine_lastaccess_array[$acid];

            // 一定時間以上操作がなければソケット接続を切断する
            if($past > (60 * 60)){  // 1時間
                $this->writeLog("checkLastAccess", "access time out " . $acid);
                // ビンゴカードとの接続断
                if(!empty($card_array[$acid])){
                    foreach($card_array[$acid] as $socket_card){
                        $socket_card->close();
                    }
                }

                // ビンゴマシーンとの接続断
                $socket_machine->close();
            }
        }
    }

    /**
     * ログファイル出力
     */
    function writeLog($label, $msg){
        $logfile = '/var/log/necobingo/log' . date("Ymd") . '.log';

        error_log(date("Y-m-d H:i:s") . " [" . $label . "] " . $msg . "\n", 3, $logfile);
    }
}
