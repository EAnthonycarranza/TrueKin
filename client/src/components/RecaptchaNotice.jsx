import { useEffect } from 'react';
import { preloadRecaptcha } from '../utils/recaptcha';

export default function RecaptchaNotice() {
  useEffect(() => {
    preloadRecaptcha().catch(() => {});
  }, []);

  return (
    <p className="recaptcha-notice">
      Protected by Google reCAPTCHA. Google’s{' '}
      <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>
      {' '}and{' '}
      <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">Terms of Service</a>
      {' '}apply.
    </p>
  );
}
