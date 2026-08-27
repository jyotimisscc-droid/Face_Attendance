// =====================================================
// FACE ATTENDANCE SYSTEM
// CAMERA + FACE EMBEDDING + GPS + APPS SCRIPT
// =====================================================


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let cameraStream = null;

let faceModelsLoaded = false;

let capturedFaceEmbedding = null;

let capturedImageData = null;


// =====================================================
// DOM ELEMENTS
// =====================================================

const video =
    document.getElementById("camera");

const canvas =
    document.getElementById("canvas");

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


// =====================================================
// APPS SCRIPT BACKEND URL
// =====================================================

const ATTENDANCE_API_URL =
    "https://script.google.com/macros/s/AKfycbzFV8jtvcMVmRSbHROlQ_-5HIAxPKg-3xbmyeTE5a10JnTQffsctOx3CQyMYGM_IsD3/exec";


// =====================================================
// FACE MODEL URL
// =====================================================
//
// face-api.js ke models is folder structure mein
// available hone chahiye:
//
// /models/
//    tiny_face_detector_model-weights_manifest.json
//    tiny_face_detector_model-shard1
//    face_landmark_68_model-weights_manifest.json
//    face_landmark_68_model-shard1
//    face_recognition_model-weights_manifest.json
//    face_recognition_model-shard1
//
// =====================================================

const FACE_MODEL_URL =
    "./models";


// =====================================================
// LOAD FACE MODELS
// =====================================================

async function loadFaceModels() {

    try {

        statusText.textContent =
            "Loading face recognition models...";

        console.log(
            "Loading face recognition models..."
        );


        // ---------------------------------------------
        // Tiny Face Detector
        // ---------------------------------------------

        await faceapi.nets.tinyFaceDetector.loadFromUri(
            FACE_MODEL_URL
        );


        // ---------------------------------------------
        // Face Landmark Model
        // ---------------------------------------------

        await faceapi.nets.faceLandmark68Net.loadFromUri(
            FACE_MODEL_URL
        );


        // ---------------------------------------------
        // Face Recognition Model
        // ---------------------------------------------

        await faceapi.nets.faceRecognitionNet.loadFromUri(
            FACE_MODEL_URL
        );


        faceModelsLoaded = true;


        console.log(
            "Face recognition models loaded successfully."
        );


        statusText.textContent =
            "Face recognition ready";


    } catch (error) {

        console.error(
            "Face Model Error:",
            error
        );

        faceModelsLoaded = false;

        statusText.textContent =
            "Face model loading failed";

        alert(
            "Face recognition model load nahi ho paya.\n\n" +
            "Check karo ki models folder sahi location par hai."
        );
    }
}


// =====================================================
// PAGE LOAD
// =====================================================

window.addEventListener(
    "DOMContentLoaded",
    async function () {

        console.log(
            "Face Attendance System Started"
        );

        await loadFaceModels();

    }
);


// =====================================================
// START CAMERA
// =====================================================

