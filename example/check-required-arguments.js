const checkRequiredArguments = (argv) => {
  const requiredSpacesArguments = [argv.key, argv.secret, argv.endpoint, argv.bucket]

  if (argv.disk !== 'local' && argv.disk !== 'spaces') {
    throw Error('Please provide --disk argument of either local or spaces')
  }

  if (argv.disk === 'spaces' && !requiredSpacesArguments.every(a => a)) {
    console.error('When using spaces disk you must provide key, secret, endpoint and bucket command line arguments. See README for usage instructions.')
    throw Error('Missing Digital Ocean Spaces Configuration')
  }
}

module.exports = checkRequiredArguments
