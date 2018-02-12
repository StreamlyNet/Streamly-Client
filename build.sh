#!/bin/sh

## Version 2.0.0
##
## Usage
## ./build.sh
##
## OS supported:
## win32 win64 linux32 linux64 linuxarm osx
##


ELECTRONVER=1.7.8
NODEJSVER=5.1.1

OS="${1}"

# Get Version
PACKAGE_VERSION=$(cat package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')
echo "Streamly Version: $PACKAGE_VERSION"

# Create temp/build dirs
mkdir dist/
rm -rf dist/*
mkdir temp/
rm -rf temp/*
mkdir prod/
rm -rf prod/*

echo 'Preparing to build installers...'

echo 'Installing npm packages...'
npm i -g npm@5.2
npm install electron-packager -g --silent
npm install npm-run-all -g --silent
npm install grunt-cli -g --silent
npm install grunt --save-dev --silent
npm install grunt-electron-installer --save-dev --silent
npm install --silent
npm install copyfiles -g
npm install babel-cli -g

echo 'Building Streamly app...'
npm run build

echo 'Copying transpiled files into js folder...'
cp -rf prod/* js/

echo 'copy-js-subfolders...'
copyfiles -u 1 'js/languages/**/*' 'js/templates/**/*' prod

echo 'Retrieving Latest Server Binaries...'
cd temp/
curl -s https://api.github.com/repos/OpenBazaar/openbazaar-go/releases/latest > release.txt
#cat release.txt | ../jq-win64.exe -r ".assets[].browser_download_url" | xargs -n 1 curl -L -O
curl -L -O https://github.com/OpenBazaar/openbazaar-go/releases/download/v0.10.1/libwinpthread-1.win32.dll
curl -L -O https://github.com/OpenBazaar/openbazaar-go/releases/download/v0.10.1/libwinpthread-1.win64.dll
cp ../../openbazaar-server/dist/streamlyd.exe .
curl -L -O https://github.com/OpenBazaar/openbazaar-go/releases/download/v0.10.1/sha512_checksums.asc
cd ..

# WINDOWS 64
echo 'Building Windows 64-bit Installer...'
mkdir dist/win64

echo 'Running Electron Packager...'
electron-packager . Streamly --asar --out=dist --protocol-name=OpenBazaar --win32metadata.ProductName="Streamly" --win32metadata.CompanyName="Streamly" --win32metadata.FileDescription='Decentralized p2p video streaming' --win32metadata.OriginalFilename=Streamly.exe --protocol=ob --platform=win32 --arch=x64 --icon=imgs/streamlyLogo.ico --electron-version=${ELECTRONVER} --overwrite

echo 'Copying server binary into application folder...'
cp -rf temp/streamlyd.exe dist/Streamly-win32-x64/resources/
cp -rf temp/libwinpthread-1.win64.dll dist/Streamly-win32-x64/resources/libwinpthread-1.dll
mkdir dist/Streamly-win32-x64/resources/streamly-go
mv dist/Streamly-win32-x64/resources/streamlyd.exe dist/Streamly-win32-x64/resources/streamly-go/streamlyd.exe
mv dist/Streamly-win32-x64/resources/libwinpthread-1.dll dist/Streamly-win32-x64/resources/streamly-go/libwinpthread-1.dll

echo 'Building Installer...'
grunt create-windows-installer --appname=Streamly --obversion=$PACKAGE_VERSION --appdir=dist/Streamly-win32-x64 --outdir=dist/win64
mv dist/win64/StreamlySetup.exe dist/win64/Streamly-$PACKAGE_VERSION-Setup-64.exe
mv dist/win64/RELEASES dist/win64/RELEASES-x64

echo 'Sign the installer'
#signcode -t http://timestamp.digicert.com -a sha1 -spc .travis/ob1.cert.spc -pvk .travis/ob1.pvk -n "OpenBazaar $PACKAGE_VERSION" dist/win64/OpenBazaar2-$PACKAGE_VERSION-Setup-64.exe
#signcode -t http://timestamp.digicert.com -a sha1 -spc .travis/ob1.cert.spc -pvk .travis/ob1.pvk -n "OpenBazaarClient $PACKAGE_VERSION" dist/win64/OpenBazaar2Client-$PACKAGE_VERSION-Setup-64.exe
