<?php
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

use MyApp\Controller;

require dirname(__DIR__) . '/vendor/autoload.php';

$controller = NULL;
$server = IoServer::factory(
        new HttpServer(
                new WsServer(
                        $controller = new Controller()
                )
        )
        ,9001
);

$server->loop->addPeriodicTimer(10, function() use ($controller) {
        $controller->checkLastAccess();
});

$server->run();
