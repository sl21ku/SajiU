const express = require('express');
const path = require('path');
const pool = require('./index'); // index.js から pool を取得
const fs = require('fs');
const router = express.Router();
const { exec } = require('child_process');

router.post("/photo", function(req, res) {
    res.sendFile(path.join(__dirname, 'photo.html'));
});

router.post("/photosended", async function(req, res) {
    //const { photoData, username } = req.body; // JSON のリクエストボディからデータを取得
    // console.log(req);
    const photoData = req.body.photo;
    const base64Data = photoData.replace(/^data:image\/png;base64,/, "");
    const fileName = `${Date.now()}.png`;
    const filePath = path.join(__dirname, 'photos', fileName);
    const username = req.body.username; // クエリパラメータからユーザー名を取得できるはず
    // const filePath = `img/today_tsei.png`;

    fs.writeFile(filePath, base64Data, 'base64', function(err) {
        if (err) {
            console.log(err);
            res.status(500).send("写真の保存に失敗しました");
        }
    });
    
    if (!username || !photoData) {
        return res.status(400).json({ error: "ユーザー名と写真データが必要です" });
    }

    try {
        // データベースから initial_image_path を取得
        const result = await pool.query("SELECT initial_image_path FROM users WHERE user_name = $1", [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "ユーザーが見つかりません" });
        }
        const initial_imagePath = result.rows[0].initial_image_path; // 取得した画像パス
        // Pythonスクリプトを実行
        exec(`python python_script.py  ${initial_imagePath} ${filePath} `, async (err, stdout, stderr) => {
            if (err) {
                console.error('Pythonスクリプト実行エラー:', stderr);
                return res.status(500).send('Pythonスクリプト実行エラー');
            }
            console.log("今回のスコア:", stdout.trim()); // スコアを取得
            const todayScore = parseFloat(stdout.trim()); // 数値に変換

            if (isNaN(todayScore)) {
                return res.status(500).send("スコアの取得に失敗しました");
            }

            try {
                // today_score をデータベースに更新
                await pool.query("UPDATE users SET today_score = $1 WHERE user_name = $2", [todayScore, username]);
                res.sendFile(path.join(__dirname, "photosended.html"));
            } catch (dbError) {
                console.error("データベース更新エラー:", dbError);
                res.status(500).json({ error: "スコアの保存に失敗しました" });
            }
        });
    } catch (error) {
        console.error("データベースエラー:", error);
        res.status(500).json({ error: "データベースエラー" });
    }
});

// router.post("/save-photo", function(req, res) {
//     const photoData = req.body.photo;
//     const base64Data = photoData.replace(/^data:image\/png;base64,/, "");
//     const fileName = `${Date.now()}.png`;
//     const filePath = path.join(__dirname, 'photos', fileName);

//     fs.writeFile(filePath, base64Data, 'base64', function(err) {
//         if (err) {
//             console.log(err);
//             res.status(500).send("写真の保存に失敗しました");
//         } else {
//             res.sendFile(path.join(__dirname, 'photosended.html'));
//         }
//     });
// });

// // 写真を表示するエンドポイント
// router.get("/photos/:fileName", function(req, res) {
//     const fileName = req.params.fileName;
//     const filePath = path.join(__dirname, 'photos', fileName);

//     fs.access(filePath, fs.constants.F_OK, (err) => {
//         if (err) {
//             res.status(404).send("写真が見つかりません");
//         } else {
//             res.sendFile(filePath);
//         }
//     });
// });

// // 写真の一覧を表示するエンドポイント
// router.get("/photos", function(req, res) {
//     const photosDir = path.join(__dirname, 'photos');
//     fs.readdir(photosDir, (err, files) => {
//         if (err) {
//             console.log(err);
//             res.status(500).send("写真の一覧を取得できませんでした");
//         } else {
//             const photoList = files.map(file => `<li><a href="/photos/${file}">${file}</a></li>`).join('');
//             res.send(`
//                 <!DOCTYPE html>
//                 <html lang="en">
//                 <head>
//                     <meta charset="UTF-8">
//                     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//                     <title>保存された写真</title>
//                 </head>
//                 <body>
//                     <h1>保存された写真</h1>
//                     <ul>${photoList}</ul>
//                     <a href="/">ホームに戻る</a>
//                 </body>
//                 </html>
//             `);
//         }
//     });
// });
module.exports = router;