let cameraStream = null;

const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");

const startCameraBtn =
    document.getElementById("startCameraBtn");

const captureBtn =
    document.getElementById("captureBtn");

const stopCameraBtn =
    document.getElementById("stopCameraBtn");

const cameraMessage =
    document.getElementById("cameraMessage");

const statusText =
    document.getElementById("statusText");

const capturedImage =
    document.getElementById("capturedImage");

const photoSection =
    document.getElementById("photoSection");


// ==============================
// START CAMERA
// ==============================

async function startCamera() {

    try {

        statusText.textContent =
            "Requesting camera permission...";

        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode: "user",
                    width: {
                        ideal: 1280
                    },
                    height: {
                        ideal: 720
                    }
                },

                audio: false
            });

        video.srcObject = cameraStream;

        video.style.display = "block";

        cameraMessage.style.display = "none";

        startCameraBtn.disabled = true;

        captureBtn.disabled = false;

        stopCameraBtn.disabled = false;

        statusText.textContent =
            "Camera is running";

    } catch (error) {

        console.error(
            "Camera Error:",
            error
        );

        statusText.textContent =
            "Camera access failed";

        alert(
            "Camera access nahi mila.\n\n" +
            "Browser camera permission check karo."
        );
    }
}


// ==============================
// CAPTURE PHOTO
// ==============================

function capturePhoto() {

    if (!cameraStream) {

        alert(
            "Camera pehle start karo."
        );

        return;
    }

    const width =
        video.videoWidth;

    const height =
        video.videoHeight;

    if (width === 0 || height === 0) {

        alert(
            "Camera abhi ready nahi hai. " +
            "2-3 seconds wait karke dobara try karo."
        );

        return;
    }

    canvas.width = width;
    canvas.height = height;

    const context =
        canvas.getContext("2d");

    context.drawImage(
        video,
        0,
        0,
        width,
        height
    );

    const imageData =
        canvas.toDataURL(
            "image/jpeg",
            0.90
        );

    capturedImage.src =
        imageData;

    photoSection.style.display =
        "block";

    statusText.textContent =
        "Photo captured successfully";

    console.log(
        "Photo captured successfully"
    );
}


// ==============================
// STOP CAMERA
// ==============================

function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(function(track) {

                track.stop();

            });

        cameraStream = null;
    }

    video.srcObject = null;

    video.style.display = "none";

    cameraMessage.style.display =
        "block";

    cameraMessage.textContent =
        "Camera is stopped";

    startCameraBtn.disabled =
        false;

    captureBtn.disabled =
        true;

    stopCameraBtn.disabled =
        true;

    statusText.textContent =
        "Camera stopped";
}


// ==============================
// PAGE CLOSE / REFRESH
// ==============================

window.addEventListener(
    "beforeunload",
    function() {

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(function(track) {

                    track.stop();

                });
        }

    }
);
