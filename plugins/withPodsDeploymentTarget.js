const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Newer Xcode on EAS treats a pod target below its supported iOS range as a
// hard error. Some pods (Sentry's and RevenueCat's resource bundles) still
// declare iOS 11/13, so raise any such target to React Native's own minimum.
const MARKER = '# together: raise pod deployment targets';
const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current && current.to_f < min_ios_version_supported.to_f
          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = min_ios_version_supported
        end
      end
    end
`;

module.exports = function withPodsDeploymentTarget(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfile = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes(MARKER)) {
        contents = contents.replace(/post_install do \|installer\|\n/, (m) => m + SNIPPET);
        fs.writeFileSync(podfile, contents);
      }
      return config;
    },
  ]);
};
