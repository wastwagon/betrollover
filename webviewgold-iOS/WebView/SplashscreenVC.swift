//  OnlineAppCreator.com
//  WebViewGold for iOS // webviewgold.com

/* PLEASE CHECK CONFIG.SWIFT FOR CONFIGURATION */
/* PLEASE CHECK CONFIG.SWIFT FOR CONFIGURATION */
/* PLEASE CHECK CONFIG.SWIFT FOR CONFIGURATION */

import UIKit
import SwiftyGif
import LocalAuthentication

class SplashscreenVC: UIViewController {

    @IBOutlet weak var imageview: UIImageView!
    var gameTimer: Timer?
    @IBOutlet var mainbackview: UIView!
    
    @IBOutlet weak var loadingSign: UIActivityIndicatorView!
    
    @IBOutlet weak var splashWidthRatio: NSLayoutConstraint!
    
    @IBOutlet weak var autheticateBtn: UIButton!

    /// Dark status bar icons on white splash
    override var preferredStatusBarStyle: UIStatusBarStyle {
        if #available(iOS 13.0, *) {
            return .darkContent
        }
        return .default
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        if (splashScreenEnabled) {
            loadingSign.isHidden = true
            self.view.backgroundColor = Constants.splashscreencolor
            if scaleSplashImage == 100 { //Full-Screen Mode for Splash Part 1
                splashWidthRatio.isActive = false
                imageview.translatesAutoresizingMaskIntoConstraints = false
                
                // Pin the imageview to the entire screen
                NSLayoutConstraint.activate([
                    imageview.topAnchor.constraint(equalTo: self.view.topAnchor),
                    imageview.bottomAnchor.constraint(equalTo: self.view.bottomAnchor),
                    imageview.leadingAnchor.constraint(equalTo: self.view.leadingAnchor),
                    imageview.trailingAnchor.constraint(equalTo: self.view.trailingAnchor),
                ])
                
                // Set the image view content mode
                imageview.contentMode = .scaleAspectFill
            }
            // BetRollover: static brand splash from Assets (replaces default WebViewGold splash.gif)
            if let brand = UIImage(named: "SplashBrand") {
                imageview.image = brand
            } else if let gif = try? UIImage(gifName: "splash", levelOfIntegrity: 1) {
                let gifManager = SwiftyGifManager(memoryLimit: 100)
                imageview.setGifImage(gif, manager: gifManager, loopCount: 1)
                imageview.delegate = self
            }
        } else {
            loadingSign.isHidden = true //Start only in next screen if activated
        }
        
        if !splashScreenEnabled {
            gameTimer = Timer.scheduledTimer(timeInterval: 1, target: self, selector: #selector(fireTimer), userInfo: nil, repeats: false)
        }
        
        if scaleSplashImage != 100 { // Non-Fullscreen Mode for Splash
            let screenWidth = UIScreen.main.bounds.width
            let screenHeight = UIScreen.main.bounds.height
            splashWidthRatio.constant = screenWidth <= screenHeight ? screenWidth * (CGFloat(scaleSplashImage) / 100.0) : screenHeight * (CGFloat(scaleSplashImage) / 100.0)
        }
    }
    
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // moved from delegate as `fireTimer()` was being called before the VC was fully in the window hierachy
        if enableBioMetricAuth {
            autheticateBtn.isHidden = false
            authenticateUser()
        }else {
            autheticateBtn.isHidden = true
            fireTimer()
        }
    }
    
    override func viewDidDisappear(_ animated: Bool) {
        
    }
    
    @objc func fireTimer() {
        print("Timer fired!")
        
        if #available(iOS 13.0, *) {
            let ncv = self.storyboard?.instantiateViewController(identifier: "homenavigation") as! UINavigationController
            self.present(ncv, animated: false, completion: nil)
        } else {
            // Fallback on earlier versions
            let vc = self.storyboard?.instantiateViewController(withIdentifier: "homenavigation") as! UINavigationController
            self.present(vc, animated: false, completion: nil)
        }
        
    }

    func authenticateUser() {
        let context = LAContext()
        let reason = "Authenticate user."
        context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: reason) { success, authenticationError in
            DispatchQueue.main.async {
                if success {
                    self.onAuthSuccess()
                } else {
                    if let error = authenticationError {
                        
                        switch error {
                        case LAError.systemCancel:
                            print("System canceled the authentication")
                        default:
                            self.onAuthFail(error: error)
                        }
                    }
                }
            }
        }
    }

    func onAuthSuccess() {
        fireTimer()
    }

    func onAuthFail(error: Error?) {
        
        let appName = Bundle.main.infoDictionary?["CFBundleName"] as? String ?? "WebViewGold"
        
        guard let topViewController = UIApplication.topViewController() else { return }
        let alert = UIAlertController(title: appName, message: error?.localizedDescription ?? "\(appName) requires biometric authorization.", preferredStyle: .alert)
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .default) { _ in
            exit(0)
        })
        
        alert.addAction(UIAlertAction(title: "Authorize", style: .default) { _ in
            self.authenticateUser()
            alert.dismiss(animated: false)
        })
        
        topViewController.present(alert, animated: true)
    }
    
    @IBAction func authBtn(_ sender: UIButton) {
        authenticateUser()
    }

}
extension SplashscreenVC : SwiftyGifDelegate {

    func gifURLDidFinish(sender: UIImageView) {
        print("gifURLDidFinish")
    }

    func gifURLDidFail(sender: UIImageView) {
        print("gifURLDidFail")
    }

    func gifDidStart(sender: UIImageView) {
        print("gifDidStart")
    }
    
    func gifDidLoop(sender: UIImageView) {
        print("gifDidLoop")
    }
    
    func gifDidStop(sender: UIImageView) {
        print("gifDidStop")
    }
}
