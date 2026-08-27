// =====================================================
// FACE ATTENDANCE SYSTEM
// CAMERA + FACE EMBEDDING + FACE REGISTRATION
// FACE VERIFICATION + GPS + ATTENDANCE
// =====================================================


// =====================================================
// GLOBAL VARIABLES
// =====================================================

let loggedEmployee = null;

let selectedAttendanceType = null;

let cameraStream = null;

let capturedFaceImage = null;

let currentEmbedding = null;

let faceVerified = false;

let modelsLoaded = false;


// =====================================================
// APPS SCRIPT BACKEND URL
// =====================================================

const ATTENDANCE_API_URL =
    "https://script.google.com/macros/s/AKfycbzFV8jtvcMVmRSbHROlQ_-5HIAxPKg-3xbmyeTE5a10JnTQffsctOx3CQyMYGM_IsD3/exec";


// =====================================================
// FACE MODEL URL
// =====================================================

const MODEL_URL =
    "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/";


// =====================================================
// LOAD FACE MODELS
// =====================================================

async function loadFaceModels() {

    const status =
        document.getElementById("modelStatus");

    try {

        status.textContent =
            "Loading face detection model...";


        await faceapi.nets.tinyFaceDetector.loadFromUri(
            MODEL_URL
        );


        status.textContent =
            "Loading face landmark model...";


        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(
            MODEL_URL
        );


        status.textContent =
            "Loading face recognition model...";


        await faceapi.nets.faceRecognitionNet.loadFromUri(
            MODEL_URL
        );


        modelsLoaded = true;


        status.textContent =
            "Face recognition system ready.";


        console.log(
            "FACE MODELS LOADED"
        );

    }

    catch (error) {

        console.error(
            "MODEL LOAD ERROR:",
            error
        );


        modelsLoaded = false;


        status.textContent =
            "Face model loading failed.";


        alert(
            "Face recognition model load nahi hua.\n\n" +
            error.message
        );

    }

}


// =====================================================
// PAGE LOAD
// =====================================================

window.addEventListener(
    "DOMContentLoaded",
    function() {

        loadFaceModels();

    }
);


// =====================================================
// LOGIN EMPLOYEE
// =====================================================

async function loginEmployee() {

    const email =
        document
            .getElementById("employeeEmail")
            .value
            .trim()
            .toLowerCase();


    if (!email) {

        alert(
            "Company email enter karo."
        );

        return;
    }


    if (!email.includes("@")) {

        alert(
            "Valid email enter karo."
        );

        return;
    }


    const loginBtn =
        document.getElementById("loginBtn");


    loginBtn.disabled = true;

    loginBtn.textContent =
        "Checking...";


    try {

        const response =
            await fetch(
                ATTENDANCE_API_URL,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body: JSON.stringify({

                        action: "login",

                        email: email

                    })

                }
            );


        const result =
            await response.json();


        console.log(
            "LOGIN RESPONSE:",
            result
        );


        if (!result.success) {

            alert(
                result.message ||
                "Employee login failed."
            );

            return;
        }


        loggedEmployee =
            result.employee;


        document
            .getElementById("employeeName")
            .textContent =
                loggedEmployee.name || "-";


        document
            .getElementById("employeeId")
            .textContent =
                loggedEmployee.employeeId || "-";


        document
            .getElementById("employeeDepartment")
            .textContent =
                loggedEmployee.department || "-";


        document
            .getElementById("loggedEmail")
            .textContent =
                loggedEmployee.email || email;


        document
            .getElementById("employeeInfo")
            .style.display =
                "block";


        document
            .getElementById("cameraCard")
            .style.display =
                "block";


        document
            .getElementById("markCard")
            .style.display =
                "block";


        document
            .getElementById("attendanceTypeCard")
            .style.display =
                "none";


        document
            .getElementById("markAttendanceBtn")
            .disabled =
                true;


        faceVerified = false;

        selectedAttendanceType = null;

        capturedFaceImage = null;

        currentEmbedding = null;


        // Reset IN / OUT state

        document
            .getElementById("inOption")
            .classList.remove("selected-in");

        document
            .getElementById("outOption")
            .classList.remove("selected-out");

        document
            .getElementById("inOption")
            .classList.remove("disabled");

        document
            .getElementById("outOption")
            .classList.remove("disabled");


        await loadTodayAttendance();


        document
            .getElementById("statusText")
            .textContent =
                "Login successful. Start camera and scan face.";

    }


    catch (error) {

        console.error(
            "Login Error:",
            error
        );


        alert(
            "Login error:\n\n" +
            error.message
        );

    }


    finally {

        loginBtn.disabled = false;

        loginBtn.textContent =
            "Login";

    }

}


