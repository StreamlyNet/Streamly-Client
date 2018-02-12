const path = require('path');

module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    'electron-installer-debian': {
      options: {
        productName: 'OpenBazaar',
        name: 'openbazaar2',
        arch: 'amd64',
        version: '2.0.0',
        bin: 'openbazaar2',
        maintainer: 'OpenBazaar <project@openbazaar.org>',
        rename(dest) {
          return `${dest}<%= name %>_<%= version %>_<%= arch %>.deb`;
        },
        productDescription: 'Decentralized Peer to Peer Marketplace for Bitcoin',
        lintianOverrides: [
          'changelog-file-missing-in-native-package',
          'executable-not-elf-or-script',
          'extra-license-file',
        ],
        icon: 'imgs/icon.png',
        categories: ['Utility'],
        priority: 'optional',
      },
      'app-with-asar': {
        src: 'temp-linux64/openbazaar-linux-x64/',
        dest: 'build-linux64/',
        rename(dest) {
          return path.join(dest, '<%= name %>_<%= arch %>.deb');
        },
      },
    },
    'create-windows-installer': {
      x32: {
        // IconURL option should be incuded, so a proper image for the installer is displayed in Programs and Features
        appDirectory: grunt.option('appdir'),
        outputDirectory: grunt.option('outdir'),
        name: grunt.option('appname'),
        productName: grunt.option('appname'),
        authors: 'Streamly',
        owners: 'Streamly',
        exe: `${grunt.option('appname')}.exe`,
        description: `${grunt.option('appname')}`,
        version: grunt.option('obversion') || '',
        title: 'Streamly',
        setupIcon: 'imgs/streamlyLogo.ico',
        skipUpdateIcon: true,
        loadingGif: 'imgs/windows-loading.gif',
        noMsi: true,
      },
    },
  });
  grunt.loadNpmTasks('grunt-electron-installer-debian');
  grunt.loadNpmTasks('grunt-electron-installer');
  // Default task(s).
  grunt.registerTask('default', ['electron-installer-debian']);
};
