# CNS Bingo

リアルタイムで進行できるブラウザ版ビンゴアプリです。  
主催者は PC からルームを作成し、参加者はスマートフォンからルームコードまたは QR コードで参加できます。

## Features

- 主催者 / 参加者を1つのWebアプリで切り替え
- Socket.IO によるリアルタイム同期
- 3x3 / 5x5 / 7x7 のビンゴカード
- 自動チェック ON / OFF
- `elegant` / `pop` / `cat` のデザインプリセット
- 参加用 QR コード表示

## Requirements

- Node.js
- npm

## Setup

```bash
npm install
```

## Run

```bash
npm start
```

起動後、ブラウザで以下へアクセスします。

```text
http://localhost:3000
```

## How To Use

1. 主催者がルームを作成
2. 参加者がルームコードまたは QR コードから参加
3. 主催者が抽選を開始
4. 参加者側でカードをチェックしてビンゴ進行

## Project Structure

```text
.
├── index.html
├── styles.css
├── app.js
├── server.js
├── images/
├── package.json
└── package-lock.json
```

## Notes

- ルーム状態はメモリ保持です。サーバー再起動で消えます。
- `資料/` フォルダは公開対象から除外しています。
