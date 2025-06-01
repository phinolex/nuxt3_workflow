module.exports = {
    apps: [
      {
        name: 'Autolld',
        exec_mode: 'cluster',
        instances: 'max',
        script: './.output/server/index.mjs',
      port: 3005
      }
    ]
  }