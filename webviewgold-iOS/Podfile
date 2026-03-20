# Uncomment the next line to define a global platform for your project
 platform :ios, '12.0'

target 'OneSignalNotificationServiceExtension' do
  # Comment the next line if you're not using Swift and don't want to use dynamic frameworks
  use_frameworks!

  # Pods for OneSignalNotificationServiceExtension
  pod 'OneSignalXCFramework', '3.12.9'
end



target 'WebViewGold' do
  # Comment the next line if you're not using Swift and don't want to use dynamic frameworks
  use_frameworks!

  # Pods for WebViewGold
  pod 'OneSignalXCFramework', '3.12.9'
  pod 'Google-Mobile-Ads-SDK'
  pod 'Firebase/Core'
  pod 'Firebase/Messaging' 
  pod 'SwiftQRScanner'
  pod 'SwiftyStoreKit'
  pod 'FBAudienceNetwork'
  pod 'SwiftyGif'
  pod 'PushwooshXCFramework'
  pod 'GoogleUserMessagingPlatform'
end

post_install do |installer|

  installer.aggregate_targets.each do |target|
      target.xcconfigs.each do |variant, xcconfig|
          xcconfig_path = target.client_root + target.xcconfig_relative_path(variant)
          IO.write(xcconfig_path, IO.read(xcconfig_path).gsub("DT_TOOLCHAIN_DIR", "TOOLCHAIN_DIR"))
      end
  end

  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      if config.base_configuration_reference.is_a? Xcodeproj::Project::Object::PBXFileReference
          xcconfig_path = config.base_configuration_reference.real_path
          IO.write(xcconfig_path, IO.read(xcconfig_path).gsub("DT_TOOLCHAIN_DIR", "TOOLCHAIN_DIR"))
      end

      # Set the IPHONEOS_DEPLOYMENT_TARGET to 12.0
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '12.0'
    end
  end
end