async function startCamera() {

    try {

        // ---------------------------------------------
        // Check Face Models
        // ---------------------------------------------

        if (!faceModelsLoaded) {

            alert(
                "Face recognition system abhi ready nahi hai.\n\n" +
                "Pehle face models load hone do."
            );

            return;
        }


        // ---------------------------------------------
        // Camera Permission
        // ---------------------------------------------

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


        // ---------------------------------------------
        // Attach Camera
        // ---------------------------------------------

        video.srcObject =
            cameraStream;

        video.style.display =
            "block";

        cameraMessage.style.display =
            "none";


        // ---------------------------------------------
        // Button State
        // ---------------------------------------------

        startCameraBtn.disabled =
            true;

        captureBtn.disabled =
            false;

        stopCameraBtn.disabled =
            false;


        statusText.textContent =
            "Camera is running";


        console.log(
            "Camera started successfully."
        );


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


// =====================================================
// CAPTURE PHOTO + FACE EMBEDDING
// =====================================================

async function capturePhoto() {

    try {

        // ---------------------------------------------
        // Camera Check
        // ---------------------------------------------

        if (!cameraStream) {

            alert(
                "Camera pehle start karo."
            );

            return;
        }


        // ---------------------------------------------
        // Face Model Check
        // ---------------------------------------------

        if (!faceModelsLoaded) {

            alert(
                "Face recognition model ready nahi hai."
            );

            return;
        }


        // ---------------------------------------------
        // Video Dimensions
        // ---------------------------------------------

        const width =
            video.videoWidth;

        const height =
            video.videoHeight;


        if (
            width === 0 ||
            height === 0
        ) {

            alert(
                "Camera abhi ready nahi hai.\n" +
                "2-3 seconds wait karke dobara try karo."
            );

            return;
        }


        // ---------------------------------------------
        // Capture Frame
        // ---------------------------------------------

        canvas.width =
            width;

        canvas.height =
            height;


        const context =
            canvas.getContext("2d");


        context.drawImage(
            video,
            0,
            0,
            width,
            height
        );


        // ---------------------------------------------
        // Convert Image
        // ---------------------------------------------

        capturedImageData =
            canvas.toDataURL(
                "image/jpeg",
                0.90
            );


        capturedImage.src =
            capturedImageData;


        photoSection.style.display =
            "block";


        // ---------------------------------------------
        // Face Detection
        // ---------------------------------------------

        statusText.textContent =
            "Detecting face...";


        console.log(
            "Starting face detection..."
        );


        const detection =
            await faceapi
                .detectSingleFace(
                    canvas,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 416,
                        scoreThreshold: 0.5
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();


        // ---------------------------------------------
        // No Face Found
        // ---------------------------------------------

        if (!detection) {

            capturedFaceEmbedding =
                null;


            statusText.textContent =
                "Face not detected";


            alert(
                "Face detect nahi hua.\n\n" +
                "Face ko camera ke saamne seedha rakho " +
                "aur dobara capture karo."
            );


            return;
        }


        // ---------------------------------------------
        // Face Found
        // ---------------------------------------------

        console.log(
            "Face detected successfully."
        );


        // ---------------------------------------------
        // FACE EMBEDDING
        // ---------------------------------------------
        //
        // faceDescriptor = 128 dimensional vector
        //
        // Example:
        //
        // Float32Array(128)
        //
        // Isko Array mein convert kar rahe hain
        // taaki JSON ke through backend ko bhej saken.
        // ---------------------------------------------

        capturedFaceEmbedding =
            Array.from(
                detection.descriptor
            );


        console.log(
            "Face embedding generated."
        );

        console.log(
            "Embedding length:",
            capturedFaceEmbedding.length
        );


        // ---------------------------------------------
        // Validate Embedding
        // ---------------------------------------------

        if (
            capturedFaceEmbedding.length !== 128
        ) {

            capturedFaceEmbedding =
                null;


            statusText.textContent =
                "Invalid face embedding";


            alert(
                "Face embedding generate nahi hua."
            );


            return;
        }


        // ---------------------------------------------
        // Success
        // ---------------------------------------------

        statusText.textContent =
            "Face verified - embedding generated";


        console.log(
            "========== FACE EMBEDDING =========="
        );

        console.log(
            capturedFaceEmbedding
        );

        console.log(
            "===================================="
        );


        alert(
            "Face successfully detected.\n\n" +
            "Face embedding generated successfully."
        );


    } catch (error) {

        console.error(
            "Face Capture Error:",
            error
        );


        capturedFaceEmbedding =
            null;


        statusText.textContent =
            "Face processing failed";


        alert(
            "Face processing mein error aaya.\n\n" +
            error.message
        );
    }
}


// =====================================================
// STOP CAMERA
// =====================================================

function stopCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(function (track) {

                track.stop();

            });

        cameraStream =
            null;
    }


    video.srcObject =
        null;


    video.style.display =
        "none";


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


    // ---------------------------------------------
    // Clear Captured Face
    // ---------------------------------------------

    capturedFaceEmbedding =
        null;

    capturedImageData =
        null;


    console.log(
        "Camera stopped."
    );
}


// =====================================================
// PAGE CLOSE / REFRESH
// =====================================================

window.addEventListener(
    "beforeunload",
    function () {

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(function (track) {

                    track.stop();

                });

            cameraStream =
                null;
        }

    }
);


// =====================================================
// REAL BROWSER GPS
// =====================================================

function getRealGPS() {

    return new Promise(
        function (resolve, reject) {

            if (!navigator.geolocation) {

                reject(
                    new Error(
                        "Geolocation is not supported by this browser."
                    )
                );

                return;
            }


            navigator.geolocation.getCurrentPosition(

                function (position) {

                    const latitude =
                        position.coords.latitude;

                    const longitude =
                        position.coords.longitude;

                    const accuracy =
                        position.coords.accuracy;


                    console.log(
                        "========== REAL GPS =========="
                    );


                    console.log(
                        "Latitude:",
                        latitude
                    );


                    console.log(
                        "Longitude:",
                        longitude
                    );


                    console.log(
                        "Accuracy:",
                        accuracy,
                        "meters"
                    );


                    resolve({

                        latitude:
                            latitude,

                        longitude:
                            longitude,

                        accuracy:
                            accuracy

                    });

                },


                function (error) {

                    let message;


                    switch (error.code) {

                        case error.PERMISSION_DENIED:

                            message =
                                "GPS permission denied.";

                            break;


                        case error.POSITION_UNAVAILABLE:

                            message =
                                "GPS location unavailable.";

                            break;


                        case error.TIMEOUT:

                            message =
                                "GPS request timed out.";

                            break;


                        default:

                            message =
                                "Unable to get GPS location.";
                    }


                    reject(
                        new Error(message)
                    );
                },


                {

                    enableHighAccuracy:
                        true,

                    timeout:
                        15000,

                    maximumAge:
                        0

                }
            );
        }
    );
}


