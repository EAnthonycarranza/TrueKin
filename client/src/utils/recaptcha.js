export const RECAPTCHA_ACTIONS = Object.freeze({
  quote: 'quote_submit',
  checkout: 'checkout_submit',
});

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY?.trim();
let scriptPromise;

function loadRecaptcha() {
  if (!SITE_KEY) {
    return Promise.reject(new Error('Human verification is not configured. Please try again later.'));
  }
  if (window.grecaptcha?.enterprise) return Promise.resolve(window.grecaptcha.enterprise);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-truekin-recaptcha]');
    const script = existing || document.createElement('script');

    const handleLoad = () => resolve(window.grecaptcha?.enterprise);
    const handleError = () => {
      scriptPromise = undefined;
      reject(new Error('Human verification could not load. Please refresh and try again.'));
    };

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    if (!existing) {
      script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(SITE_KEY)}`;
      script.async = true;
      script.defer = true;
      script.dataset.truekinRecaptcha = 'true';
      document.head.appendChild(script);
    }
  });

  return scriptPromise;
}

export async function preloadRecaptcha() {
  await loadRecaptcha();
}

export async function executeRecaptcha(action) {
  if (!Object.values(RECAPTCHA_ACTIONS).includes(action)) {
    throw new Error('Unknown human-verification action.');
  }

  const recaptcha = await loadRecaptcha();
  if (!recaptcha) throw new Error('Human verification could not load. Please refresh and try again.');
  await new Promise((resolve) => recaptcha.ready(resolve));
  const token = await recaptcha.execute(SITE_KEY, { action });
  if (!token) throw new Error('Human verification did not finish. Please try again.');
  return token;
}
