// =====================================================
// FACE ATTENDANCE SYSTEM
// COMPLETE FRONTEND SCRIPT
//
// FLOW:
// LOGIN
//   ↓
// CAMERA
//   ↓
// FACE DETECTION
//   ↓
// FACE EMBEDDING
//   ↓
// BACKEND FACE REGISTER / VERIFY
//   ↓
// IN / OUT
//   ↓
// GPS
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

        console.log("Loading Tiny Face Detector...");

        await faceapi.nets.tinyFaceDetector.loadFromUri(
            MODEL_URL
        );


        if (status) {
            status.textContent =
                "Loading face landmark model...";
        }

        console.log("Loading Face Landmark Model...");

        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(
            MODEL_URL
        );


        if (status) {
            status.textContent =
                "Loading face recognition model...";
        }

        console.log("Loading Face Recognition Model...");

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
        alert("Email input nahi mila.");
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
        // IN/OUT hidden until face verified

        getElement("attendanceTypeCard").style.display =
            "none";


        // =================================================
        // RESET FACE STATE
        // =================================================

        faceVerified = false;

        selectedAttendanceType = null;

        capturedFaceImage = null;

        currentEmbedding = null;


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


        setStatus(
            "Login successful. Start camera and scan face."
        );


        setFaceStatus(
            modelsLoaded
                ? "Face scan not completed."
                : "Face model loading..."
        );


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


        setFaceStatus(
            "✓ Camera ready. Face ko camera ke center mein rakho.",
            "processing"
        );


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
// SCAN FACE
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

        scanButton.disabled =
            true;

        scanButton.textContent =
            "Scanning...";


        setFaceStatus(
            "Face detect aur embedding generate ho rahi hai...",
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
        // DETECT FACE + LANDMARK + DESCRIPTOR
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

            currentEmbedding =
                null;

            throw new Error(
                "Invalid face embedding.\n\n" +
                "128 values expected."
            );
        }


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
        // BACKEND FACE VERIFICATION
        // =================================================

        setFaceStatus(
            "Face embedding generated. Registered face check ho raha hai...",
            "processing"
        );


        setStatus(
            "Checking registered face..."
        );


        const result =
            await callBackend({

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

            });


        console.log(
            "FACE VERIFY RESPONSE:",
            result
        );


        // =================================================
        // FACE REJECTED
        // =================================================

        if (
            !result ||
            !result.success
        ) {

            faceVerified =
                false;

            currentEmbedding =
                null;


            setFaceStatus(
                result?.message ||
                "Face verification failed.",
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
                "Face verification failed."
            );


            return;
        }


        // =================================================
        // NEW FACE REGISTERED
        // =================================================

        if (
            result.isNewFace === true
        ) {

            faceVerified =
                true;


            setFaceStatus(
                "✓ New face registered successfully.",
                "success"
            );


            console.log(
                "NEW FACE REGISTRATION CONFIRMED"
            );
        }


        // =================================================
        // EXISTING FACE VERIFIED
        // =================================================

        else {

            faceVerified =
                true;


            setFaceStatus(
                "✓ Face verified successfully.",
                "success"
            );


            console.log(
                "EXISTING FACE MATCH CONFIRMED"
            );
        }


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


        currentEmbedding =
            null;


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
        "================================================"
    );
}
