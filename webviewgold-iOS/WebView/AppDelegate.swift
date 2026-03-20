//  OnlineAppCreator.com
//  WebViewGold for iOS // webviewgold.com

/* PLEASE CHECK CONFIG.SWIFT FOR CONFIGURATION */
/* PLEASE CHECK CONFIG.SWIFT FOR CONFIGURATION */
/* PLEASE CHECK CONFIG.SWIFT FOR CONFIGURATION */

import UIKit
import UserNotifications
import OneSignal
import CoreLocation
import GoogleMobileAds
import Firebase
import FirebaseMessaging
import SwiftyStoreKit
import AVFoundation
import FBAudienceNetwork
import AppTrackingTransparency
import Pushwoosh
import EventKit


class LocationManager: NSObject, CLLocationManagerDelegate {
    static let shared = LocationManager()
    let locationManager = CLLocationManager()

    override init() {
        super.init()
        if Constants.backgroundlocation{
        locationManager.delegate = self
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.requestAlwaysAuthorization()
        }
    }

    func locationManager(_ manager: CLLocationManager, didChangeAuthorization status: CLAuthorizationStatus) {
        if status == .authorizedAlways || status == .authorizedWhenInUse {
            manager.startUpdatingLocation()
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        // Send location to WebView via notification
        NotificationCenter.default.post(name: NSNotification.Name("LocationUpdate"), object: location)
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, PWMessagingDelegate {
    
    var isActive = false
    var orientationLock = UIInterfaceOrientationMask.all
    func application(_ application: UIApplication, supportedInterfaceOrientationsFor window: UIWindow?) -> UIInterfaceOrientationMask {
        let idiom = UIDevice.current.userInterfaceIdiom
        let orientation = idiom == .pad ? orientationipad : orientationiphone
        
        switch orientation {
        case "portrait":
            orientationLock = .portrait
        case "landscape":
            orientationLock = .landscape
        default:
            orientationLock = .all
        }
        return self.orientationLock
    }

    struct AppUtility {
        static func lockOrientation(_ orientation: UIInterfaceOrientationMask) {
            if let delegate = UIApplication.shared.delegate as? AppDelegate {
                delegate.orientationLock = orientation
            }
        }

        /// Applies rotation without `UIDevice.setValue(_:forKey: "orientation")` (unsupported on modern iOS).
        static func lockOrientation(_ orientation: UIInterfaceOrientationMask, andRotateTo rotateOrientation: UIInterfaceOrientation) {
            lockOrientation(orientation)
            applyInterfaceOrientation(rotateOrientation)
        }

        private static func orientationMask(from orientation: UIInterfaceOrientation) -> UIInterfaceOrientationMask {
            switch orientation {
            case .portrait: return .portrait
            case .portraitUpsideDown: return .portraitUpsideDown
            case .landscapeLeft: return .landscapeLeft
            case .landscapeRight: return .landscapeRight
            default: return .portrait
            }
        }

        private static func applyInterfaceOrientation(_ orientation: UIInterfaceOrientation) {
            if #available(iOS 16.0, *) {
                let mask = orientationMask(from: orientation)
                let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
                for scene in scenes {
                    scene.requestGeometryUpdate(UIWindowScene.GeometryPreferences.iOS(interfaceOrientations: mask)) { _ in }
                }
                for scene in scenes {
                    for window in scene.windows where window.isKeyWindow {
                        window.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
                    }
                }
                if scenes.flatMap({ $0.windows }).filter({ $0.isKeyWindow }).isEmpty {
                    scenes.flatMap { $0.windows }.first?.rootViewController?.setNeedsUpdateOfSupportedInterfaceOrientations()
                }
            } else {
                UIDevice.current.setValue(orientation.rawValue, forKey: "orientation")
            }
        }
    }
    
    var window: UIWindow?
    
    func application(_ application: UIApplication, willFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {

        return true
    }

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        if Constants.backgroundlocation{
            LocationManager.shared // Initialize location manager
        }
        
        NotificationCenter.default.addObserver(self, selector: #selector(appWillEnterForeground), name: UIApplication.willEnterForegroundNotification, object: nil)
        
        UIApplication.shared.applicationIconBadgeNumber = 0
        
        if (Constants.useFacebookAds){
            FBAudienceNetworkAds.initialize(with: nil, completionHandler: nil)
        }
        //handle Universal Link
           if let url = launchOptions?[.url] as? URL {
               handleUniversalLink(url)
           }
        
        
        //handle terminate notification
        if let option = launchOptions {
            let info = option[UIApplication.LaunchOptionsKey.remoteNotification]
            if (info != nil) {
                if let dict = info as? NSDictionary {
                    if let x = dict.value(forKey: "custom") as? NSDictionary {
                        if let y = x.value(forKey: "a") as? NSDictionary{
                            if y.value(forKey: "url") as? String ?? "" != "" {
                                let noti_url = y.value(forKey: "url") as? String ?? ""
                                UserDefaults.standard.set(noti_url, forKey: "Noti_Url")
                                UserDefaults.standard.set(true, forKey: "isFromPush")
                            }
                        }
                        else{
                            UserDefaults.standard.set(nil, forKey: "Noti_Url")
                            UserDefaults.standard.set(false, forKey: "isFromPush")
                        }
                    }
                }
            }
        }
        
        if (Constants.kFirebasePushEnabled && askforpushpermissionatfirstrun)
        {
            registerForPushNotifications(application: application)
            FirebaseApp.configure()
            UIApplication.shared.registerForRemoteNotifications()
            
            NotificationCenter.default.addObserver(self, selector: #selector(self.tokenRefreshNotification), name: NSNotification.Name.MessagingRegistrationTokenRefreshed, object: nil)

            connectToFcm()

            Messaging.messaging().token { token, error in
              if let error = error {
                print("Error fetching FCM registration token: \(error)")
                UserDefaults.standard.set("", forKey: "FirebaseID")
              } else if let token = token {
                print("FCM registration token: \(token)")
                UserDefaults.standard.set(token, forKey: "FirebaseID")
                self.connectToFcm()
              }
            }
        }
       
       
        SwiftyStoreKit.completeTransactions(atomically: true) { purchases in
            for purchase in purchases {
                switch purchase.transaction.transactionState {
                case .purchased, .restored:
                    if purchase.needsFinishTransaction {
                        SwiftyStoreKit.finishTransaction(purchase.transaction)
                    }
                case .failed, .purchasing, .deferred:
                    break 
                @unknown default:
                    break 
                }
            }
        }
        
        if (Constants.kPushEnabled) {
            OneSignal.initWithLaunchOptions(launchOptions)
            OneSignal.setAppId(Constants.oneSignalID)
            OneSignal.setLaunchURLsInApp(false)
        }
        
        let notifWillShowInForegroundHandler: OSNotificationWillShowInForegroundBlock = { notification, completion in
            print("Received Notification: ", notification.notificationId ?? "no id")
            print("launchURL: ", notification.launchURL ?? "no launch url")
            print("content_available = \(notification.contentAvailable)")
            if notification.notificationId == "example_silent_notif" {
                completion(nil)
            } else {
                completion(notification)
            }
        }
        
        let notificationOpenedBlock: OSNotificationOpenedBlock = { result in
            // This block gets called when the user reacts to a notification received
            let notification: OSNotification = result.notification
            print("Message: ", notification.body ?? "empty body")
            print("badge number: ", notification.badge)
            print("notification sound: ", notification.sound ?? "No sound")
            if let additionalData = notification.additionalData {
                         print("additionalData: ", additionalData)
                         if let url = additionalData["url"] as? String {
                             UserDefaults.standard.set(url, forKey: "Noti_Url")
                                       UserDefaults.standard.set(true, forKey: "isFromPush")
                                       NotificationCenter.default.post(name: NSNotification.Name(rawValue: "OpenWithNotificationURL"), object: nil, userInfo: nil)
                         }
                         if let actionSelected = notification.actionButtons {
                             print("actionSelected: ", actionSelected)
                         }
            }
                    
            if let additionalData = notification.additionalData {
                print("additionalData: ", additionalData)
                if let actionSelected = notification.actionButtons {
                    print("actionSelected: ", actionSelected)
                }
//                if let actionID = result.action.actionId {
//                    //handle the action
//                }
            }
        }
        
        if (Constants.kPushEnabled) {
            OneSignal.setNotificationOpenedHandler(notificationOpenedBlock)
            OneSignal.setNotificationWillShowInForegroundHandler(notifWillShowInForegroundHandler)
            //        OneSignal.setAppSettings(onesignalInitSettings)
        
        
        if let deviceState = OneSignal.getDeviceState() {
            let userId = deviceState.userId
            print(userId ?? "userId = n/a")
            let pushToken = deviceState.pushToken
            print(pushToken ?? "pushToken = n/a")
            let subscribed = deviceState.isSubscribed
            print(subscribed)
         }
        }
        

        
        if(Constants.kPushwooshEnable) {
            Pushwoosh.sharedInstance().delegate = self;
            Pushwoosh.sharedInstance().registerForPushNotifications()
        }
        
//        let notificationOpenedBlock: OSHandleNotificationActionBlock = { result in
//            let payload: OSNotificationPayload = result!.notification.payload
//
//            var fullMessage = payload.body
//
//
//            if payload.additionalData != nil {
//                if payload.title != nil {
//                    let messageTitle = payload.title
//                    print("Message Title = \(messageTitle!)")
//                }
//                
//                let additionalData = payload.additionalData
//                if additionalData?["actionSelected"] != nil {
//                    fullMessage = fullMessage! + "\nPressed ButtonID: \(String(describing: additionalData!["actionSelected"]))"
//                }
//            }
//        }
//        if Constants.kPushEnabled
//        {
//            let onesignalInitSettings = [kOSSettingsKeyAutoPrompt: false,
//                                         kOSSettingsKeyInAppLaunchURL: true]
//
//
//            OneSignal.initWithLaunchOptions(launchOptions,appId: Constants.oneSignalID,handleNotificationAction: {(result) in let payload = result?.notification.payload
//                if let additionalData = payload?.additionalData {
//
//                    var noti_url = ""
//                    if additionalData["url"] != nil {
//                    noti_url = additionalData["url"] as! String
//                    }
//                    UserDefaults.standard.set(noti_url, forKey: "Noti_Url")
//                    NotificationCenter.default.post(name: NSNotification.Name(rawValue: "OpenWithNotificationURL"), object: nil, userInfo: nil)
//
//                }},settings: onesignalInitSettings)
//
//            OneSignal.inFocusDisplayType = OSNotificationDisplayType.notification;
//
//        }
//        if (Constants.showBannerAd || Constants.showFullScreenAd) {
//            GADMobileAds.sharedInstance().start(completionHandler: nil)
//        }
        if UserDefaults.standard.value(forKey: "IsPurchase") == nil
        {
            UserDefaults.standard.setValue("NO", forKey: "IsPurchase")
        }
        
        if askforpushpermissionatfirstrun {
            registerForPushNotifications(application: application)
        }
        
        
        if Constants.kPushEnabled
        {
            if askforpushpermissionatfirstrun {
                
                OneSignal.promptForPushNotifications(userResponse: { accepted in
                    print("User accepted notifications: \(accepted)")
                })
                if application.responds(to: #selector(getter: application.isRegisteredForRemoteNotifications))
                {
                    if #available(iOS 10.0, *)
                    {
                        UNUserNotificationCenter.current().requestAuthorization(options: [.sound, .alert, .badge]) {(accepted, error) in
                            if !accepted {
                                print("Notification access denied")
                            }
                        }
                    }
                    else
                    {
                        application.registerUserNotificationSettings(UIUserNotificationSettings(types: ([.sound, .alert, .badge]), categories: nil))
                        application.registerForRemoteNotifications()
                    }
                }
                else
                {
                    let center = UNUserNotificationCenter.current()
                            center.requestAuthorization(options:[.badge, .alert, .sound]) { (granted, error) in
                                // Enable or disable features based on authorization.
                            }
                            application.registerForRemoteNotifications()
                }
            }
            
            return true
        }
        
        //requestCalendarPermissions() //ask during runtime, see WebViewController.swift
        return true
    }
    
    func requestCalendarPermissions() {
        let eventStore = EKEventStore()

        eventStore.requestAccess(to: .event) { (granted, error) in
            if let error = error {
                print("Error requesting calendar access: \(error.localizedDescription)")
                return
            }

            if granted {
                print("Calendar access granted.")
            } else {
                print("Calendar access denied.")
            }
        }
    }

    func deactivatedarkmode() {
        if #available(iOS 13.0, *) {
            window?.overrideUserInterfaceStyle = .light
        }
    }
    
    func application(_ application: UIApplication,
                     continue userActivity: NSUserActivity,
                     restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let webpageURL = userActivity.webpageURL else {
            return false
        }
        print("Coming back from background: Universal Link triggered")
        if Constants.backgroundlocation{
            if let location = LocationManager.shared.locationManager.location {
                print("Location updated");
            }
        }
        handleUniversalLink(webpageURL)
        return true
    }

    
    
    private func handleUniversalLink(_ url: URL) { //Universal Links API
        if ShowExternalLink{
        if let urlToOpen = url.absoluteString.removingPercentEncoding {
            webviewurl = urlToOpen
                
            UserDefaults.standard.set(webviewurl, forKey: "DeepLinkUrl-applinkstype")
            NotificationCenter.default.post(name: NSNotification.Name(rawValue: "OpenWithExternalLink"), object: nil, userInfo: nil)
        }
        }
    }
    
    
    func application(_ application: UIApplication,
                     open url: URL,
                     options: [UIApplication.OpenURLOptionsKey : Any] = [:] ) -> Bool {
        
        let deepLink = url.absoluteString
        
        // Check if the URL contains "?link=" (required for Deep Linking API)
        guard deepLink.contains("?link=") else {
            
            if let deepLink = userActivity?.webpageURL {
                handleUniversalLink(deepLink) //Go for Universal Links API as Fallback instead of Deep Linking API
              
            }
            
            return false
        }

        // Collect the deep link URL after "scheme://url?link="
        if let index = deepLink.firstIndex(of: "=") {
            let sliceIndex = deepLink.index(after: index)
            let deepLinkURL: String = String(deepLink[sliceIndex...])
            
            // Collect the deep link URL host
            var deepLinkURLHost = deepLinkURL.replacingOccurrences(of: "www.", with: "")
            deepLinkURLHost = deepLinkURLHost.replacingOccurrences(of: "https://", with: "")
            deepLinkURLHost = deepLinkURLHost.replacingOccurrences(of: "http://", with: "")
            
            host = deepLinkURLHost
            webviewurl = deepLinkURL

            if ShowExternalLink{
                UserDefaults.standard.set(deepLinkURL, forKey: "DeepLinkUrl")
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "OpenWithExternalLink"), object: nil, userInfo: nil)
            }
            return true
        } else {
            print("URL missing")
            return false
        }
    }
    
    func applicationWillResignActive(_ application: UIApplication) {
    }
    
    func applicationDidEnterBackground(_ application: UIApplication) {


    if Constants.backgroundlocation{
            if let location = LocationManager.shared.locationManager.location {
                print("Location updated");
            }
    }
    do {
    if #available(iOS 11.0, *) {
    try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, policy: .longForm, options: [.mixWithOthers, .allowAirPlay])
    } else {
    }
    try AVAudioSession.sharedInstance().setActive(true)
    } catch {
    print(error)
    }

    }
    
