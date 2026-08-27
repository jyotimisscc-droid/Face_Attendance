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
        // ==========================================
// REAL BROWSER GPS
// ==========================================

function getRealGPS() {

  return new Promise(function(resolve, reject) {

    if (!navigator.geolocation) {

      reject(
        new Error(
          "Geolocation is not supported by this browser."
        )
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(

      function(position) {

        var latitude =
          position.coords.latitude;

        var longitude =
          position.coords.longitude;

        var accuracy =
          position.coords.accuracy;

        console.log("========== REAL GPS ==========");
        console.log("Latitude:", latitude);
        console.log("Longitude:", longitude);
        console.log("Accuracy:", accuracy, "meters");

        resolve({
          latitude: latitude,
          longitude: longitude,
          accuracy: accuracy
        });
      },

      function(error) {

        var message;

        switch (error.code) {

          case error.PERMISSION_DENIED:
            message = "GPS permission denied.";
            break;

          case error.POSITION_UNAVAILABLE:
            message = "GPS location unavailable.";
            break;

          case error.TIMEOUT:
            message = "GPS request timed out.";
            break;

          default:
            message = "Unable to get GPS location.";
        }

        reject(new Error(message));
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }

    );
  });
}


// ==========================================
// APPS SCRIPT BACKEND URL
// ==========================================

var ATTENDANCE_API_URL =
  "YOUR_APPS_SCRIPT_WEB_APP_URL";


// ==========================================
// SEND REAL GPS TO BACKEND
// ==========================================

async function sendGPSToBackend(employeeId) {

  try {

    console.log("========== ATTENDANCE START ==========");

    // --------------------------------------
    // 1. GET REAL BROWSER GPS
    // --------------------------------------

    var gps = await getRealGPS();

    console.log("GPS received successfully");


    // --------------------------------------
    // 2. SEND GPS + EMPLOYEE ID
    // --------------------------------------

    var response = await fetch(
      ATTENDANCE_API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "text/plain;charset=utf-8"
        },

        body: JSON.stringify({

          employeeId: employeeId,

          latitude: gps.latitude,

          longitude: gps.longitude

        })
      }
    );


    // --------------------------------------
    // 3. READ BACKEND RESPONSE
    // --------------------------------------

    var result = await response.json();

    console.log(
      "Backend Response:",
      result
    );


    // --------------------------------------
    // 4. ATTENDANCE RESULT
    // --------------------------------------

    if (result.success) {

      alert(
        "ATTENDANCE MARKED SUCCESSFULLY\n\n" +

        "Employee: " +
        result.employeeName +

        "\nLocation: " +
        result.locationName +

        "\nDistance: " +
        result.distance +
        " meters" +

        "\nStatus: " +
        result.status
      );

    } else {

      alert(
        "ATTENDANCE REJECTED\n\n" +
        result.message
      );
    }


    return result;


  } catch (error) {

    console.error(
      "Attendance Error:",
      error
    );

    alert(
      "ATTENDANCE ERROR\n\n" +
      error.message
    );

    return {
      success: false,
      message: error.message
    };
  }
}


// ==========================================
// TEST REAL GPS ATTENDANCE
// ==========================================

function testGPSAttendance() {

  // Temporary testing only
  // Later Face Recognition will provide
  // this Employee ID automatically.

  sendGPSToBackend("EMP001");
}

    }
);
