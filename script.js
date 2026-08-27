// =====================================================
// FACE ATTENDANCE SYSTEM
// COMPLETE FRONTEND SCRIPT
//
// FLOW:
//
// LOGIN
//   ↓
// CHECK FACE ENROLLMENT
//   ↓
// CAMERA
//   ↓
// ONE EYE BLINK LIVENESS CHECK
//   ↓
// FACE DETECTION
//   ↓
// 128 VALUE FACE EMBEDDING
//   ↓
// NEW EMPLOYEE
//   → SAVE EMBEDDING TO GOOGLE SHEET
//
// REGISTERED EMPLOYEE
//   → READ SAVED EMBEDDING
//   → FACE MATCH
//
//   ↓
// IN / OUT
//   ↓
// GPS
//   ↓
// GEOFENCE
//   ↓
// ATTENDANCE
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

let cameraStarting = false;

let faceScanning = false;


// =====================================================
// BLINK LIVENESS VARIABLES
// =====================================================

let blinkCount = 0;

let blinkChecking = false;

let previousEyesClosed = false;

let lastBlinkTime = 0;


// =====================================================
// APPS SCRIPT WEB APP URL
// =====================================================

const ATTENDANCE_API_URL =
    "https://script.google.com/macros/s/AKfycbzFV8jtvcMVmRSbHROlQ_-5HIAxPKg-3xbmyeTE5a10JnTQffsctOx3CQyMYGM_IsD3/exec";


// =====================================================
// FACE API MODEL URL
// =====================================================

const MODEL_URL =
    "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/";


// =====================================================
// HELPER
// ELEMENT
// =====================================================

function getElement(id) {

    return document.getElementById(id);

}


// =====================================================
// HELPER
// SET FACE STATUS
// =====================================================

function setFaceStatus(message, type = "") {

    const element = getElement("faceStatus");

    if (!element) {
        return;
    }

    element.className = "face-status";

    if (type === "success") {
        element.classList.add("face-success");
    }

    if (type === "error") {
        element.classList.add("face-error");
    }

    if (type === "processing") {
        element.classList.add("face-processing");
    }

    element.textContent = message;

}


// =====================================================
// HELPER
// STATUS TEXT
// =====================================================

function setStatus(message) {

    const element = getElement("statusText");

    if (element) {
        element.textContent = message;
    }

}


// =====================================================
// LOAD FACE MODELS
// =====================================================

