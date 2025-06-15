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
    height, width = 360, 640
    img1 = cv2.resize(img1, (width, height))
    img2 = cv2.resize(img2, (width, height))
    
    # RGBチャンネルごとの差分計算
    diff_R = cv2.absdiff(img1[:, :, 2], img2[:, :, 2])
    diff_G = cv2.absdiff(img1[:, :, 1], img2[:, :, 1])
    diff_B = cv2.absdiff(img1[:, :, 0], img2[:, :, 0])
    
    # 3チャンネルの差分の合計
    diff_sum = diff_R + diff_G + diff_B
    diff_sum = np.clip(diff_sum, 0, 255).astype(np.uint8)
    
    # しきい値処理（変更領域の抽出）
    _, bright_diff = cv2.threshold(diff_sum, 40, 255, cv2.THRESH_BINARY)
    
    # ノイズ除去（モルフォロジー処理）
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    bright_diff = cv2.morphologyEx(bright_diff, cv2.MORPH_OPEN, kernel, iterations=1)
    
    # # 差分結果の表示
    # cv2.imshow('diff_sum', diff_sum)
    # cv2.imshow('bright_diff', bright_diff)
    
    # 差分の白領域（変更されたピクセル数）を計算
    bright_area = np.sum(bright_diff == 255)
    total_area = width * height
    change_ratio = (bright_area / total_area) * 100
    print(100 - int(change_ratio))
    # 白(255)と黒(0)のピクセル数をカウント
    white_pixels = np.sum(bright_diff == 255)
    black_pixels = np.sum(bright_diff == 0)

    # 結果を表示
    # print(f"White Pixels (Changed Area): {white_pixels}")
    # print(f"Black Pixels (Unchanged Area): {black_pixels}")
    # print(f"total Pixels: {total_area}")
    # キー押下で終了
    # cv2.waitKey(0)
    # cv2.destroyAllWindows()
    sys.exit(0)  # 正常終了

except Exception as e:
    print(f"エラー: {str(e)}", file=sys.stderr)
    sys.exit(1)  # 異常終了