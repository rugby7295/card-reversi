# カード・リバーシ オンライン版

## Renderで公開する手順
1. GitHubで新しいリポジトリを作り、このフォルダの中身(index.html / server.js / package.json / render.yaml)をアップロード
2. render.com にGitHubでログイン → New → Web Service → そのリポジトリを選ぶ
3. Runtime: Node / Build Command: `echo ok` / Start Command: `node server.js` / Plan: Free
4. 出たURL(〇〇.onrender.com)を開き、「新しいルームを作る」→ 招待リンクを友達に送る

## 手元で動かす
`node server.js` → http://localhost:3000 を開く(外部パッケージ不要)