async function loadFaceModels() {

    const status = getElement("modelStatus");

    try {

        modelsLoaded = false;

        if (status) {
            status.textContent =
                "Loading face detection model...";
        }

        console.log(
            "Loading Tiny Face Detector..."
        );

        await faceapi.nets.tinyFaceDetector.loadFromUri(
            MODEL_URL
        );


        if (status) {
            status.textContent =
                "Loading face landmark model...";
        }

        console.log(
            "Loading Face Landmark Model..."
        );

        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(
            MODEL_URL
        );


        if (status) {
            status.textContent =
                "Loading face recognition model...";
        }

        console.log(
            "Loading Face Recognition Model..."
        );

        await faceapi.nets.faceRecognitionNet.loadFromUri(
            MODEL_URL
        );


        modelsLoaded = true;


        if (status) {
            status.textContent =
                "✓ Face recognition system ready.";
        }


        console.log(
            "===================================="
        );

        console.log(
            "FACE MODELS LOADED SUCCESSFULLY"
        );

        console.log(
            "===================================="
        );

    }

    catch (error) {

        modelsLoaded = false;

        console.error(
            "FACE MODEL LOAD ERROR:",
            error
        );

        if (status) {
            status.textContent =
                "Face model loading failed.";
        }

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
    function () {

        console.log(
            "Face Attendance System Loaded"
        );

        console.log(
            "Secure Context:",
            window.isSecureContext
        );

        console.log(
            "getUserMedia:",
            !!(
                navigator.mediaDevices &&
                navigator.mediaDevices.getUserMedia
            )
        );

        loadFaceModels();

    }
);


// =====================================================
// LOGIN EMPLOYEE
// =====================================================

async function loginEmployee() {

    const input = getElement("employeeEmail");

    if (!input) {

        alert(
            "Email input nahi mila."
        );

        return;
    }


    const email =
        input.value
            .trim()
            .toLowerCase();


    if (!email) {

        alert(
            "Company email enter karo."
        );

        input.focus();

        return;
    }


    if (!email.includes("@")) {

        alert(
            "Valid email enter karo."
        );

        input.focus();

        return;
    }


    const loginBtn =
        getElement("loginBtn");


    loginBtn.disabled = true;

    loginBtn.textContent =
        "Checking...";


    try {

        console.log(
            "LOGIN REQUEST:",
            email
        );


        const result =
            await callBackend({

                action: "login",

                email: email

            });


        console.log(
            "LOGIN RESPONSE:",
            result
        );


        if (!result || !result.success) {

            throw new Error(
                result?.message ||
                "Employee login failed."
            );
        }


        if (!result.employee) {

            throw new Error(
                "Backend ne employee data return nahi kiya."
            );
        }


        loggedEmployee =
            result.employee;


        // =================================================
        // IMPORTANT:
        // SAVE FACE ENROLLMENT STATUS FROM BACKEND
        // =================================================

        loggedEmployee.faceEnrolled =
            result.faceEnrolled === true;


        console.log(
            "FACE ENROLLED:",
            loggedEmployee.faceEnrolled
        );


        console.log(
            "FACE ID:",
            result.faceId
        );


        // =================================================
        // EMPLOYEE INFORMATION
        // =================================================

        getElement("employeeName").textContent =
            loggedEmployee.name || "-";


        getElement("employeeId").textContent =
            loggedEmployee.employeeId || "-";


        getElement("employeeDepartment").textContent =
            loggedEmployee.department || "-";


        getElement("loggedEmail").textContent =
            loggedEmployee.email || email;


        getElement("employeeInfo").style.display =
            "block";


        // =================================================
        // SHOW CAMERA
        // =================================================

        getElement("cameraCard").style.display =
            "block";


        getElement("markCard").style.display =
            "block";


        // IMPORTANT:
        // IN/OUT HIDDEN UNTIL FACE VERIFIED

        getElement("attendanceTypeCard").style.display =
            "none";


        // =================================================
        // RESET FACE STATE
        // =================================================

        faceVerified = false;

        selectedAttendanceType = null;

        capturedFaceImage = null;

        currentEmbedding = null;


        // RESET BLINK STATE

        blinkCount = 0;

        blinkChecking = false;

        previousEyesClosed = false;

        lastBlinkTime = 0;


        getElement("markAttendanceBtn").disabled =
            true;


        getElement("scanFaceBtn").disabled =
            true;


        // =================================================
        // RESET PHOTO
        // =================================================

        getElement("photoSection").style.display =
            "none";


        getElement("capturedImage").src =
            "";


        // =================================================
        // RESET IN / OUT
        // =================================================

        resetAttendanceSelection();


        // =================================================
        // TODAY ATTENDANCE
        // =================================================

        await loadTodayAttendance();


        // =================================================
        // FACE ENROLLMENT MESSAGE
        // =================================================

        if (loggedEmployee.faceEnrolled) {

            setStatus(
                "Login successful. Registered face found. Start camera and scan face."
            );

            setFaceStatus(
                "Registered face found. Camera start karke face verify karo.",
                "processing"
            );

        }

        else {

            setStatus(
                "New employee. Camera start karke face scan karo. Face automatically save hoga."
            );

            setFaceStatus(
                "⚠ No face enrolled. First scan par face embedding Google Sheet mein save hogi.",
                "processing"
            );

        }


        // =================================================
        // SCROLL CAMERA
        // =================================================

        getElement("cameraCard")
            .scrollIntoView({
                behavior: "smooth",
                block: "start"
            });


    }

    catch (error) {

        console.error(
            "LOGIN ERROR:",
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
// BACKEND CALL
// =====================================================

async function callBackend(payload) {

    console.log(
        "BACKEND REQUEST:",
        payload.action
    );


    const response =
        await fetch(
            ATTENDANCE_API_URL,
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "text/plain;charset=utf-8"
                },

                body:
                    JSON.stringify(payload)

            }
        );


    if (!response.ok) {

        throw new Error(
            "Backend HTTP error: " +
            response.status
        );
    }


    const text =
        await response.text();


    console.log(
        "BACKEND RAW RESPONSE:",
        text
    );


    let result;


    try {

        result =
            JSON.parse(text);

    }

    catch (error) {

        throw new Error(
            "Backend ne valid JSON response nahi diya.\n\n" +
            text.substring(0, 500)
        );
    }


    return result;
}


// =====================================================
// CHECK CAMERA SUPPORT
// =====================================================

function checkCameraSupport() {

    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        return {
            success: false,
            message:
                "Is browser/environment mein camera API available nahi hai."
        };
    }


    if (!window.isSecureContext) {

        return {
            success: false,
            message:
                "Camera ke liye HTTPS required hai.\n\n" +
                "GitHub Pages par app open karo ya localhost use karo."
        };
    }


    return {
        success: true
    };
}


// =====================================================
// WAIT FOR VIDEO READY
// =====================================================

function waitForVideoReady(video) {

    return new Promise(
        function(resolve, reject) {

            if (
                video.readyState >= 2 &&
                video.videoWidth > 0 &&
                video.videoHeight > 0
            ) {

                resolve();

                return;
            }


            let timeout;


            const onReady = function() {

                cleanup();

                resolve();
            };


            const cleanup = function() {

                video.removeEventListener(
                    "loadedmetadata",
                    onReady
                );

                video.removeEventListener(
                    "canplay",
                    onReady
                );

                clearTimeout(timeout);
            };


            video.addEventListener(
                "loadedmetadata",
                onReady,
                { once: true }
            );


            video.addEventListener(
                "canplay",
                onReady,
                { once: true }
            );


            timeout =
                setTimeout(
                    function() {

                        cleanup();

                        reject(
                            new Error(
                                "Camera video stream ready nahi hua."
                            )
                        );

                    },
                    10000
                );
        }
    );
}


// =====================================================
// START CAMERA
// =====================================================

async function startCamera() {

    if (cameraStarting) {
        return;
    }


    if (!loggedEmployee) {

        alert(
            "Pehle employee login karo."
        );

        return;
    }


    if (!modelsLoaded) {

        alert(
            "Face recognition model abhi ready nahi hai.\n\n" +
            "Model status check karo aur 5-10 seconds wait karo."
        );

        return;
    }


    const cameraCheck =
        checkCameraSupport();


    if (!cameraCheck.success) {

        alert(
            cameraCheck.message
        );

        console.error(
            "CAMERA SUPPORT ERROR:",
            cameraCheck.message
        );

        return;
    }


    cameraStarting = true;


    const startBtn =
        getElement("startCameraBtn");

    const scanBtn =
        getElement("scanFaceBtn");

    const stopBtn =
        getElement("stopCameraBtn");

    const video =
        getElement("camera");

    const message =
        getElement("cameraMessage");


    try {

        // =================================================
        // STOP OLD STREAM
        // =================================================

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    function(track) {
                        track.stop();
                    }
                );

            cameraStream = null;
        }


        setStatus(
            "Requesting camera permission..."
        );


        setFaceStatus(
            "Opening camera...",
            "processing"
        );


        // =================================================
        // REQUEST CAMERA
        // =================================================

        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: {
                        ideal: "user"
                    },

                    width: {
                        ideal: 1280,
                        min: 320
                    },

                    height: {
                        ideal: 720,
                        min: 240
                    },

                    frameRate: {
                        ideal: 30
                    }

                },

                audio: false

            });


        console.log(
            "CAMERA STREAM:",
            cameraStream
        );


        // =================================================
        // ATTACH STREAM
        // =================================================

        video.srcObject =
            cameraStream;

        video.muted = true;

        video.autoplay = true;

        video.playsInline = true;


        // =================================================
        // SHOW VIDEO
        // =================================================

        video.style.display =
            "block";

        message.style.display =
            "none";


        // =================================================
        // WAIT VIDEO READY
        // =================================================

        await waitForVideoReady(
            video
        );


        // =================================================
        // PLAY VIDEO
        // =================================================

        try {

            await video.play();

        }

        catch (playError) {

            console.warn(
                "VIDEO PLAY WARNING:",
                playError
            );
        }


        console.log(
            "VIDEO WIDTH:",
            video.videoWidth
        );


        console.log(
            "VIDEO HEIGHT:",
            video.videoHeight
        );


        // =================================================
        // ENABLE BUTTONS
        // =================================================

        startBtn.disabled =
            true;

        scanBtn.disabled =
            false;

        stopBtn.disabled =
            false;


        if (loggedEmployee.faceEnrolled) {

            setFaceStatus(
                "✓ Camera ready. Registered face verify karne ke liye Scan Face dabao.",
                "processing"
            );

        }

        else {

            setFaceStatus(
                "✓ Camera ready. New face enrollment ke liye Scan Face dabao.",
                "processing"
            );

        }


        setStatus(
            "Camera running. Scan Face dabao."
        );


    }

    catch (error) {

        console.error(
            "CAMERA ERROR:",
            error
        );


        // Stop partial stream

        if (cameraStream) {

            cameraStream
                .getTracks()
                .forEach(
                    function(track) {
                        track.stop();
                    }
                );

            cameraStream = null;
        }


        video.srcObject =
            null;

        video.style.display =
            "none";

        message.style.display =
            "block";


        let errorMessage =
            "Camera open nahi hua.";


        if (error.name === "NotAllowedError") {

            errorMessage =
                "Camera permission denied.\n\n" +
                "Browser address bar ke camera icon par click karke Allow karo.";

        }

        else if (error.name === "NotFoundError") {

            errorMessage =
                "Camera device nahi mila.\n\n" +
                "Laptop/PC camera connected hai ya nahi check karo.";

        }

        else if (error.name === "NotReadableError") {

            errorMessage =
                "Camera kisi doosre application ke use mein hai.\n\n" +
                "Zoom, Teams, WhatsApp, Camera app etc. close karo.";

        }

        else if (error.name === "OverconstrainedError") {

            errorMessage =
                "Camera resolution supported nahi hai.\n\n" +
                "Basic camera settings ke saath dobara try karo.";

        }

        else if (error.name === "SecurityError") {

            errorMessage =
                "Browser security ne camera block kiya hai.\n\n" +
                "App ko HTTPS/GitHub Pages par open karo.";

        }

        else {

            errorMessage +=
                "\n\n" +
                error.message;
        }


        setFaceStatus(
            errorMessage,
            "error"
        );


        setStatus(
            "Camera failed."
        );


        alert(
            errorMessage
        );

    }

    finally {

        cameraStarting = false;

    }
}


