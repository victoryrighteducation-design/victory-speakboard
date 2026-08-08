// public/js/auth.js

const els = {
  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  showRegister: document.getElementById("show-register"),
  showLogin: document.getElementById("show-login"),
  loginError: document.getElementById("login-error"),
  registerError: document.getElementById("register-error"),
  pendingNotice: document.getElementById("pending-notice"),
};

function showError(el, message) {
  el.textContent = message;
  el.classList.remove("hidden");
}
function clearError(el) {
  el.textContent = "";
  el.classList.add("hidden");
}

if (els.showRegister) {
  els.showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    els.loginForm.classList.add("hidden");
    els.registerForm.classList.remove("hidden");
  });
}
if (els.showLogin) {
  els.showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    els.registerForm.classList.add("hidden");
    els.loginForm.classList.remove("hidden");
  });
}

if (els.registerForm) {
  els.registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(els.registerError);

    const name = document.getElementById("reg-name").value.trim();
    const email = document.getElementById("reg-email").value.trim();
    const password = document.getElementById("reg-password").value;
    const targetExam = document.getElementById("reg-exam").value;

    if (!name || !email || password.length < 6) {
      showError(els.registerError, "Please fill all fields. Password must be at least 6 characters.");
      return;
    }

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await db.ref("students/" + cred.user.uid).set({
        name,
        email,
        targetExam,
        role: "student",
        status: "pending",
        createdAt: Date.now(),
      });
      await auth.signOut();
      els.registerForm.classList.add("hidden");
      els.pendingNotice.classList.remove("hidden");
    } catch (err) {
      showError(els.registerError, friendlyAuthError(err));
    }
  });
}

if (els.loginForm) {
  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError(els.loginError);

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;

    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const uid = cred.user.uid;

      const snap = await db.ref("students/" + uid).once("value");
      const profile = snap.val();

      if (!profile) {
        showError(els.loginError, "No profile found for this account. Contact your instructor.");
        await auth.signOut();
        return;
      }

      if (profile.role === "staff") {
        window.location.href = "staff.html";
        return;
      }

      if (profile.status === "pending") {
        showError(els.loginError, "Your account is awaiting staff approval. Please check back soon.");
        await auth.signOut();
        return;
      }

      window.location.href = "student.html";
    } catch (err) {
      showError(els.loginError, friendlyAuthError(err));
    }
  });
}

const forgotLink = document.getElementById("forgot-password");
if (forgotLink) {
  forgotLink.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim();
    if (!email) {
      showError(els.loginError, "Enter your email above first, then click 'Forgot password'.");
      return;
    }
    try {
      await auth.sendPasswordResetEmail(email);
      showError(els.loginError, "Password reset email sent — check your inbox.");
    } catch (err) {
      showError(els.loginError, friendlyAuthError(err));
    }
  });
}

function friendlyAuthError(err) {
  const map = {
    "auth/email-already-in-use": "An account with this email already exists. Try logging in instead.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/network-request-failed": "Network error — check your internet connection.",
  };
  return map[err.code] || err.message || "Something went wrong. Please try again.";
}
