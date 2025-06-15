document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const snapButton = document.getElementById('snap');
    const useFrontCameraButton = document.getElementById('useFrontCamera');
    const useBackCameraButton = document.getElementById('useBackCamera');
    const context = canvas.getContext('2d');
    const params = new URLSearchParams(window.location.search);
    const username = params.get("username");

    function startCamera(facingMode) {
        const constraints = {
            video: {
                facingMode: { exact: facingMode },
                width: { ideal: 360 },
                height: { ideal: 640 }
            }
        };

        // カメラの向きに応じて幅と高さを設定
        if (facingMode === 'user') {
            constraints.video.width = { ideal: 640 };
            constraints.video.height = { ideal: 360 };
            constraints.video.facingMode = 'user';
        } else {
            constraints.video.width = { ideal: 640 };
            constraints.video.height = { ideal: 360 };
            constraints.video.facingMode = {exact: 'environment'};
        }

        navigator.mediaDevices.getUserMedia(constraints)
            .then(function(stream) {
                video.srcObject = stream;
            })
            .catch(function(err) {
                console.log("カメラの起動に失敗しました: " + err);
            });
    }

    // 初期カメラ起動（アウトカメラ）
    startCamera('environment');

    // インカメラを使用するボタンの処理
    useFrontCameraButton.addEventListener('click', function() {
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        startCamera('user');
    });

    // アウトカメラを使用するボタンの処理
    useBackCameraButton.addEventListener('click', function() {
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
        }
        startCamera('environment');
    });

    // 写真を撮る処理
    snapButton.addEventListener('click', function(event) {
        event.preventDefault(); // フォームの送信を防ぐ
        const actionUrl = "/photo?username=" + encodeURIComponent(username);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');

        // ローカルストレージに写真データを保存
        localStorage.setItem('photoData', dataURL);
        localStorage.setItem('photoTaken', 'true');

        // フォームを作成して写真データを送信
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = actionUrl;

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'photo';
        input.value = dataURL;
        form.appendChild(input);

        // ユーザー名を追加
        const usernameInput = document.createElement('input');
        usernameInput.type = 'hidden';
        usernameInput.name = 'username';
        usernameInput.value = username;
        form.appendChild(usernameInput);
        document.body.appendChild(form);
        form.submit();
    });
});