// =====================================================
// BLINK DETECTION
// =====================================================
//
// ONE BLINK VERSION
//
// OPEN → CLOSED → OPEN
//
// Blink detect hone ke baad immediately
// liveness verified ho jayegi.
//
// IMPORTANT:
// Face detection + landmarks use ho rahe hain.
// Embedding tabhi generate hogi jab blink complete ho.
// =====================================================


function calculateDistance(point1, point2) {

    const dx =
        point1.x - point2.x;

    const dy =
        point1.y - point2.y;

    return Math.sqrt(
        (dx * dx) +
        (dy * dy)
    );
}


// =====================================================
// CALCULATE EAR
// =====================================================

function calculateEyeAspectRatio(eye) {

    if (!eye || eye.length !== 6) {

        return 1;
    }


    const vertical1 =
        calculateDistance(
            eye[1],
            eye[5]
        );


    const vertical2 =
        calculateDistance(
            eye[2],
            eye[4]
        );


    const horizontal =
        calculateDistance(
            eye[0],
            eye[3]
        );


    if (horizontal === 0) {

        return 1;
    }


    return (
        (vertical1 + vertical2) /
        (2 * horizontal)
    );
}


// =====================================================
// GET LEFT + RIGHT EYE EAR
// =====================================================

function getEyeEAR(landmarks) {

    const positions =
        landmarks.positions;


    const leftEye =
        positions.slice(36, 42);


    const rightEye =
        positions.slice(42, 48);


    const leftEAR =
        calculateEyeAspectRatio(
            leftEye
        );


    const rightEAR =
        calculateEyeAspectRatio(
            rightEye
        );


    return {
        leftEAR: leftEAR,
        rightEAR: rightEAR,
        average:
            (leftEAR + rightEAR) / 2
    };
}