    func applicationWillEnterForeground(_ application: UIApplication) {
    }
    
    func applicationDidBecomeActive(_ application: UIApplication) {
        if #available(iOS 14, *) {
                ATTrackingManager.requestTrackingAuthorization(completionHandler: { status in
                    switch status {
                    case .authorized:
                        // Tracking authorization dialog was shown
                        // and we are authorized
                        print("Authorized")
                    case .denied:
                        // Tracking authorization dialog was
                        // shown and permission is denied
                        print("Denied")
                        if (!Constants.ATTDeniedShowAds) {
                            Constants.useFacebookAds = false;
                            showBannerAd = false;
                            showFullScreenAd = false;
                        }
                    case .notDetermined:
                        // Tracking authorization dialog has not been shown
                        print("Not Determined")
                        if (!Constants.ATTDeniedShowAds) {
                            Constants.useFacebookAds = false;
                            showBannerAd = false;
                            showFullScreenAd = false;
                        }
                    case .restricted:
                        print("Restricted")
                        if (!Constants.ATTDeniedShowAds) {
                            Constants.useFacebookAds = false;
                            showBannerAd = false;
                            showFullScreenAd = false;
                        }
                    @unknown default:
                        print("Unknown")
                    }
                })
            }
    }
    
    func applicationWillTerminate(_ application: UIApplication) {
        
        if (deletecacheonexit){
            NotificationCenter.default.post(name: NSNotification.Name("ApplicationWillTerminate"), object: nil)
        }}
    func pushwoosh(_ pushwoosh: Pushwoosh, onMessageOpened message: PWMessage) {
        
    }
    func pushwoosh(_ pushwoosh: Pushwoosh, onMessageReceived message: PWMessage) {
    
    }
}

