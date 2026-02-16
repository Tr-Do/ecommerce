function onTurnstileSuccess(token) {
    console.log("Turnstile success:", token);
    document.getElementById("submit-btn").disabled = false;
    document.getElementById("paypal-redirect").disabled = false;
    document.getElementById("crypto").disabled = false;
}
function onTurnstileError(errorCode) {
    console.error("Turnstile error:", errorCode);
    document.getElementById("submit-btn").disabled = true;
    document.getElementById("paypal-redirect").disabled = true;
    document.getElementById("crypto").disabled = true;
}
function onTurnstileExpired() {
    console.warn("Turnstile token expired");
    document.getElementById("submit-btn").disabled = true;
    document.getElementById("paypal-redirect").disabled = true;
    document.getElementById("crypto").disabled = true;
}