// =====================================================
// WAIT FOR ONE BLINK
// =====================================================
//
// UPDATED:
//
// OLD:
// 2 BLINKS
// 15 SECOND TIMEOUT
// 2 CLOSED FRAMES
// 2 OPEN FRAMES
//
// NEW:
// 1 BLINK
// 8 SECOND TIMEOUT
// 1 CLOSED FRAME
// 1 OPEN FRAME
//
// This makes detection much faster.
// =====================================================

async function waitForTwoBlinks(video) {

    blinkCount = 0;

    blinkChecking = true;

    previousEyesClosed = false;

    lastBlinkTime = 0;


    const startTime =
        Date.now();


    // Faster timeout
    const timeout =
        8000;


    // =================================================
    // EAR THRESHOLDS
    // =================================================
    //
    // Closed:
    // below 0.24
    //
    // Open:
    // above 0.26
    //
    // Gap prevents random noise.
    // =================================================

    const CLOSED_THRESHOLD =
        0.24;


    const OPEN_THRESHOLD =
        0.26;


    let stableOpenFrames = 0;

    let stableClosedFrames = 0;


    setFaceStatus(
        "👁️ Liveness check: ek baar eyes blink karo...",
        "processing"
    );


    setStatus(
        "Liveness check chal raha hai — ek baar blink karo."
    );


    console.log(
        "===================================="
    );


    console.log(
        "ONE BLINK LIVENESS CHECK STARTED"
    );


    console.log(
        "CLOSED THRESHOLD:",
        CLOSED_THRESHOLD
    );


    console.log(
        "OPEN THRESHOLD:",
        OPEN_THRESHOLD
    );


    console.log(
        "===================================="
    );


    try {

        while (Date.now() - startTime < timeout) {


            if (!cameraStream) {

                throw new Error(
                    "Camera stopped during liveness check."
                );
            }


            if (
                video.readyState < 2 ||
                video.videoWidth === 0 ||
                video.videoHeight === 0
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            50
                        )
                );

                continue;
            }


            // =================================================
            // DETECT FACE + LANDMARK
            // =================================================

            const detection =
                await faceapi
                    .detectSingleFace(
                        video,
                        new faceapi.TinyFaceDetectorOptions({
                            inputSize: 320,
                            scoreThreshold: 0.45
                        })
                    )
                    .withFaceLandmarks(true);


            if (!detection) {

                stableOpenFrames = 0;

                stableClosedFrames = 0;

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            40
                        )
                );

                continue;
            }


            // =================================================
            // EAR
            // =================================================

            const eyes =
                getEyeEAR(
                    detection.landmarks
                );


            const ear =
                eyes.average;


            console.log(
                "EYE EAR:",
                ear.toFixed(3)
            );


            // =================================================
            // EYES CLOSED
            // =================================================

            if (ear < CLOSED_THRESHOLD) {

                stableClosedFrames++;

                stableOpenFrames = 0;


                // Only one frame needed
                // to register closed state.

                if (
                    stableClosedFrames >= 1 &&
                    !previousEyesClosed
                ) {

                    previousEyesClosed = true;


                    console.log(
                        "EYES CLOSED"
                    );

                }

            }


            // =================================================
            // EYES OPEN
            // =================================================

            else if (ear > OPEN_THRESHOLD) {

                stableOpenFrames++;

                stableClosedFrames = 0;


                // One open frame after closed
                // = completed blink.

                if (
                    stableOpenFrames >= 1 &&
                    previousEyesClosed
                ) {

                    const now =
                        Date.now();


                    // Prevent duplicate detection.

                    if (
                        now - lastBlinkTime > 250
                    ) {

                        blinkCount++;

                        lastBlinkTime =
                            now;


                        console.log(
                            "BLINK DETECTED:",
                            blinkCount
                        );


                        previousEyesClosed =
                            false;


                        // =================================================
                        // ONE BLINK COMPLETE
                        // =================================================

                        if (
                            blinkCount === 1
                        ) {

                            setFaceStatus(
                                "✓ Blink detected. Liveness verified. Face scan continue ho raha hai...",
                                "success"
                            );


                            setStatus(
                                "Liveness verified. Face embedding generate ho rahi hai..."
                            );


                            blinkChecking =
                                false;


                            console.log(
                                "ONE BLINK VERIFIED"
                            );


                            return true;
                        }

                    }

                }

            }


            // Very short interval for fast detection

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        40
                    )
            );

        }


        throw new Error(
            "Blink detect nahi hua.\n\n" +
            "Camera ke saamne seedha dekho aur ek baar naturally blink karo."
        );

    }


    finally {

        blinkChecking = false;

    }
}


