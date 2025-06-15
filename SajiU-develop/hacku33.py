import cv2
import numpy as np
import sys

try:
    # コマンドライン引数の取得
    image_path_initial = sys.argv[1]
    image_path_new = sys.argv[2]
    # 画像の読み込みとリサイズ
    img1 = cv2.imread(image_path_new)
    img2 = cv2.imread(image_path_initial)
    # height, width = img2.shape[:2]
    height = 360
    width = 640
    img1 = cv2.resize(img1, (width, height))
    img2 = cv2.resize(img2, (width, height))
    # img2 = cv2.resize(img2, (width, height)) 
    # cv2.imshow('img1', img1)
    # cv2.imshow('img2', img2)

    hsv = cv2.cvtColor(img2, cv2.COLOR_BGR2HSV)
    # 画像のコピーを作成（元画像を変更しないように）
    flooded_img = hsv.copy()
    # マスクの作成（floodFillの仕様上、周囲に1ピクセル分の余白が必要）
    maskk = np.zeros((height+2, width+2), np.uint8)
    # 許容する色の範囲（loDiff: 下限, upDiff: 上限）
    loDiff = (15, 10, 10)  # 中央点との差の最小値
    upDiff = (15, 10, 10)  # 中央点との差の最大値
    x = int(width/2)
    y = int(height/2)
    # floodFillで領域を塗りつぶし
    retval, flooded_img, maskk, rect = cv2.floodFill(flooded_img, maskk, (x, y), (0, 255, 0), loDiff, upDiff, flags=4 | 255 << 8,) 
    maskk = maskk[1:-1, 1:-1]
    cv2.imshow('maskk', maskk)
    #穴埋める
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    maskk = cv2.morphologyEx(maskk, cv2.MORPH_CLOSE, kernel, iterations=3)
    # img2 の机に対応する部分だけを残し、それ以外を黒にする
    deskmask = cv2.bitwise_and(img2, img2, mask=maskk)
    cv2.imshow('deskmask', deskmask)
    # AKAZE特徴点抽出
    akaze = cv2.AKAZE_create(threshold=0.0002)
    kp1, des1 = akaze.detectAndCompute(img1, None)
    kp2, des2 = akaze.detectAndCompute(img2, None)
    # 特徴量の型をnp.float32に変換（必要な場合）
    # des1 = np.float32(des1)
    # des2 = np.float32(des2)
    # BFマッチング
    bf = cv2.BFMatcher()
    matches = bf.knnMatch(des1, des2, k=2)
    warped_mask = np.ones_like((height, width), dtype=np.uint8)
    # 良いマッチングを選択
    ratio = 0.9
    min_matches = 5
    good_matches = [m for m, n in matches if m.distance < ratio * n.distance]
    threshold_value = 30
    if len(good_matches) > min_matches:
        # 対応する特徴点を取得
        src_pts = np.float32([kp1[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
        dst_pts = np.float32([kp2[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

        # ホモグラフィ行列を計算
        H, mask = cv2.findHomography(src_pts, dst_pts, cv2.RANSAC, 5.0)
        # img1を射影変換
        warped_img1 = cv2.warpPerspective(img1, H, (width, height))
        warped_deskmask = cv2.warpPerspective(img2, H, (width, height))
        cv2.imshow('warped_result', warped_img1)
        cv2.imshow('warped_deskmask', warped_deskmask)
        # **=== 真っ白なマスク画像を作成 ===**
        white_mask = np.ones((height, width), dtype=np.uint8) * 255  # 真っ白な画像を作成
        # そのマスクに射影変換行列を適用
        warped_mask = cv2.warpPerspective(white_mask, H, (width, height))

        # **=== HSVチャンネルごとの差分処理 ===**
        hsv1 = cv2.cvtColor(warped_img1, cv2.COLOR_BGR2HSV)
        hsv2 = cv2.cvtColor(warped_deskmask, cv2.COLOR_BGR2HSV)
        diff_H = cv2.absdiff(hsv1[:, :, 0], hsv2[:, :, 0])
        diff_S = cv2.absdiff(hsv1[:, :, 1], hsv2[:, :, 1])
        diff_V = cv2.absdiff(hsv1[:, :, 2], hsv2[:, :, 2])
        # 3チャンネルの和を取る
        diff_sum = np.add.reduce([diff_H, diff_S, diff_V])
        diff_sum = np.clip(diff_sum, 0, 255)  # 255を超える値を255に制限
        diff_sum = diff_sum.astype(np.uint8)

        # マスク適用
        diff_sum = cv2.bitwise_and(diff_sum, maskk)
        cv2.imshow('diff_sum', diff_sum)
        _, bright_diff = cv2.threshold(diff_sum, 100, 255, cv2.THRESH_BINARY)

        # warped_maskの白領域に対するbright_diffの白領域の比率を計算
        masked_bright_diff = cv2.bitwise_and(bright_diff, bright_diff, mask=warped_mask)
        #穴埋める
        masked_bright_diff = cv2.morphologyEx(masked_bright_diff, cv2.MORPH_OPEN, kernel, iterations=1)
        cv2.imshow('masked_bright_diff', masked_bright_diff)
        # 白領域のピクセル数(机の面積)
        cv2.bitwise_and(maskk, warped_mask)
        cv2.imshow('maskk2', maskk)
        white_area = np.sum(maskk == 255)
        print(f'white_area: {white_area}')
        # bright_diffが白領域内にある部分のピクセル数(画素値が変化した面積)
        bright_area = np.sum(masked_bright_diff == 255)
        print(f'bright_area: {bright_area}')
        # 比率を計算
        if white_area == 0:  # 白領域がない場合
            # print('白領域が存在しません')
            ratio = 0
        else:
            ratio = bright_area / white_area

        print(int(100 - ratio * 100))
        match_img = cv2.drawMatches(img1, kp1, img2, kp2, good_matches, None, flags=cv2.DrawMatchesFlags_NOT_DRAW_SINGLE_POINTS)
        cv2.imshow('Matched Features', match_img)
    else:
        print(0)
    
    
    # キー押下で終了
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    sys.exit(0)  # 正常終了

except Exception as e:
    print(f"エラー: {str(e)}", file=sys.stderr)
    sys.exit(1)  # 異常終了