// =====================================================
// START CAMERA
// =====================================================

async function startCamera() {

    if (!modelsLoaded) {

        alert(
            "Face recognition model abhi load ho raha hai. Thoda wait karo."
        );

        return;
    }


    if (!loggedEmployee) {

        alert(
            "Pehle employee login karo."
        );

        return;
    }


    try {

        cameraStream =
            await navigator
                .mediaDevices
                .getUserMedia({

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


        const video =
            document.getElementById("camera");


        video.srcObject =
            cameraStream;


        video.style.display =
            "block";


        document
            .getElementById("cameraMessage")
            .style.display =
                "none";


        document
            .getElementById("startCameraBtn")
            .disabled =
                true;


        document
            .getElementById("scanFaceBtn")
            .disabled =
                false;


        document
            .getElementById("stopCameraBtn")
            .disabled =
                false;


        document
            .getElementById("faceStatus")
            .className =
                "face-status face-processing";


        document
            .getElementById("faceStatus")
            .textContent =
                "Camera ready. Face ko camera ke center mein rakho.";


        document
            .getElementById("statusText")
            .textContent =
                "Camera running. Scan Face dabao.";

    }


    catch (error) {

        console.error(
            "Camera Error:",
            error
        );


        alert(
            "Camera permission nahi mili.\n\n" +
            error.message
        );

    }

}


// =====================================================
// SCAN FACE
// =====================================================

async function scanFace() {

    if (!modelsLoaded) {

        alert(
            "Face model ready nahi hai."
        );

        return;
    }


    if (!cameraStream) {

        alert(
            "Camera pehle start karo."
        );

        return;
    }


    const video =
        document.getElementById("camera");


    const scanButton =
        document.getElementById("scanFaceBtn");


    const faceStatus =
        document.getElementById("faceStatus");


    scanButton.disabled = true;

    scanButton.textContent =
        "Scanning...";


    faceStatus.className =
        "face-status face-processing";


    faceStatus.textContent =
        "Face detect aur embedding generate ho rahi hai...";


    try {

        // =================================================
        // 1. CHECK VIDEO READY
        // =================================================

        if (
            video.videoWidth === 0 ||
            video.videoHeight === 0
        ) {

            throw new Error(
                "Camera abhi ready nahi hai. 2-3 seconds wait karo."
            );

        }


        // =================================================
        // 2. DETECT SINGLE FACE
        // =================================================

        const detection =
            await faceapi
                .detectSingleFace(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 416,
                        scoreThreshold: 0.5
                    })
                )
                .withFaceLandmarks(true)
                .withFaceDescriptor();


        if (!detection) {

            throw new Error(
                "Face detect nahi hua. Face camera ke saamne clearly rakho."
            );

        }


        // =================================================
        // 3. EXACTLY ONE FACE CHECK
        // =================================================

        const allFaces =
            await faceapi
                .detectAllFaces(
                    video,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 416,
                        scoreThreshold: 0.5
                    })
                );


        if (allFaces.length !== 1) {

            throw new Error(
                "Camera mein exactly 1 face hona chahiye."
            );

        }


        // =================================================
        // 4. FACE QUALITY CHECK
        // =================================================

        const box =
            detection.detection.box;


        if (
            box.width < 100 ||
            box.height < 100
        ) {

            throw new Error(
                "Face bahut door hai. Camera ke paas aao."
            );

        }


        // =================================================
        // 5. GENERATE FACE EMBEDDING
        // =================================================

        currentEmbedding =
            Array.from(
                detection.descriptor
            );


        console.log(
            "FACE EMBEDDING GENERATED"
        );


        console.log(
            "EMBEDDING LENGTH:",
            currentEmbedding.length
        );


        if (
            currentEmbedding.length !== 128
        ) {

            currentEmbedding = null;

            throw new Error(
                "Invalid face embedding. 128 values expected."
            );

        }


        // =================================================
        // 6. CAPTURE PHOTO
        // =================================================

        const canvas =
            document.getElementById("canvas");


        const width =
            video.videoWidth;


        const height =
            video.videoHeight;


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


        capturedFaceImage =
            canvas.toDataURL(
                "image/jpeg",
                0.85
            );


        document
            .getElementById("capturedImage")
            .src =
                capturedFaceImage;


        document
            .getElementById("photoSection")
            .style.display =
                "block";


        // =================================================
        // 7. SEND FACE TO BACKEND
        // =================================================

        faceStatus.textContent =
            "Checking registered face...";


        const response =
            await fetch(
                ATTENDANCE_API_URL,
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "text/plain;charset=utf-8"
                    },

                    body: JSON.stringify({

                        action:
                            "verifyFace",

                        employeeId:
                            loggedEmployee.employeeId,

                        email:
                            loggedEmployee.email,

                        name:
                            loggedEmployee.name,

                        department:
                            loggedEmployee.department,

                        embedding:
                            currentEmbedding,

                        faceImage:
                            capturedFaceImage

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Face verification HTTP error: " +
                response.status
            );

        }


        const result =
            await response.json();


        console.log(
            "FACE VERIFY RESPONSE:",
            result
        );


        // =================================================
        // 8. FACE REJECTED
        // =================================================

        if (!result.success) {

            faceVerified = false;

            currentEmbedding = null;


            faceStatus.className =
                "face-status face-error";


            faceStatus.textContent =
                result.message ||
                "Face verification failed.";


            document
                .getElementById("attendanceTypeCard")
                .style.display =
                    "none";


            document
                .getElementById("markAttendanceBtn")
                .disabled =
                    true;


            return;

        }


        // =================================================
        // 9. NEW FACE REGISTERED
        // =================================================

        if (result.isNewFace === true) {

            faceVerified = true;


            faceStatus.className =
                "face-status face-success";


            faceStatus.textContent =
                "✓ New face registered successfully.";


            console.log(
                "NEW FACE REGISTRATION CONFIRMED"
            );

        }


        // =================================================
        // 10. EXISTING FACE VERIFIED
        // =================================================

        else {

            faceVerified = true;


            faceStatus.className =
                "face-status face-success";


            faceStatus.textContent =
                "✓ Face verified successfully.";


            console.log(
                "EXISTING FACE MATCH CONFIRMED"
            );

        }


        // =================================================
        // 11. SHOW IN / OUT
        // =================================================

        document
            .getElementById("attendanceTypeCard")
            .style.display =
                "block";


        document
            .getElementById("statusText")
            .textContent =
                "Face verified. Ab IN ya OUT select karo.";

    }


    catch (error) {

        console.error(
            "Face Scan Error:",
            error
        );


        faceVerified = false;

        currentEmbedding = null;


        faceStatus.className =
            "face-status face-error";


        faceStatus.textContent =
            error.message ||
            "Face scan failed.";


        document
            .getElementById("attendanceTypeCard")
            .style.display =
                "none";


        document
            .getElementById("markAttendanceBtn")
            .disabled =
                true;

    }


    finally {

        scanButton.disabled =
            false;


        scanButton.textContent =
            "Scan Face";

    }

}


