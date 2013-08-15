#!/bin/bash

set -e
set -x

OPENLAYER_VERSION="2.13.1"
JQUERY_VERSION="1.10.2"

pushd hilbert_browser
wget http://www.openlayers.org/download/OpenLayers-${OPENLAYER_VERSION}.tar.gz -O temp_OpenLayers.tar.gz
tar xzf temp_OpenLayers.tar.gz

rm -rf openlayers/*
cp OpenLayers-${OPENLAYER_VERSION}/OpenLayers.js openlayers/.
cp -rf OpenLayers-${OPENLAYER_VERSION}/theme openlayers/.
cp -rf OpenLayers-${OPENLAYER_VERSION}/img openlayers/.

rm -rf OpenLayers-${OPENLAYER_VERSION}
rm temp_OpenLayers.tar.gz

wget http://code.jquery.com/jquery-${JQUERY_VERSION}.min.js -O jquery.min.js

popd
