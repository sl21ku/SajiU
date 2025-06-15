# SajiU
## 開発のルール

ブランチの種類は3つ

    main
    release
    develop

開発を行う場合，developブランチをローカル環境(feature branch)に切り離して行う．

developでの開発が完了したらdevelopブランチに対してpull requestを投げる． リクエストが了承されたら開発完了．

本番環境に投げたい場合はdevelopブランチからreleaseブランチにpull requestを投げる．

mainブランチは完成品を扱うブランチのため，基本はいじらなくてOK.
## コミットメッセージについて

commit名の接頭辞(https://qiita.com/muranakar/items/20a7927ffa63a5ca226a) を参考にして書く．他の人が見てもわかりやすいメッセージを心がける．日本語で．

ex. git commit -m "fix:hogeがfugafugaであった問題を修正"
