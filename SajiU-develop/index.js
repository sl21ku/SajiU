const fs = require("fs")
const express = require('express')
const app = express()
app.use(express.urlencoded({extended: true, limit: '10mb'}))
const { Pool } = require("pg"); // PostgreSQL用
const path = require("path");
const { exec } = require('child_process');
require("dotenv").config();

// // 静的ファイルを提供するための設定を追加
// app.use(express.static(__dirname))
app.use("/img", express.static(__dirname + "/img")); // imgフォルダを公開
app.use(express.json()); // JSONデータを扱う

// PostgreSQLの設定（Renderの環境に合わせる）
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,  // パスワードを環境変数から取得
  port: process.env.DB_PORT || 5432,
  // Render.comのDBではSSLが求められる
  ssl: {rejectUnauthorized: false,// 証明書の検証はいったん無しで
  },
});
module.exports = pool;

// 静的ファイルを提供するための設定を追加
app.use(express.static(__dirname))

app.get("/toppage", function(req, res) {
    res.sendFile(__dirname + "/toppage.html")
})

app.get("/index", function(req, res) {
        res.sendFile(__dirname + "/index.html")
})

app.get("/camera", function(req, res) {
    res.sendFile(__dirname + "/camera.html")
})

app.get("/friend", function(req, res) {
    res.sendFile(__dirname + "/friend.html")
})

app.get("/dead", function(req, res) {
    res.sendFile(__dirname + "/dead.html")
})

app.post("/friend", async function(req, res) {
  const {username} = req.body;
  try {
    const friend_result = await pool.query("SELECT user_name, today_score FROM users");

    if (friend_result.rows.length > 0) {
      res.json(friend_result.rows);
    } else {
      res.status(404).json({ error: "友達が見つかりません" });
    }
  } catch (error) {
    console.error("Error fetching friend:", error);
    res.status(500).json({ error: "データベースエラー" });
  }
})

// app.get("/gage", function(req, res){
//     res.sendFile(__dirname + "/toppage.html")
// })

// ユーザー情報を取得
app.post("/user", async (req, res) => {
//   console.log(req.body); // ここでリクエストボディをログに出力
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "ユーザー名が必要です" });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE user_name = $1", [username]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      res.json({
        username: user.user_name,
        initial_image_path: user.initial_image_path,
        today_score: user.today_score,
        before_score: user.before_score
      });
    } else {
      res.status(404).json({ error: "ユーザーが見つかりません" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "データベースエラー" });
  }
});

// 画像表示ページ
app.get("/userpage", (req, res) => {
  res.sendFile(path.join(__dirname, "userpage.html"));
});

app.get("/python", function(req, res) {
    const username = req.query.username; // クエリパラメータからユーザー名を取得

    // ユーザー名に基づいて画像パスをデータベースから取得
    // ここでは仮に画像パスが "/path/to/user/image.jpg" だとします
    const imagePath = `img/initial_tsei.png`; // 例: ユーザーごとの画像パスを取得する

    // 出力画像のパス（変換後）
    const outputImagePath = `img/output_grayscale_initial.png`;

    // Pythonスクリプトを実行
    exec(`python python_script.py ${imagePath} ${outputImagePath}`, (err, stdout, stderr) => {
        if (err) {
            console.error('Pythonスクリプト実行エラー:', stderr);
            return res.status(500).send('Pythonスクリプト実行エラー');
        }
        console.log('Pythonスクリプト出力:', stdout);
        // グレースケール変換後の画像を表示するHTMLを生成
        res.send(`
            <html>
                <head><title>Python Output</title></head>
                <body>
                    <h1>${username}のグレースケール画像</h1>
                    <img src="${outputImagePath}" alt="グレースケール画像">
                    <a href="/userpage?username=${username}">戻る</a>
                </body>
            </html>
        `);
    });
});
// app.get("/after", function(req, res){
//     res.sendFile(__dirname + "/afterHome.html")
// })

// 新しいルーティングファイルをインポートして使用
const photoRoutes = require('./photoRoutes');
app.use('/', photoRoutes);

const port = process.env.PORT || 5050

app.listen(port, function() {
    console.log(`Server running at http://localhost:${port}`);
});