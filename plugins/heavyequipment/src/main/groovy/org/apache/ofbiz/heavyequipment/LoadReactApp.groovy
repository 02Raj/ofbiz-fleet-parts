package org.apache.ofbiz.heavyequipment

import groovy.json.JsonSlurper
import java.nio.file.Path

String contextUrlPath = context.application.context.context.path
String contextFilesystemPath  = context.contextRoot

String reactAppDirectory = 'vite-react-app'
String reactAppUrlPath = "${contextUrlPath}/${reactAppDirectory}/"

Path assetManifestPath = Path.of(contextFilesystemPath, reactAppDirectory, '.vite', 'manifest.json')
if (!assetManifestPath.toFile().exists()) {
    assetManifestPath = Path.of(contextFilesystemPath, reactAppDirectory, 'manifest.json')
}

Object assetManifest = new JsonSlurper().parse(assetManifestPath.toFile())
def cssList = assetManifest.'index.html'.css
if (cssList) {
    context.reactAppStylesheetUrlPath = reactAppUrlPath + cssList[0]
}
context.reactAppJavascriptUrlPath = reactAppUrlPath + assetManifest.'index.html'.file