// =====================================================
// SELECT IN / OUT
// =====================================================

function selectAttendanceType(type) {

    if (!faceVerified) {

        alert(
            "Pehle face verify karo."
        );

        return;
    }


    selectedAttendanceType =
        type;


    const inOption =
        document.getElementById("inOption");


    const outOption =
        document.getElementById("outOption");


    inOption.classList.remove(
        "selected-in"
    );


    outOption.classList.remove(
        "selected-out"
    );


    if (type === "IN") {

        inOption.classList.add(
            "selected-in"
        );


        document
            .getElementById("statusText")
            .textContent =
                "IN selected. GPS location verify hogi.";

    }


    if (type === "OUT") {

        outOption.classList.add(
            "selected-out"
        );


        document
            .getElementById("statusText")
            .textContent =
                "OUT selected. GPS location verify hogi.";

    }


    document
        .getElementById("markAttendanceBtn")
        .disabled =
            false;

}


// =====================================================
// GET REAL GPS
// =====================================================

function getRealGPS() {

    return new Promise(
        function(resolve, reject) {

            if (!navigator.geolocation) {

                reject(
                    new Error(
                        "GPS not supported."
                    )
                );

                return;
            }


            navigator
                .geolocation
                .getCurrentPosition(

                    function(position) {

                        resolve({

                            latitude:
                                position.coords.latitude,

                            longitude:
                                position.coords.longitude,

                            accuracy:
                                position.coords.accuracy

                        });

                    },


                    function(error) {

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
// MARK ATTENDANCE
// =====================================================

async function markAttendance() {

    if (!loggedEmployee) {

        alert(
            "Pehle employee login karo."
        );

        return;
    }


    if (!faceVerified) {

        alert(
            "Face verify nahi hua."
        );

        return;
    }


    if (!currentEmbedding) {

        alert(
            "Face embedding missing hai. Dobara scan karo."
        );

        return;
    }


    if (!selectedAttendanceType) {

        alert(
            "IN ya OUT select karo."
        );

        return;
    }


    const button =
        document.getElementById(
            "markAttendanceBtn"
        );


    button.disabled = true;

    button.textContent =
        "VERIFYING...";


    try {

        // =================================================
        // GPS
        // =================================================

        document
            .getElementById("statusText")
            .textContent =
                "Getting GPS location...";


        const gps =
            await getRealGPS();


        // =================================================
        // BACKEND
        // =================================================

        document
            .getElementById("statusText")
            .textContent =
                "Verifying face and location...";


        const response =
            await fetch(

                ATTENDANCE_API_URL,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body: JSON.stringify({

                        action:
                            "markAttendance",

                        employeeId:
                            loggedEmployee.employeeId,

                        email:
                            loggedEmployee.email,

                        attendanceType:
                            selectedAttendanceType,

                        latitude:
                            gps.latitude,

                        longitude:
                            gps.longitude,

                        accuracy:
                            gps.accuracy,

                        faceEmbedding:
                            currentEmbedding,

                        faceImage:
                            capturedFaceImage

                    })

                }

            );


        if (!response.ok) {

            throw new Error(
                "Backend HTTP error: " +
                response.status
            );

        }


        const result =
            await response.json();


        console.log(
            "ATTENDANCE RESPONSE:",
            result
        );


        if (result.success) {

            showAttendanceSuccess(
                result
            );


            await loadTodayAttendance();


            document
                .getElementById("statusText")
                .textContent =
                    "Attendance marked successfully.";

        }


        else {

            alert(

                "ATTENDANCE REJECTED\n\n" +

                (
                    result.message ||
                    "Attendance could not be marked."
                )

            );


            document
                .getElementById("statusText")
                .textContent =
                    "Attendance rejected.";

        }

    }


    catch (error) {

        console.error(
            "Attendance Error:",
            error
        );


        alert(

            "ATTENDANCE ERROR\n\n" +
            error.message

        );

    }


    finally {

        button.disabled =
            false;


        button.textContent =
            "MARK ATTENDANCE";

    }

}


// =====================================================
// SHOW SUCCESS
// =====================================================

function showAttendanceSuccess(result) {

    const now =
        new Date();


    const date =
        now.toLocaleDateString(
            "en-IN"
        );


    const time =
        now.toLocaleTimeString(
            "en-IN",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );


    document
        .getElementById("resultEmployee")
        .textContent =
            loggedEmployee.name;


    document
        .getElementById("resultType")
        .textContent =
            result.attendanceType ||
            selectedAttendanceType;


    document
        .getElementById("resultDate")
        .textContent =
            result.date ||
            date;


    document
        .getElementById("resultTime")
        .textContent =
            result.time ||
            time;


    document
        .getElementById("resultLocation")
        .textContent =
            result.locationName ||
            "-";


    document
        .getElementById("resultDistance")
        .textContent =
            result.distance != null
                ? result.distance + " meters"
                : "-";


    document
        .getElementById("attendanceResult")
        .style.display =
            "block";

}


// =====================================================
// TODAY ATTENDANCE
// =====================================================

async function loadTodayAttendance() {

    if (!loggedEmployee) {
        return;
    }


    try {

        const response =
            await fetch(

                ATTENDANCE_API_URL,

                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "text/plain;charset=utf-8"

                    },

                    body: JSON.stringify({

                        action:
                            "getTodayAttendance",

                        employeeId:
                            loggedEmployee.employeeId

                    })

                }

            );


        const result =
            await response.json();


        console.log(
            "TODAY STATUS:",
            result
        );


        if (
            result.success &&
            result.attendance
        ) {

            const attendance =
                result.attendance;


            document
                .getElementById(
                    "currentStatus"
                )
                .style.display =
                    "block";


            document
                .getElementById(
                    "currentAttendanceStatus"
                )
                .textContent =
                    attendance.status || "-";


            document
                .getElementById(
                    "currentInTime"
                )
                .textContent =
                    attendance.inTime || "-";


            document
                .getElementById(
                    "currentOutTime"
                )
                .textContent =
                    attendance.outTime || "-";


            // =================================================
            // EXISTING IN
            // =================================================

            if (attendance.inTime) {

                document
                    .getElementById("inOption")
                    .classList.add(
                        "disabled"
                    );

            }


            // =================================================
            // EXISTING OUT
            // =================================================

            if (attendance.outTime) {

                document
                    .getElementById("outOption")
                    .classList.add(
                        "disabled"
                    );

            }

        }

    }


    catch (error) {

        console.error(
            "Today attendance error:",
            error
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
            .forEach(
                function(track) {

                    track.stop();

                }
            );


        cameraStream =
            null;

    }


    const video =
        document.getElementById("camera");


    video.srcObject =
        null;


    video.style.display =
        "none";


    document
        .getElementById("cameraMessage")
        .style.display =
            "block";


    document
        .getElementById("cameraMessage")
        .textContent =
            "Camera is stopped";


    document
        .getElementById("startCameraBtn")
        .disabled =
            false;


    document
        .getElementById("scanFaceBtn")
        .disabled =
            true;


    document
        .getElementById("stopCameraBtn")
        .disabled =
            true;


    // =================================================
    // CLEAR FACE STATE
    // =================================================

    faceVerified =
        false;


    currentEmbedding =
        null;


    capturedFaceImage =
        null;


    document
        .getElementById("attendanceTypeCard")
        .style.display =
            "none";


    document
        .getElementById("markAttendanceBtn")
        .disabled =
            true;


    document
        .getElementById("statusText")
        .textContent =
            "Camera stopped.";

}


// =====================================================
// PAGE CLOSE
// =====================================================

window.addEventListener(
    "beforeunload",
    function() {

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    function(track) {

                        track.stop();

                    }
                );

        }

    }
);


// =====================================================
// OPTIONAL DEBUG FUNCTION
// =====================================================

function getCapturedFaceEmbedding() {

    return currentEmbedding;

}


// =====================================================
// OPTIONAL FACE STATUS
// =====================================================

function isFaceCaptured() {

    return (
        currentEmbedding !== null &&
        currentEmbedding.length === 128
    );

}
