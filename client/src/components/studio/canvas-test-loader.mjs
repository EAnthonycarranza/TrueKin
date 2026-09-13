// The production engine imports browser Fabric. Its Node entry point provides
// the same objects backed by jsdom and a native canvas for integration tests.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'fabric') return nextResolve('fabric/node', context);
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw error;
  }
}