extension AppDelegate: MessagingDelegate, UNUserNotificationCenterDelegate {
    func registerForPushNotifications(application: UIApplication)
    {
        if #available(iOS 11.0, *)
        {
            // For iOS 10 display notification (sent via APNS)
            UNUserNotificationCenter.current().delegate = self
            
            let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
            UNUserNotificationCenter.current().requestAuthorization(
                options: authOptions,
                completionHandler: {_, _ in })
            
            if (Constants.kFirebasePushEnabled)
            {
                // For iOS 10 data message (sent via FCM)
                Messaging.messaging().delegate = self
                print("Notification: registration for iOS >= 11 using UNUserNotificationCenter")
            }
        }
        else
        {
            let settings: UIUserNotificationSettings =
                UIUserNotificationSettings(types: [.alert, .badge, .sound], categories: nil)
            application.registerUserNotificationSettings(settings)
            print("Notification: registration for iOS < 10 using Basic Notification Center")
        }
        
        application.registerForRemoteNotifications()
    }
    
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        if let token = fcmToken {
            UserDefaults.standard.set(token, forKey: "FirebaseID")
            NotificationCenter.default.post(name: Notification.Name("FCMTokenReceived"), object: nil, userInfo: ["token": token])
        }
        print("Firebase registration token: \(fcmToken ?? "n/a")")
        