// =====================================================
// NORMALIZE CLIENT EMBEDDING
// =====================================================
//
// face-api descriptor normally Float32Array hota hai.
// Google Apps Script ko normal JSON Array bhejna hai.
//
// EXACTLY 128 numeric values.
// =====================================================

function normalizeClientEmbedding(descriptor) {

    if (!descriptor) {

        throw new Error(
            "Face descriptor missing."
        );
    }


    let embedding;


    try {

        embedding =
            Array.from(descriptor);

    }

    catch (error) {

        throw new Error(
            "Face descriptor ko Array mein convert nahi kar pa rahe."
        );
    }


    if (!Array.isArray(embedding)) {

        throw new Error(
            "Face embedding Array nahi hai."
        );
    }


    if (embedding.length !== 128) {

        throw new Error(
            "Invalid face embedding length: " +
            embedding.length +
            ". Expected exactly 128 values."
        );
    }


    for (
        let i = 0;
        i < embedding.length;
        i++
    ) {

        const value =
            Number(embedding[i]);


        if (!Number.isFinite(value)) {

            throw new Error(
                "Face embedding mein invalid numeric value at index " +
                i
            );
        }


        embedding[i] =
            value;
    }


    return embedding;
}


// =====================================================
// ENROLL NEW FACE
// =====================================================

async function enrollFaceToBackend() {

    if (!loggedEmployee) {

        throw new Error(
            "Employee login missing."
        );
    }


    if (
        !currentEmbedding ||
        currentEmbedding.length !== 128
    ) {

        throw new Error(
            "Valid 128-value face embedding available nahi hai."
        );
    }


    setFaceStatus(
        "New face detected. Embedding Google Sheet mein save ho rahi hai...",
        "processing"
    );


    setStatus(
        "Saving new face embedding..."
    );


    console.log(
        "===================================="
    );


    console.log(
        "NEW FACE ENROLLMENT STARTED"
    );


    console.log(
        "Employee ID:",
        loggedEmployee.employeeId
    );


    console.log(
        "Email:",
        loggedEmployee.email
    );


    console.log(
        "Embedding length:",
        currentEmbedding.length
    );


    console.log(
        "First 5 values:",
        currentEmbedding.slice(0, 5)
    );


    console.log(
        "===================================="
    );


    const result =
        await callBackend({

            action:
                "enrollFace",

            employeeId:
                loggedEmployee.employeeId,

            email:
                loggedEmployee.email,

            name:
                loggedEmployee.name,

            department:
                loggedEmployee.department,

            faceEmbedding:
                currentEmbedding,

            faceImage:
                capturedFaceImage

        });


    console.log(
        "FACE ENROLLMENT RESPONSE:",
        result
    );


    if (
        !result ||
        !result.success
    ) {

        throw new Error(
            result?.message ||
            "Face enrollment failed."
        );
    }


    // =================================================
    // IMPORTANT:
    // MARK LOCAL EMPLOYEE AS ENROLLED
    // =================================================

    loggedEmployee.faceEnrolled =
        true;


    faceVerified =
        true;


    console.log(
        "FACE SAVED SUCCESSFULLY"
    );


    console.log(
        "Face ID:",
        result.faceId
    );


    console.log(
        "Employee ID:",
        result.employeeId
    );


    console.log(
        "Embedding length:",
        result.embeddingLength
    );


    setFaceStatus(
        "✓ New face registered successfully. Embedding Face_Embeddings sheet mein save ho gayi.",
        "success"
    );


    setStatus(
        "New face registered. Ab IN ya OUT select karo."
    );


    return result;
}


// =====================================================
// VERIFY EXISTING FACE
// =====================================================

async function verifyFaceWithBackend() {

    if (!loggedEmployee) {

        throw new Error(
            "Employee login missing."
        );
    }


    if (
        !currentEmbedding ||
        currentEmbedding.length !== 128
    ) {

        throw new Error(
            "Valid 128-value face embedding available nahi hai."
        );
    }


    setFaceStatus(
        "Registered face ke saath embedding match ho rahi hai...",
        "processing"
    );


    setStatus(
        "Checking registered face..."
    );


    console.log(
        "===================================="
    );


    console.log(
        "FACE VERIFICATION STARTED"
    );


    console.log(
        "Employee ID:",
        loggedEmployee.employeeId
    );


    console.log(
        "Embedding length:",
        currentEmbedding.length
    );


    console.log(
        "First 5 values:",
        currentEmbedding.slice(0, 5)
    );


    console.log(
        "===================================="
    );


    const result =
        await callBackend({

            action:
                "verifyFace",

            employeeId:
                loggedEmployee.employeeId,

            email:
                loggedEmployee.email,

            faceEmbedding:
                currentEmbedding,

            faceImage:
                capturedFaceImage

        });


    console.log(
        "FACE VERIFY RESPONSE:",
        result
    );


    if (
        !result ||
        !result.success
    ) {

        faceVerified =
            false;


        throw new Error(
            result?.message ||
            "Face verification failed."
        );
    }


    faceVerified =
        true;


    console.log(
        "FACE MATCH SUCCESS"
    );


    if (
        result.distance !== undefined
    ) {

        console.log(
            "FACE DISTANCE:",
            result.distance
        );
    }


    setFaceStatus(
        "✓ Face verified successfully.",
        "success"
    );


    setStatus(
        "Face verified. Ab IN ya OUT select karo."
    );


    return result;
}


