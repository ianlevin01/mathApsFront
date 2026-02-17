import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
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

        <h1 className="legal-title">Terms of Service</h1>
        <p className="legal-updated">Last updated: February 16, 2026</p>

        <div className="legal-content">
          <p className="legal-intro">
            Welcome to Mathaps ("we", "our", "us"). By accessing or using our website, 
            you agree to be bound by these Terms of Service.
          </p>

          <section className="legal-section">
            <h2>1. Description of Service</h2>
            <p>
              Mathaps is a web-based AI-powered educational platform designed for mathematics students. 
              The platform provides step-by-step explanations, visual graphs, subject organization tools, 
              personalized exams, flashcards, and progress tracking features.
            </p>
            <p>
              The service is delivered digitally and offered through a monthly recurring subscription.
            </p>
          </section>

          <section className="legal-section">
            <h2>2. Eligibility</h2>
            <p>
              You must be at least 13 years old to use this service. If you are under 18, 
              you must have permission from a parent or legal guardian.
            </p>
          </section>

          <section className="legal-section">
            <h2>3. Subscriptions and Payments</h2>
            <p>
              Access to premium features requires a paid monthly subscription. 
              Payments are processed securely through our payment provider.
            </p>
            <ul>
              <li>Subscriptions renew automatically on a monthly basis unless canceled before the renewal date.</li>
              <li>You may cancel your subscription at any time.</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>4. Refund Policy</h2>
            <p>
              Due to the digital nature of the service, refunds are generally not provided. 
              However, we may review refund requests on a case-by-case basis.
            </p>
          </section>

          <section className="legal-section">
            <h2>5. User Conduct</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the service for unlawful purposes</li>
              <li>Attempt to reverse engineer or copy the platform</li>
              <li>Abuse, exploit, or interfere with the system</li>
            </ul>
          </section>

          <section className="legal-section">
            <h2>6. Intellectual Property</h2>
            <p>
              All content, software, branding, and platform functionality are owned by Mathaps 
              and may not be copied, distributed, or reproduced without permission.
            </p>
          </section>

          <section className="legal-section">
            <h2>7. Disclaimer</h2>
            <p>
              The platform provides educational assistance. We do not guarantee academic results or grades.
            </p>
          </section>

          <section className="legal-section">
            <h2>8. Limitation of Liability</h2>
            <p>
              We are not liable for indirect, incidental, or consequential damages 
              resulting from the use of the service.
            </p>
          </section>

          <section className="legal-section">
            <h2>9. Changes to Terms</h2>
            <p>
              We may update these Terms at any time. Continued use of the platform 
              constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section className="legal-section">
            <h2>10. Contact</h2>
            <p>
              If you have questions about these Terms, contact us at:{" "}
              <a href="mailto:support@mathaps.com" className="legal-link">
                support@mathaps.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