        // TODO: If necessary send token to application server.
        // Note: This callback is fired at each app startup and whenever a new token is generated.
    }
    
    @objc func tokenRefreshNotification(_ notification: Notification)
    {
        connectToFcm()
    }
    
    func connectToFcm() {
        if (Constants.kFirebasePushEnabled)
        {
            Messaging.messaging().token { token, error in
                if let error = error {
                    UserDefaults.standard.set("", forKey: "FirebaseID")
                    print("Error fetching remote instance ID: \(error)")
                    print("FCM: Token does not exist.")
                } else if let token = token {
                    print("Remote instance ID token: \(token)")
                    UserDefaults.standard.set(token, forKey: "FirebaseID")
                }
            }
        }
    }

    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        if (Constants.kPushwooshEnable) {
            Pushwoosh.sharedInstance().handlePushRegistrationFailure(error)
        }
        print("Notification: Unable to register for remote notifications: \(error.localizedDescription)")
    }
    
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data)
    {
        print("Registered for Remote Notifications with Device Token")
        if (Constants.kFirebasePushEnabled)
        {
            Messaging.messaging().apnsToken = deviceToken as Data
            
            if (Constants.firebaseTopic != "") {
                Messaging.messaging().subscribe(toTopic: Constants.firebaseTopic) { error in
                    if error != nil {
                        print("Failed to subscribe to topic: \(error!.localizedDescription)")
                    } else {
                        print("Subscribed to Firebase topic: " + Constants.firebaseTopic)
                    }
                }
            }
        }
        

        if (Constants.kPushwooshEnable) {
            Pushwoosh.sharedInstance().handlePushRegistration(deviceToken)
        }
    }
    
    func application(application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: NSData) {
        
    }
    
    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                     fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void)
    {
        if (Constants.kPushwooshEnable) {
            Pushwoosh.sharedInstance().handlePushReceived(userInfo)
        }
        
        if let x = userInfo["custom"] as? [AnyHashable: Any] {
            if let y = x["a"] as? [String:String] {
                guard y["url"] != nil else {return}
                let noti_url = y["url"]!
                UserDefaults.standard.set(noti_url, forKey: "Noti_Url")
                UserDefaults.standard.set(true, forKey: "isFromPush")
            }
            else{
                UserDefaults.standard.set(nil, forKey: "Noti_Url")
                UserDefaults.standard.set(false, forKey: "isFromPush")
            }
        }
        else if let urlNotification = userInfo["url"] as? String {
            UserDefaults.standard.set(urlNotification, forKey: "Noti_Url")
            UserDefaults.standard.set(true, forKey: "isFromPush")
        }
        
        let state : UIApplication.State = application.applicationState
        switch state
        {
        case .active:
            print("Application is in Active Mode!")
            if userInfo["custom"] is [AnyHashable: Any] {
                if(self.isActive){
                    DispatchQueue.main.asyncAfter(deadline: .now()+1, execute: {
                        self.isActive = false
                        NotificationCenter.default.post(name: NSNotification.Name(rawValue: "OpenWithNotificationURL"), object: nil, userInfo: nil)
                    })
                }
                else{
                    self.isActive = true
                }
            }
            completionHandler(UIBackgroundFetchResult.newData)
        case .inactive:
            if let x = userInfo["custom"] as? [AnyHashable: Any] {
                if let y = x["a"] as? [String:String] {
                    guard y["url"] != nil else {return}
                    let noti_url = y["url"]!
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: {
                        UserDefaults.standard.set(noti_url, forKey: "Noti_Url")
                        NotificationCenter.default.post(name: NSNotification.Name(rawValue: "OpenWithNotificationURL"), object: nil, userInfo: nil)
                    })
                }
                else{
                    UserDefaults.standard.set(nil, forKey: "Noti_Url")
                }
            }
            else if let urlNotification = userInfo["url"] as? String {
                UserDefaults.standard.set(urlNotification, forKey: "Noti_Url")
                UserDefaults.standard.set(true, forKey: "isFromPush")
                NotificationCenter.default.post(name: NSNotification.Name(rawValue: "OpenWithNotificationURL"), object: nil, userInfo: nil)
            }
            completionHandler(UIBackgroundFetchResult.newData)
        case .background:
            print("Application is in Backgound mode!")
            completionHandler(UIBackgroundFetchResult.newData)
        @unknown default:
            completionHandler(UIBackgroundFetchResult.newData)
            break
        }
        

    }
    
    //MARK:- Handling local notification when application is in foreground state
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.alert,.badge,.sound])
    }
    
    //Method to handle the application tap when it is in foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        
        let userInfo = response.notification.request.content.userInfo
        if let x = userInfo["custom"] as? [AnyHashable: Any] {
            if let y = x["a"] as? [String:String] {
                guard y["url"] != nil else {return}
                let noti_url = y["url"]!
                DispatchQueue.main.asyncAfter(deadline: .now() + 1, execute: {
                    UserDefaults.standard.set(noti_url, forKey: "Noti_Url")
                    NotificationCenter.default.post(name: NSNotification.Name(rawValue: "OpenWithNotificationURL"), object: nil, userInfo: nil)
                })
            }
            else{
                UserDefaults.standard.set(nil, forKey: "Noti_Url")
            }
        }
        else if let urlNotification = userInfo["url"] as? String {
            UserDefaults.standard.set(urlNotification, forKey: "Noti_Url")
            UserDefaults.standard.set(true, forKey: "isFromPush")
            NotificationCenter.default.post(name: NSNotification.Name(rawValue: "OpenWithNotificationURL"), object: nil, userInfo: nil)
        }
    }
    
    @objc func appWillEnterForeground() {
           // Handle reauthentication here
        if(requireBioMetricAuthForSoftStart) {
            let mainViewController = window?.rootViewController as? SplashscreenVC
            mainViewController?.authenticateUser()
        }
        if Constants.backgroundlocation{
            if let location = LocationManager.shared.locationManager.location {
                print("Location updated");
            }
        }
       }
    
}

