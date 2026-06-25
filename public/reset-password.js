const form = document.getElementById("resetForm");
const button = document.getElementById("submitButton");
const message = document.getElementById("message");

const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");

const strengthFill = document.getElementById("strengthFill");
const strengthText = document.getElementById("strengthText");

const params = new URLSearchParams(window.location.search);

const token = params.get("token");
const type = params.get("type");

const resetEndpoint =
  type === "admin"
    ? "/api/admin/auth/reset-password"
    : "/api/users/auth/reset-password";

/* ===========================
   Message
=========================== */

const showMessage = (text, type) => {
  message.textContent = text;
  message.className = `message ${type}`;
};

/* ===========================
   Token Check
=========================== */

if (!token) {
  form.style.display = "none";
  showMessage("Invalid or expired reset link.", "error");
}

/* ===========================
   Show / Hide Password
=========================== */

document.querySelectorAll(".toggle-password").forEach((toggle) => {
  toggle.addEventListener("click", () => {
    const input = document.getElementById(toggle.dataset.target);

    const icon = toggle.querySelector("i");

    if (input.type === "password") {
      input.type = "text";

      icon.classList.remove("fa-eye");
      icon.classList.add("fa-eye-slash");
    } else {
      input.type = "password";

      icon.classList.remove("fa-eye-slash");
      icon.classList.add("fa-eye");
    }
  });
});

/* ===========================
   Password Strength
=========================== */

passwordInput.addEventListener("input", () => {
  const password = passwordInput.value;

  let score = 0;

  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  let width = "0%";
  let color = "#ddd";
  let text = "Password Strength";

  switch (score) {
    case 1:
      width = "20%";
      color = "#ff4d4f";
      text = "Very Weak";
      break;

    case 2:
      width = "40%";
      color = "#ff7a00";
      text = "Weak";
      break;

    case 3:
      width = "60%";
      color = "#f5b400";
      text = "Medium";
      break;

    case 4:
      width = "80%";
      color = "#36b37e";
      text = "Strong";
      break;

    case 5:
      width = "100%";
      color = "#00875a";
      text = "Very Strong";
      break;
  }

  strengthFill.style.width = width;
  strengthFill.style.background = color;

  strengthText.textContent = text;
});

/* ===========================
   Submit
=========================== */

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  message.className = "message";

  const password = passwordInput.value.trim();

  const confirmPassword = confirmPasswordInput.value.trim();

  if (password.length < 6) {
    showMessage(
      "Password must contain at least 6 characters.",
      "error"
    );

    return;
  }

  if (password !== confirmPassword) {
    showMessage(
      "Password and Confirm Password do not match.",
      "error"
    );

    return;
  }

  button.disabled = true;

  button.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

  try {
    const response = await fetch(resetEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        password,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to change password."
      );
    }

    form.reset();

    strengthFill.style.width = "0%";
    strengthText.innerHTML = "Password Strength";

    form.style.display = "none";

    showMessage(
      "✅ Password changed successfully. You can now login.",
      "success"
    );

    setTimeout(() => {
      window.location.href = "/";
    }, 3000);
  } catch (error) {
    showMessage(error.message, "error");
  } finally {
    button.disabled = false;

    button.innerHTML = "Change Password";
  }
});

/* ===========================
   Live Match Validation
=========================== */

confirmPasswordInput.addEventListener("keyup", () => {
  if (!confirmPasswordInput.value) return;

  if (passwordInput.value === confirmPasswordInput.value) {
    confirmPasswordInput.style.borderColor = "#28a745";
  } else {
    confirmPasswordInput.style.borderColor = "#dc3545";
  }
});

passwordInput.addEventListener("keyup", () => {
  if (!confirmPasswordInput.value) return;

  if (passwordInput.value === confirmPasswordInput.value) {
    confirmPasswordInput.style.borderColor = "#28a745";
  } else {
    confirmPasswordInput.style.borderColor = "#dc3545";
  }
});