// =====================================================
// SCAN FACE
// =====================================================
//
// Scan Face
//    ↓
// ONE BLINK CHECK
//    ↓
// FACE DETECTION
//    ↓
// EMBEDDING
//
// Baaki original process same.
// =====================================================

async function scanFace() {

    if (faceScanning) {
        return;
    }


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
        getElement("camera");


    const scanButton =
        getElement("scanFaceBtn");


    try {

        faceScanning = true;

        scanButton.disabled = true;

        scanButton.textContent =
            "Scanning...";


        setFaceStatus(
            "Liveness check prepare ho raha hai...",
            "processing"
        );


        // =================================================
        // VIDEO CHECK
        // =================================================

        if (
            video.readyState < 2 ||
            video.videoWidth === 0 ||
            video.videoHeight === 0
        ) {

            throw new Error(
                "Camera abhi ready nahi hai. 2-3 seconds wait karke dobara scan karo."
            );
        }


        // =================================================
        // ONE BLINK LIVENESS CHECK
        // =================================================

        await waitForTwoBlinks(
            video
        );


        // =================================================
        // DETECT FACE + LANDMARK + DESCRIPTOR
        // =================================================

        setFaceStatus(
            "✓ Blink verified. Face embedding generate ho rahi hai...",
            "processing"
        );


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
                "Face detect nahi hua.\n\n" +
                "Face ko camera ke center mein rakho aur lighting improve karo."
            );
        }


        // =================================================
        // CHECK EXACTLY ONE FACE
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


        console.log(
            "TOTAL FACES:",
            allFaces.length
        );


        if (allFaces.length !== 1) {

            throw new Error(
                "Camera mein exactly 1 face hona chahiye."
            );
        }


        // =================================================
        // FACE QUALITY
        // =================================================

        const box =
            detection.detection.box;


        console.log(
            "FACE BOX:",
            box
        );


        if (
            box.width < 100 ||
            box.height < 100
        ) {

            throw new Error(
                "Face bahut chhota hai.\n\n" +
                "Camera ke thoda paas aao."
            );
        }


        // =================================================
        // DETECTION SCORE
        // =================================================

        const score =
            detection.detection.score;


        console.log(
            "FACE DETECTION SCORE:",
            score
        );


        if (score < 0.5) {

            throw new Error(
                "Face image quality low hai.\n\n" +
                "Camera ke saamne seedha dekho."
            );
        }


        // =================================================
        // FACE EMBEDDING
        // =================================================

        currentEmbedding =
            normalizeClientEmbedding(
                detection.descriptor
            );


        console.log(
            "===================================="
        );


        console.log(
            "FACE EMBEDDING GENERATED"
        );


        console.log(
            "EMBEDDING TYPE:",
            Array.isArray(currentEmbedding)
                ? "Array"
                : typeof currentEmbedding
        );


        console.log(
            "EMBEDDING LENGTH:",
            currentEmbedding.length
        );


        console.log(
            "FIRST 10 VALUES:",
            currentEmbedding.slice(0, 10)
        );


        console.log(
            "===================================="
        );


        // =================================================
        // CAPTURE IMAGE
        // =================================================

        const canvas =
            getElement("canvas");


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


        getElement("capturedImage").src =
            capturedFaceImage;


        getElement("photoSection").style.display =
            "block";


        // =================================================
        // NEW FACE vs EXISTING FACE
        // =================================================

        console.log(
            "FACE ENROLLMENT STATE:",
            loggedEmployee.faceEnrolled
        );


        // =================================================
        // NEW EMPLOYEE
        // =================================================

        if (
            loggedEmployee.faceEnrolled !== true
        ) {

            console.log(
                "NO REGISTERED FACE FOUND"
            );


            console.log(
                "STARTING ENROLLMENT..."
            );


            await enrollFaceToBackend();


            // =================================================
            // SHOW IN / OUT
            // =================================================

            getElement(
                "attendanceTypeCard"
            ).style.display =
                "block";


            getElement(
                "attendanceTypeCard"
            ).scrollIntoView({
                behavior: "smooth",
                block: "center"
            });


            return;
        }


        // =================================================
        // EXISTING EMPLOYEE
        // =================================================

        console.log(
            "REGISTERED FACE FOUND"
        );


        console.log(
            "STARTING FACE MATCH..."
        );


        await verifyFaceWithBackend();


        // =================================================
        // SHOW IN / OUT
        // =================================================

        getElement(
            "attendanceTypeCard"
        ).style.display =
            "block";


        setStatus(
            "Face verified. Ab IN ya OUT select karo."
        );


        // =================================================
        // SCROLL TO IN/OUT
        // =================================================

        getElement(
            "attendanceTypeCard"
        ).scrollIntoView({
            behavior: "smooth",
            block: "center"
        });


    }


    catch (error) {

        console.error(
            "FACE SCAN ERROR:",
            error
        );


        faceVerified =
            false;


        // IMPORTANT:
        // Embedding ko sirf failed verification
        // par clear karna hai.

        if (
            error.message &&
            (
                error.message.includes(
                    "verification"
                ) ||
                error.message.includes(
                    "match"
                ) ||
                error.message.includes(
                    "enrollment"
                ) ||
                error.message.includes(
                    "registered"
                )
            )
        ) {

            currentEmbedding =
                null;
        }


        setFaceStatus(
            error.message ||
            "Face scan failed.",
            "error"
        );


        getElement(
            "attendanceTypeCard"
        ).style.display =
            "none";


        getElement(
            "markAttendanceBtn"
        ).disabled =
            true;


        setStatus(
            "Face scan failed. Dobara try karo."
        );

    }


    finally {

        faceScanning =
            false;


        scanButton.disabled =
            false;


        scanButton.textContent =
            "Scan Face";

    }
}


