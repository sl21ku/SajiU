const express = require("express");
const { Pool } = require("pg"); // PostgreSQL用
const path = require("path");
require("dotenv").config();
const app = express();
const PORT = 3000;

app.use(express.static("public"));
app.use(express.static("public"));
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

// ルートで toppage.html を提供
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "toppage.html"));
});

// ユーザー情報を取得
app.post("/user", async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
