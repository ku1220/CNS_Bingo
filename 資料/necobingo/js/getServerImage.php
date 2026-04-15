<?php

$filePath = filter_input(INPUT_GET, "f");

header("Access-Control-Allow-Origin: *");
header("Content-Type: Content-type: image/png");
readfile('../' . $filePath);
