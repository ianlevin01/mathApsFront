import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <button className="legal-back-btn" onClick={() => navigate(-1)}>
          ← Volver
        </button>

        <h1 className="legal-title">Privacy Policy</h1>
        <p className="legal-updated">Last updated: February 16, 2026</p>

        <div className="legal-content">
          <p className="legal-intro">
            Mathaps ("we", "our", "us") respects your privacy. This Privacy Policy 
            explains how we collect, use, and protect your information.
          </p>

          <section className="legal-section">
            <h2>1. Information We Collect</h2>
            <p>We may collect:</p>
            <ul>
              <li>Name and email address</li>
              <li>Account login information</li>
              <li>Usage data (how you interact with the platform)</li>
              <li>Payment information (processed by our payment provider)</li>
            </ul>
            <p>We do not directly store full credit card details.</p>
          </section>

          <section className="legal-section">
            <h2>2. How We Use Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Provide and improve the service</li>
              <li>Process subscriptions</li>
              <li>Track subject progress</li>
              <li>Communicate important updates</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>3. Payment Processing</h2>
            <p>
              Payments are processed securely through third-party providers. 
              We do not store complete payment details.
            </p>
          </section>

          <section className="legal-section">
            <h2>4. Data Storage and Security</h2>
            <p>
              We implement reasonable technical measures to protect your data. 
              However, no online service can guarantee absolute security.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. Cookies</h2>
            <p>
              We may use cookies or similar technologies to improve user experience 
              and analyze usage.
            </p>
          </section>

          <section className="legal-section">
            <h2>6. Third-Party Services</h2>
            <p>
              We may use third-party services for hosting, analytics, and payment processing.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Children's Privacy</h2>
            <p>
              The service is not intended for children under 13 without parental consent.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Your Rights</h2>
            <p>
              You may request access, correction, or deletion of your personal data by contacting us.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Contact</h2>
            <p>
              For privacy-related inquiries, contact:{" "}
              <a href="mailto:privacy@mathaps.com" className="legal-link">
                privacy@mathaps.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
