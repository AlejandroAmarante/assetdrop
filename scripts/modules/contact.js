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
    // Custom callback if provided
    if (this.onSubmitCallback) {
      this.onSubmitCallback(event);
      return;
    }

    // Default behavior
    this.showSuccessMessage();
    this.resetForm(event.target);
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
};