// =====================================================
// RESET IN / OUT
// =====================================================

function resetAttendanceSelection() {

    selectedAttendanceType =
        null;


    const inOption =
        getElement("inOption");


    const outOption =
        getElement("outOption");


    inOption.classList.remove(
        "selected-in"
    );


    outOption.classList.remove(
        "selected-out"
    );


    inOption.classList.remove(
        "disabled"
    );


    outOption.classList.remove(
        "disabled"
    );


    const radios =
        document.querySelectorAll(
            'input[name="attendanceType"]'
        );


    radios.forEach(
        function(radio) {

            radio.checked = false;

        }
    );


    getElement(
        "markAttendanceBtn"
    ).disabled = true;
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


    if (
        type !== "IN" &&
        type !== "OUT"
    ) {

        return;
    }


    const inOption =
        getElement("inOption");


    const outOption =
        getElement("outOption");


    // =================================================
    // CHECK IF OPTION DISABLED
    // =================================================

    if (
        type === "IN" &&
        inOption.classList.contains("disabled")
    ) {

        alert(
            "Aaj ka IN already marked hai."
        );

        return;
    }


    if (
        type === "OUT" &&
        outOption.classList.contains("disabled")
    ) {

        alert(
            "Aaj ka OUT already marked hai."
        );

        return;
    }


    selectedAttendanceType =
        type;


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


        setStatus(
            "IN selected. GPS location verify hogi."
        );
    }


    if (type === "OUT") {

        outOption.classList.add(
            "selected-out"
        );


        setStatus(
            "OUT selected. GPS location verify hogi."
        );
    }


    getElement(
        "markAttendanceBtn"
    ).disabled =
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
                        "GPS browser mein supported nahi hai."
                    )
                );

                return;
            }


            navigator.geolocation.getCurrentPosition(

                function(position) {

                    console.log(
                        "GPS POSITION:",
                        position.coords
                    );


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

                    console.error(
                        "GPS ERROR:",
                        error
                    );


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


    if (
        !currentEmbedding ||
        currentEmbedding.length !== 128
    ) {

        alert(
            "Face embedding missing hai.\n\n" +
            "Dobara face scan karo."
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
        getElement(
            "markAttendanceBtn"
        );


    button.disabled =
        true;


    button.textContent =
        "VERIFYING...";


    try {

        // =================================================
        // GPS
        // =================================================

        setStatus(
            "Getting GPS location..."
        );


        const gps =
            await getRealGPS();


        console.log(
            "GPS:",
            gps
        );


        // =================================================
        // GPS ACCURACY CHECK
        // =================================================

        if (
            gps.accuracy &&
            gps.accuracy > 200
        ) {

            const continueAnyway =
                confirm(
                    "GPS accuracy low hai: " +
                    Math.round(gps.accuracy) +
                    " meters.\n\n" +
                    "Kya aap continue karna chahte ho?"
                );


            if (!continueAnyway) {

                throw new Error(
                    "Attendance cancelled because GPS accuracy low thi."
                );
            }
        }


        // =================================================
        // BACKEND ATTENDANCE
        // =================================================

        setStatus(
            "Verifying face and location..."
        );


        const result =
            await callBackend({

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

            });


        console.log(
            "ATTENDANCE RESPONSE:",
            result
        );


        // =================================================
        // SUCCESS
        // =================================================

        if (
            result &&
            result.success
        ) {

            showAttendanceSuccess(
                result
            );


            await loadTodayAttendance();


            setStatus(
                "✓ Attendance marked successfully."
            );


            // Disable selected option

            if (
                selectedAttendanceType === "IN"
            ) {

                getElement(
                    "inOption"
                ).classList.add(
                    "disabled"
                );
            }


            if (
                selectedAttendanceType === "OUT"
            ) {

                getElement(
                    "outOption"
                ).classList.add(
                    "disabled"
                );
            }


        }

        else {

            alert(
                "ATTENDANCE REJECTED\n\n" +
                (
                    result?.message ||
                    "Attendance could not be marked."
                )
            );


            setStatus(
                "Attendance rejected."
            );
        }

    }


    catch (error) {

        console.error(
            "ATTENDANCE ERROR:",
            error
        );


        alert(
            "ATTENDANCE ERROR\n\n" +
            error.message
        );


        setStatus(
            "Attendance failed."
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
// SHOW ATTENDANCE SUCCESS
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

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                second:
                    "2-digit"

            }
        );


    getElement(
        "resultEmployee"
    ).textContent =
        loggedEmployee.name || "-";


    getElement(
        "resultType"
    ).textContent =
        result.attendanceType ||
        selectedAttendanceType ||
        "-";


    getElement(
        "resultDate"
    ).textContent =
        result.date ||
        date;


    getElement(
        "resultTime"
    ).textContent =
        result.time ||
        time;


    getElement(
        "resultLocation"
    ).textContent =
        result.locationName ||
        "-";


    getElement(
        "resultDistance"
    ).textContent =
        result.distance != null
            ? result.distance + " meters"
            : "-";


    getElement(
        "attendanceResult"
    ).style.display =
        "block";


    getElement(
        "attendanceResult"
    ).scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}


// =====================================================
// TODAY ATTENDANCE
// =====================================================

async function loadTodayAttendance() {

    if (!loggedEmployee) {
        return;
    }


    try {

        const result =
            await callBackend({

                action:
                    "getTodayAttendance",

                employeeId:
                    loggedEmployee.employeeId

            });


        console.log(
            "TODAY ATTENDANCE:",
            result
        );


        if (
            result &&
            result.success &&
            result.attendance
        ) {

            const attendance =
                result.attendance;


            getElement(
                "currentStatus"
            ).style.display =
                "block";


            getElement(
                "currentAttendanceStatus"
            ).textContent =
                attendance.status || "-";


            getElement(
                "currentInTime"
            ).textContent =
                attendance.inTime || "-";


            getElement(
                "currentOutTime"
            ).textContent =
                attendance.outTime || "-";


            // =================================================
            // EXISTING IN
            // =================================================

            if (attendance.inTime) {

                getElement(
                    "inOption"
                ).classList.add(
                    "disabled"
                );
            }


            // =================================================
            // EXISTING OUT
            // =================================================

            if (attendance.outTime) {

                getElement(
                    "outOption"
                ).classList.add(
                    "disabled"
                );
            }


            // =================================================
            // BOTH COMPLETED
            // =================================================

            if (
                attendance.inTime &&
                attendance.outTime
            ) {

                setStatus(
                    "Aaj ka IN aur OUT dono complete hain."
                );
            }

        }

        else {

            getElement(
                "currentStatus"
            ).style.display =
                "none";
        }

    }

    catch (error) {

        console.error(
            "TODAY ATTENDANCE ERROR:",
            error
        );
    }
}


// =====================================================
// STOP CAMERA
// =====================================================

function stopCamera() {

    console.log(
        "Stopping camera..."
    );


    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                function(track) {

                    console.log(
                        "Stopping track:",
                        track.kind
                    );

                    track.stop();
                }
            );


        cameraStream =
            null;
    }


    const video =
        getElement("camera");


    video.pause();

    video.srcObject =
        null;


    video.style.display =
        "none";


    getElement(
        "cameraMessage"
    ).style.display =
        "block";


    getElement(
        "cameraMessage"
    ).textContent =
        "Camera is stopped";


    getElement(
        "startCameraBtn"
    ).disabled =
        false;


    getElement(
        "scanFaceBtn"
    ).disabled =
        true;


    getElement(
        "stopCameraBtn"
    ).disabled =
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


    faceScanning =
        false;


    // CLEAR BLINK STATE

    blinkCount =
        0;


    blinkChecking =
        false;


    previousEyesClosed =
        false;


    lastBlinkTime =
        0;


    // =================================================
    // HIDE PHOTO
    // =================================================

    getElement(
        "photoSection"
    ).style.display =
        "none";


    getElement(
        "capturedImage"
    ).src =
        "";


    // =================================================
    // HIDE IN / OUT
    // =================================================

    getElement(
        "attendanceTypeCard"
    ).style.display =
        "none";


    getElement(
        "markAttendanceBtn"
    ).disabled =
        true;


    resetAttendanceSelection();


    setFaceStatus(
        "Camera stopped."
    );


    setStatus(
        "Camera stopped."
    );
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
// OPTIONAL DEBUG
// =====================================================

function getCapturedFaceEmbedding() {

    return currentEmbedding;
}


// =====================================================
// OPTIONAL DEBUG
// =====================================================

function isFaceCaptured() {

    return (
        currentEmbedding !== null &&
        currentEmbedding.length === 128
    );
}


// =====================================================
// CAMERA DEBUG
// =====================================================

function cameraDebug() {

    console.log(
        "================ CAMERA DEBUG ================"
    );


    console.log(
        "Secure Context:",
        window.isSecureContext
    );


    console.log(
        "HTTPS:",
        location.protocol
    );


    console.log(
        "Hostname:",
        location.hostname
    );


    console.log(
        "MediaDevices:",
        navigator.mediaDevices
    );


    console.log(
        "getUserMedia:",
        navigator.mediaDevices
            ? navigator.mediaDevices.getUserMedia
            : null
    );


    console.log(
        "Camera Stream:",
        cameraStream
    );


    console.log(
        "Models Loaded:",
        modelsLoaded
    );


    console.log(
        "Logged Employee:",
        loggedEmployee
    );


    console.log(
        "Face Enrolled:",
        loggedEmployee
            ? loggedEmployee.faceEnrolled
            : null
    );


    console.log(
        "Current Embedding:",
        currentEmbedding
    );


    console.log(
        "Embedding Length:",
        currentEmbedding
            ? currentEmbedding.length
            : null
    );


    console.log(
        "Face Verified:",
        faceVerified
    );


    console.log(
        "Blink Count:",
        blinkCount
    );


    console.log(
        "Blink Checking:",
        blinkChecking
    );


    console.log(
        "================================================"
    );
}
