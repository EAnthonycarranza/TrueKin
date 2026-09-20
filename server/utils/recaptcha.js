const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const DEFAULT_MIN_SCORE = 0.5;

const RECAPTCHA_ACTIONS = Object.freeze({
  quote: 'quote_submit',
  checkout: 'checkout_submit',
});

function requestError(message, status) {
  return Object.assign(new Error(message), { status });
}

function minimumScore() {
  const configured = Number(process.env.RECAPTCHA_MIN_SCORE);
  return Number.isFinite(configured) && configured >= 0 && configured <= 1
    ? configured
    : DEFAULT_MIN_SCORE;
}

async function verifyRecaptcha({ token, expectedAction, fetchImpl = fetch }) {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret) {
    throw requestError('Human verification is temporarily unavailable. Please try again later.', 503);
  }
  if (!Object.values(RECAPTCHA_ACTIONS).includes(expectedAction)) {
    throw new Error('Unknown reCAPTCHA action');
  }
  if (typeof token !== 'string' || !token.trim() || token.length > 4096) {
    throw requestError('Please complete the human verification and try again.', 400);
  }

  const form = new URLSearchParams({
    secret,
    response: token.trim(),
  });
  let response;
  let result;
  try {
    response = await fetchImpl(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Google returned ${response.status}`);
    result = await response.json();
  } catch (error) {
    console.error('reCAPTCHA verification service error:', error.message);
    throw requestError('Human verification could not be reached. Please try again.', 503);
  }

  const score = Number(result.score);
  const accepted = result.success === true
    && result.action === expectedAction
    && Number.isFinite(score)
    && score >= minimumScore();

  if (!accepted) {
    console.warn('reCAPTCHA rejected a request', {
      expectedAction,
      returnedAction: result.action,
      score: Number.isFinite(score) ? score : null,
      hostname: result.hostname,
      errorCodes: result['error-codes'] || [],
    });
    throw requestError('We could not verify this request. Please refresh and try again.', 403);
  }

  return result;
}

module.exports = { RECAPTCHA_ACTIONS, verifyRecaptcha };
