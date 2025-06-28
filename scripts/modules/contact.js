// modules/contact.js - Handles contact form functionality
export class ContactModule {
  constructor() {
    this.form = null;
    this.onSubmitCallback = null;
  }

  init() {
    this.form = document.querySelector(
      '#contactForm, .contact-form, form[name="contact"]'
    );
    this.bindEvents();
  }

  bindEvents() {
    if (this.form) {
      this.form.addEventListener("submit", (e) => this.handleSubmit(e));
    }
    // If there's a global contact form handler, bind to that instead
    if (window.handleContactForm) {
      window.handleContactForm = (e) => this.handleSubmit(e);
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.target);

    // Validate hCaptcha first
    if (!this.validateCaptcha()) {
      return;
    }

    const errors = this.validateForm(formData);
    if (errors.length > 0) {
      alert("Please fix the following errors:\n" + errors.join("\n"));
      return;
    }

    // Submit to Web3Forms
    fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          this.showSuccessMessage();
          this.resetForm(event.target);
        } else {
          throw new Error(data.message || "Submission failed");
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        alert("Failed to send message. Please try again.");
        // Reset captcha on error so user can try again
        this.resetCaptcha();
      });
  }

  // Validate hCaptcha completion
  validateCaptcha() {
    // Check if hcaptcha is available
    if (typeof hcaptcha === "undefined") {
      console.warn("hCaptcha not loaded");
      return true; // Allow submission if hCaptcha isn't loaded (fallback)
    }

    try {
      const captchaResponse = hcaptcha.getResponse();
      if (!captchaResponse || captchaResponse.length === 0) {
        alert("Please complete the captcha verification before submitting.");
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error checking captcha:", error);
      // If there's an error with captcha, allow submission (graceful degradation)
      return true;
    }
  }

  // Reset hCaptcha widget
  resetCaptcha() {
    if (typeof hcaptcha !== "undefined") {
      try {
        hcaptcha.reset();
      } catch (error) {
        console.error("Error resetting captcha:", error);
      }
    }
  }

  showSuccessMessage(
    message = "Thank you for your message! We'll get back to you within 24-48 hours."
  ) {
    alert(message);
  }

  resetForm(form) {
    if (form && form.reset) {
      form.reset();
    }
    // Also reset the captcha when form is reset
    this.resetCaptcha();
  }

  // Allow custom submit handler
  setSubmitCallback(callback) {
    this.onSubmitCallback = callback;
  }

  // Validate form fields
  validateForm(formData) {
    const errors = [];

    if (!formData.get("name")?.trim()) {
      errors.push("Name is required");
    }

    if (!formData.get("email")?.trim()) {
      errors.push("Email is required");
    } else if (!this.isValidEmail(formData.get("email"))) {
      errors.push("Please enter a valid email address");
    }

    if (!formData.get("subject")?.trim()) {
      errors.push("Subject is required");
    }

    if (!formData.get("message")?.trim()) {
      errors.push("Message is required");
    }

    return errors;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Get form data as object
  getFormData() {
    if (!this.form) return {};
    const formData = new FormData(this.form);
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value;
    }
    return data;
  }

  // Set form data
  setFormData(data) {
    if (!this.form) return;
    Object.keys(data).forEach((key) => {
      const field = this.form.querySelector(`[name="${key}"]`);
      if (field) {
        field.value = data[key];
      }
    });
  }
}

// Global function for backward compatibility
window.handleContactForm = function (event) {
  alert(
    "Thank you for your message! We'll get back to you within 24-48 hours."
  );
  event.target.reset();

  // Reset captcha if available
  if (typeof hcaptcha !== "undefined") {
    try {
      hcaptcha.reset();
    } catch (error) {
      console.error("Error resetting captcha:", error);
    }
  }
};