// =====================================================
// SEND GPS + FACE EMBEDDING TO BACKEND
// =====================================================

async function sendGPSToBackend(employeeId) {

    try {

        console.log(
            "========== ATTENDANCE START =========="
        );


        // =================================================
        // 1. EMPLOYEE ID CHECK
        // =================================================

        if (
            !employeeId ||
            employeeId.trim() === ""
        ) {

            alert(
                "Employee ID missing hai."
            );

            return {

                success:
                    false,

                message:
                    "Employee ID missing."

            };
        }


        // =================================================
        // 2. FACE EMBEDDING CHECK
        // =================================================

        if (
            !capturedFaceEmbedding ||
            capturedFaceEmbedding.length !== 128
        ) {

            alert(
                "Pehle camera se face capture karo.\n\n" +
                "Valid face embedding required hai."
            );

            return {

                success:
                    false,

                message:
                    "Face embedding missing."

            };
        }


        // =================================================
        // 3. GET REAL GPS
        // =================================================

        statusText.textContent =
            "Getting your location...";


        const gps =
            await getRealGPS();


        console.log(
            "GPS received successfully."
        );


        // =================================================
        // 4. PREPARE REQUEST
        // =================================================

        statusText.textContent =
            "Checking face and location...";


        const requestData = {

            employeeId:
                employeeId,

            latitude:
                gps.latitude,

            longitude:
                gps.longitude,

            accuracy:
                gps.accuracy,

            faceEmbedding:
                capturedFaceEmbedding

        };


        console.log(
            "Attendance request prepared."
        );


        console.log(
            "Employee ID:",
            employeeId
        );


        console.log(
            "GPS:",
            gps
        );


        console.log(
            "Face embedding length:",
            capturedFaceEmbedding.length
        );


        // =================================================
        // 5. SEND TO APPS SCRIPT
        // =================================================

        const response =
            await fetch(

                ATTENDANCE_API_URL,

                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body:
                        JSON.stringify(
                            requestData
                        )

                }
            );


        // =================================================
        // 6. CHECK HTTP RESPONSE
        // =================================================

        if (!response.ok) {

            throw new Error(
                "Backend HTTP error: " +
                response.status
            );
        }


        // =================================================
        // 7. READ BACKEND RESPONSE
        // =================================================

        const result =
            await response.json();


        console.log(
            "Backend Response:",
            result
        );


        // =================================================
        // 8. ATTENDANCE SUCCESS
        // =================================================

        if (result.success) {

            statusText.textContent =
                "Attendance marked successfully";


            alert(

                "ATTENDANCE MARKED SUCCESSFULLY\n\n" +

                "Employee: " +
                (
                    result.employeeName ||
                    employeeId
                ) +

                "\nLocation: " +
                (
                    result.locationName ||
                    "Verified"
                ) +

                "\nDistance: " +
                (
                    result.distance ??
                    "N/A"
                ) +
                " meters" +

                "\nFace Match: " +
                (
                    result.faceMatch ??
                    "Verified"
                ) +

                "\nStatus: " +
                (
                    result.status ||
                    "Present"
                )

            );

        }


        // =================================================
        // 9. ATTENDANCE REJECTED
        // =================================================

        else {

            statusText.textContent =
                "Attendance rejected";


            alert(

                "ATTENDANCE REJECTED\n\n" +

                (
                    result.message ||
                    "Attendance could not be marked."
                )

            );
        }


        return result;


    } catch (error) {

        console.error(
            "Attendance Error:",
            error
        );


        statusText.textContent =
            "Attendance failed";


        alert(

            "ATTENDANCE ERROR\n\n" +

            error.message

        );


        return {

            success:
                false,

            message:
                error.message

        };
    }
}


// =====================================================
// TEST GPS + FACE ATTENDANCE
// =====================================================

async function testGPSAttendance() {

    // ---------------------------------------------
    // Temporary testing only.
    //
    // Later:
    // Employee ID login/email se automatically
    // backend se identify hoga.
    // ---------------------------------------------

    const employeeId =
        "EMP001";


    await sendGPSToBackend(
        employeeId
    );
}


// =====================================================
// OPTIONAL: GET CAPTURED EMBEDDING
// =====================================================
//
// Debug ke liye.
// Production mein console mein embedding
// show karna avoid karna.
// =====================================================

function getCapturedFaceEmbedding() {

    return capturedFaceEmbedding;
}


// =====================================================
// OPTIONAL: CHECK FACE STATUS
// =====================================================

function isFaceCaptured() {

    return (
        capturedFaceEmbedding !== null &&
        capturedFaceEmbedding.length === 128
    );
}
